'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import TiptapEditor, { type DocumentStats } from './tiptap/TiptapEditor'
import JournalToolbar, { type SaveStatus } from './tiptap/JournalToolbar'
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
  /** Show the title input. Currently aliases `!compactToolbar` — kept for
      explicit-call-site readability and to match the original API. */
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

/** Autosave delay matches test-news (5s after typing stops). */
const AUTOSAVE_DELAY_MS = 5000

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
 * JournalEditor — wraps the Tiptap editor with the JournalToolbar (which owns
 * inline title editing + save status), autosave, word count, Reference +
 * Glossary modals, image upload to private_note_images storage, and
 * localStorage backup defence-in-depth.
 *
 * Per chunk 2.6: faithful lift of test-news pattern. Toolbar is rendered at
 * this level (not inside TiptapEditor) so it can show title and save status —
 * matches WriterStudioLayout rendering CompactToolbar next to WriterEditor.
 *
 * Save status follows test-news 4-state model (saved | saving | unsaved |
 * error). Content change → 'unsaved' → 5s timer → handleSave → 'saving' →
 * 'saved' or 'error'.
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

  // 4-state save status matching test-news WriterStudio.
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialId ? 'saved' : 'saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(initialId ? new Date() : null)

  // Track last-saved content so we don't re-save no-op changes.
  const lastSavedRef = useRef<{ title: string; bodyJson: string }>({
    title: initialTitle,
    bodyJson: JSON.stringify(initialBodyJson),
  })

  // Editor handle from TiptapEditor — the toolbar uses this directly.
  const [editor, setEditor] = useState<Editor | null>(null)

  // Reference + Glossary modal state
  const [refOpen, setRefOpen] = useState(false)
  const [glossOpen, setGlossOpen] = useState(false)

  // Hidden file-input for image upload (toolbar triggers this).
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Save ────────────────────────────────────────────────────────────────
  // useCallback with no `title`/`bodyJson` dependencies — uses closures over
  // the latest state refs/values via state set inside. Trade-off matches
  // test-news handleSave: simple to reason about, autosave timer reads
  // current state at fire time.
  const save = useCallback(async () => {
    const trimmedTitle = title.trim()
    const jsonStr = JSON.stringify(bodyJson)

    // No-op save guard — same content as last save? Skip.
    if (
      lastSavedRef.current.title === title &&
      lastSavedRef.current.bodyJson === jsonStr
    ) {
      setSaveStatus('saved')
      return
    }
    // First-time empty entry — don't create a row for blank input.
    if (!entryId && !trimmedTitle && !bodyText.trim()) {
      setSaveStatus('saved')
      return
    }

    setSaveStatus('saving')
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
        setSaveStatus('error')
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
        setSaveStatus('error')
        return
      }
      setEntryId(data.id)
      onCreatedRedirect?.(data.id)
    }

    lastSavedRef.current = { title, bodyJson: jsonStr }
    setLastSaved(new Date())
    setSaveStatus('saved')
    clearBackup(backupKey(entryId, userId))
    router.refresh()
  }, [title, bodyJson, bodyText, entryId, userId, stats.wordCount, onCreatedRedirect, router])

  // ── Autosave ────────────────────────────────────────────────────────────
  // Test-news pattern: setSaveStatus('unsaved') happens on every content
  // change → effect watching saveStatus === 'unsaved' fires a 5s timer →
  // timer calls save() which does its own status updates.

  // (1) Mark unsaved + write localStorage backup whenever the user edits.
  useEffect(() => {
    // Skip the initial mount — only mark unsaved on actual changes.
    const jsonStr = JSON.stringify(bodyJson)
    if (
      lastSavedRef.current.title === title &&
      lastSavedRef.current.bodyJson === jsonStr
    ) return

    setSaveStatus('unsaved')

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
  }, [title, bodyJson, bodyText, entryId, userId])

  // (2) When status flips to 'unsaved', schedule a save 5s later. Watching
  // bodyJson / title in deps means each keystroke clears the previous timer
  // and starts a new 5s window — i.e. 'autosave 5s after typing stops'
  // (test-news WriterStudio pattern).
  useEffect(() => {
    if (saveStatus !== 'unsaved') return
    const t = setTimeout(() => { save() }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [saveStatus, bodyJson, title, save])

  // (3) On window blur — flush.
  useEffect(() => {
    const onBlur = () => { if (saveStatus === 'unsaved') save() }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [save, saveStatus])

  // (4) On page unload / unmount — flush (best-effort).
  useEffect(() => {
    const onBeforeUnload = () => { if (saveStatus === 'unsaved') save() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [save, saveStatus])

  // (5) Save on unmount (navigating away inside Next.js) — best-effort.
  useEffect(() => {
    return () => { save() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // (6) Cmd/Ctrl + S — manual save (matches test-news shortcut).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  // ── Image upload ────────────────────────────────────────────────────────
  const handlePickImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    try {
      const url = await uploadJournalImage({ file, userId, noteId: entryId })
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      console.error('[CCP] Image upload failed:', err)
      alert('Image upload failed: ' + (err instanceof Error ? err.message : 'unknown'))
    } finally {
      // Reset so the same file can be picked twice in a row.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [editor, userId, entryId])

  // ── Editor ready ────────────────────────────────────────────────────────
  const handleEditorReady = useCallback((ed: Editor) => {
    setEditor(ed)
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

      {/* Toolbar — title + formatting + save status, all in one row.
          Compact mode (dashboard) hides the title and most formatting;
          showTitle=false on the wrapper-prop side maps to compactToolbar=true
          so the title is suppressed there too. */}
      <JournalToolbar
        editor={editor}
        title={title}
        onTitleChange={setTitle}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
        compact={compactToolbar || !showTitle}
        onPickImage={compactToolbar ? undefined : handlePickImage}
        onOpenReference={compactToolbar ? undefined : () => setRefOpen(true)}
        onOpenGlossary={compactToolbar ? undefined : () => setGlossOpen(true)}
      />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      {/* Tiptap editor — toolbar-less, just the writing surface. */}
      <TiptapEditor
        initialContent={bodyJson}
        placeholder={bodyPlaceholder}
        minHeight={minHeight}
        onContentChange={({ json, text }) => {
          setBodyJson(json)
          setBodyText(text)
        }}
        onStatsChange={setStats}
        onEditorReady={handleEditorReady}
      />

      {/* Reference + Glossary modals — full editor only */}
      {!compactToolbar && editor && (
        <>
          <ReferenceModal
            editor={editor}
            isOpen={refOpen}
            onClose={() => setRefOpen(false)}
          />
          <GlossaryModal
            editor={editor}
            isOpen={glossOpen}
            onClose={() => setGlossOpen(false)}
          />
        </>
      )}

      {/* Word-count footer — save status now lives in the toolbar so this
          row only carries the word count. */}
      <div
        className="flex items-center justify-end text-eyebrow pt-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
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
