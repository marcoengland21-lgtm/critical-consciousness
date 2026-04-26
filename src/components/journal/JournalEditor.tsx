'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import TiptapEditor, { type DocumentStats } from './tiptap/TiptapEditor'
import ReferenceModal from './tiptap/ReferenceModal'
import GlossaryModal from './tiptap/GlossaryModal'
import { uploadJournalImage } from './tiptap/uploadImage'
import { type Editor } from '@tiptap/react'

interface JournalEditorProps {
  initialId: string | null
  initialTitle: string
  /** Tiptap JSON document; pass `{ type: 'doc', content: [] }` for blank. */
  initialBodyJson: object
  userId: string
  /** Show the optional title input. False for the dashboard quick-capture. */
  showTitle?: boolean
  /** Compact toolbar (bold/italic/link only). True for dashboard quick-capture.
      In compact mode the Reference + Glossary modals are NOT available
      (per chunk 2.5 §6). */
  compactToolbar?: boolean
  bodyPlaceholder?: string
  /** Min visible height of the writing surface in px. */
  minHeight?: number
  onCreatedRedirect?: (newId: string) => void
}

const AUTOSAVE_DEBOUNCE_MS = 500
const SAVED_TIME_REFRESH_MS = 30_000

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'retrying'

// ── localStorage backup ─────────────────────────────────────────────────────

interface DraftBackup {
  title: string
  bodyJson: object
  bodyText: string
  savedAt: number
}

function backupKey(entryId: string | null, userId: string): string {
  return `ccp-journal-draft:${entryId ?? 'new'}:${userId}`
}

function readBackup(key: string): DraftBackup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as DraftBackup) : null
  } catch { return null }
}

function writeBackup(key: string, draft: DraftBackup): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, JSON.stringify(draft)) } catch { /* noop */ }
}

function clearBackup(key: string): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key) } catch { /* noop */ }
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * JournalEditor — wraps the Tiptap editor with autosave, status indicator,
 * word count, optional title field, Reference + Glossary modals, image upload
 * to private_note_images storage, and localStorage backup.
 *
 * Per chunk 2.5: replaces the chunk 2 textarea-with-toolbar implementation
 * with a proper Tiptap-based editor lifted from the test-news writer-studio.
 */
export default function JournalEditor({
  initialId,
  initialTitle,
  initialBodyJson,
  userId,
  showTitle = true,
  compactToolbar = false,
  bodyPlaceholder = 'Start writing…',
  minHeight = 300,
  onCreatedRedirect,
}: JournalEditorProps) {
  const router = useRouter()
  const [entryId, setEntryId] = useState<string | null>(initialId)

  // Restore from localStorage if present (handles 'I wrote, lost connection,
  // came back' — content survives the network failure).
  const initialBackup = typeof window !== 'undefined' ? readBackup(backupKey(initialId, userId)) : null
  const [title, setTitle] = useState(initialBackup?.title ?? initialTitle)
  const [bodyJson, setBodyJson] = useState<object>(initialBackup?.bodyJson ?? initialBodyJson)
  const [bodyText, setBodyText] = useState(initialBackup?.bodyText ?? '')
  const [restoredFromBackup] = useState(
    !!initialBackup && JSON.stringify(initialBackup.bodyJson) !== JSON.stringify(initialBodyJson)
  )

  const [stats, setStats] = useState<DocumentStats>({ wordCount: 0, characterCount: 0, readingTimeMinutes: 0 })
  const [status, setStatus] = useState<SaveStatus>(initialId ? 'saved' : 'idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(initialId ? new Date() : null)
  const [, setRelTimeTick] = useState(0)

  // Track last-saved content so we don't re-save no-op changes.
  const lastSavedRef = useRef<{ title: string; bodyJson: string; bodyText: string }>({
    title: initialTitle,
    bodyJson: JSON.stringify(initialBodyJson),
    bodyText: '',
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<Editor | null>(null)

  // Reference + Glossary modal state
  const [refOpen, setRefOpen] = useState(false)
  const [glossOpen, setGlossOpen] = useState(false)

  // ── Save ────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    const trimmedTitle = title.trim()
    const jsonStr = JSON.stringify(bodyJson)
    if (
      lastSavedRef.current.title === title &&
      lastSavedRef.current.bodyJson === jsonStr
    ) return
    if (!entryId && !trimmedTitle && !bodyText.trim()) return

    setStatus('saving')
    const supabase = createClient()
    const wordCount = stats.wordCount
    const payload = {
      title: trimmedTitle || null,
      body_json: bodyJson,
      body_text: bodyText,
      word_count: wordCount,
    }

    if (entryId) {
      const { error } = await supabase.from('private_notes').update(payload).eq('id', entryId)
      if (error) {
        console.error('[CCP] Journal save failed (update):', error)
        setStatus('error')
        return
      }
    } else {
      const { data, error } = await supabase
        .from('private_notes')
        .insert({ ...payload, user_id: userId })
        .select('id')
        .single()
      if (error || !data) {
        console.error('[CCP] Journal save failed (insert):', error)
        setStatus('error')
        return
      }
      setEntryId(data.id)
      onCreatedRedirect?.(data.id)
    }

    lastSavedRef.current = { title, bodyJson: jsonStr, bodyText }
    setLastSavedAt(new Date())
    setStatus('saved')
    clearBackup(backupKey(entryId, userId))
    router.refresh()
  }, [title, bodyJson, bodyText, entryId, userId, stats.wordCount, onCreatedRedirect, router])

  // ── Autosave triggers ────────────────────────────────────────────────────
  // (1) Debounced after typing stops.
  useEffect(() => {
    // localStorage backup immediately (no debounce) so we never lose work
    // to a network failure mid-typing.
    if (typeof window !== 'undefined' && (bodyText || title)) {
      writeBackup(backupKey(entryId, userId), {
        title,
        bodyJson,
        bodyText,
        savedAt: Date.now(),
      })
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { save() }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, bodyJson, bodyText])

  // (2) On window blur — flush.
  useEffect(() => {
    const onBlur = () => { save() }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [save])

  // (3) On page unload / unmount — flush.
  useEffect(() => {
    const onBeforeUnload = () => { save() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [save])

  // (4) Save on unmount (navigating away inside Next.js) — best-effort.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Periodic re-render so 'Saved Xs ago' updates without user action.
  useEffect(() => {
    const t = setInterval(() => setRelTimeTick((n) => n + 1), SAVED_TIME_REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  // ── Image upload bound to current user + entry ──────────────────────────
  const handleUpload = useCallback(
    (file: File) => uploadJournalImage({ file, userId, noteId: entryId }),
    [userId, entryId]
  )

  // ── Editor ready handler — wires Cmd+K shortcut for link via Tiptap ─────
  const handleEditorReady = useCallback((ed: Editor) => {
    editorRef.current = ed
  }, [])

  return (
    <div className="space-y-3">
      {/* Restored-from-backup notice */}
      {restoredFromBackup && (
        <div
          className="text-xs px-3 py-2 rounded-md"
          style={{
            backgroundColor: 'rgba(var(--accent-amber-rgb), 0.08)',
            color: 'var(--accent-amber)',
            border: '1px solid rgba(var(--accent-amber-rgb), 0.2)',
          }}
        >
          Restored from your last unsaved draft. Keep typing to overwrite.
        </div>
      )}

      {/* Optional title — full-page editor only */}
      {showTitle && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled (optional)"
          className="w-full bg-transparent border-0 outline-none px-0 py-1"
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '1.75rem',
            lineHeight: 1.2,
          }}
        />
      )}

      {/* Tiptap editor */}
      <TiptapEditor
        initialContent={bodyJson}
        placeholder={bodyPlaceholder}
        compact={compactToolbar}
        minHeight={minHeight}
        onContentChange={({ json, text }) => {
          setBodyJson(json)
          setBodyText(text)
        }}
        onStatsChange={setStats}
        onEditorReady={handleEditorReady}
        uploadImage={compactToolbar ? undefined : handleUpload}
        onOpenReference={compactToolbar ? undefined : () => setRefOpen(true)}
        onOpenGlossary={compactToolbar ? undefined : () => setGlossOpen(true)}
      />

      {/* Reference + Glossary modals — full editor only */}
      {!compactToolbar && editorRef.current && (
        <>
          <ReferenceModal
            editor={editorRef.current}
            isOpen={refOpen}
            onClose={() => setRefOpen(false)}
          />
          <GlossaryModal
            editor={editorRef.current}
            isOpen={glossOpen}
            onClose={() => setGlossOpen(false)}
          />
        </>
      )}

      {/* Status row */}
      <div
        className="flex items-center justify-between text-eyebrow pt-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span>
          {status === 'saving' && 'Saving…'}
          {status === 'retrying' && 'Save failed — retrying…'}
          {(status === 'saved' || status === 'idle') && lastSavedAt && `Saved ${formatSavedAt(lastSavedAt)}`}
          {(status === 'idle' && !lastSavedAt) && 'Not saved yet'}
          {status === 'error' && (
            <span style={{ color: 'var(--accent-red)' }}>Couldn&apos;t save — your draft is preserved locally</span>
          )}
        </span>
        <span>
          {stats.wordCount} {stats.wordCount === 1 ? 'word' : 'words'}
          {stats.wordCount > 50 && (
            <>
              {' · '}
              ~{stats.readingTimeMinutes} min read
            </>
          )}
        </span>
      </div>
    </div>
  )
}

function formatSavedAt(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  return date.toLocaleString('en-NZ', { hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' })
}
