'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import JournalToolbar from './JournalToolbar'

/**
 * localStorage backup for in-progress journal entries.
 *
 * Pattern lifted (in spirit) from test-news /hooks/useLocalStorage.ts.
 * Writes the latest title+body to localStorage on every keystroke so a
 * network failure doesn't lose work. Cleared after a successful Supabase
 * save. On mount, if a backup exists for this entry that's newer than the
 * server-loaded initial values, the backup wins (it's almost certainly an
 * unsaved local edit from a previous failed save).
 *
 * Key shape: ccp-journal-draft:<entryId | 'new'>:<userId>
 */
function backupKey(entryId: string | null, userId: string): string {
  return `ccp-journal-draft:${entryId ?? 'new'}:${userId}`
}

interface DraftBackup {
  title: string
  body: string
  savedAt: number
}

function readBackup(key: string): DraftBackup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as DraftBackup
  } catch {
    return null
  }
}

function writeBackup(key: string, draft: DraftBackup): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    /* quota exceeded etc — best-effort */
  }
}

function clearBackup(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

interface JournalEditorProps {
  /** Existing entry id, or null when starting a fresh entry. */
  initialId: string | null
  initialTitle: string
  initialBody: string
  /** Current user id — required for inserts (RLS enforces auth.uid() = user_id). */
  userId: string
  /** Show the optional title input. False for the dashboard quick-capture variant. */
  showTitle?: boolean
  /** Compact toolbar (bold/italic/link only). True for dashboard quick-capture. */
  compactToolbar?: boolean
  /** Placeholder for the body textarea. */
  bodyPlaceholder?: string
  /** Min rows for the body textarea (it auto-grows beyond this). */
  minRows?: number
  /** Called after navigation save when redirect happens for a new entry. */
  onCreatedRedirect?: (newId: string) => void
}

const AUTOSAVE_DEBOUNCE_MS = 500

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

/**
 * JournalEditor — markdown writing surface with autosave for the private
 * journal (chunk 2 part 2).
 *
 * - Entries persist to private_notes (RLS enforces per-user privacy).
 * - Autosave debounced to 500ms (matches test-news writer-studio cadence).
 * - First save of a brand-new entry inserts a row and switches the editor
 *   into "edit existing" mode in place. If the user types nothing and
 *   leaves, no empty row is ever created.
 * - 'Saved Just now' status indicator + word count below.
 * - No submit / publish / draft-status / grade-level — this is a thinking
 *   space, not a publishing tool. Per the chunk 2 brief.
 */
export default function JournalEditor({
  initialId,
  initialTitle,
  initialBody,
  userId,
  showTitle = true,
  compactToolbar = false,
  bodyPlaceholder = 'Write a quick thought, leave a question for yourself, or jot something you noticed…',
  minRows = 8,
  onCreatedRedirect,
}: JournalEditorProps) {
  const router = useRouter()
  const [entryId, setEntryId] = useState<string | null>(initialId)
  // Restore from localStorage backup if present (handles 'I wrote, lost
  // connection, came back' — content survives the network failure).
  const initialBackup = typeof window !== 'undefined' ? readBackup(backupKey(initialId, userId)) : null
  const [title, setTitle] = useState(initialBackup?.title ?? initialTitle)
  const [body, setBody] = useState(initialBackup?.body ?? initialBody)
  const [restoredFromBackup] = useState(!!initialBackup && (initialBackup.body !== initialBody || initialBackup.title !== initialTitle))
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(initialId ? new Date() : null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track the last-saved text so we don't re-save no-op changes
  const lastSavedRef = useRef<{ title: string; body: string }>({ title: initialTitle, body: initialBody })

  // Auto-resize the body textarea as content grows.
  const autoResize = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, minRows * 24)}px`
  }, [minRows])

  useEffect(() => { autoResize() }, [body, autoResize])

  // Save handler — debounced from change events.
  const save = useCallback(async () => {
    const trimmedBody = body.trim()
    const trimmedTitle = title.trim()
    // Skip if nothing changed since last save.
    if (lastSavedRef.current.title === title && lastSavedRef.current.body === body) return
    // Skip if there's literally nothing to save (and no entry yet).
    if (!entryId && !trimmedBody && !trimmedTitle) return

    setStatus('saving')
    const supabase = createClient()
    const wordCount = countWords(body)
    const payload = {
      title: trimmedTitle || null,
      body,
      word_count: wordCount,
    }

    if (entryId) {
      const { error } = await supabase
        .from('private_notes')
        .update(payload)
        .eq('id', entryId)
      if (error) {
        console.error('[CCP] Journal autosave (update) failed:', error)
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
        console.error('[CCP] Journal autosave (insert) failed:', error)
        setStatus('error')
        return
      }
      setEntryId(data.id)
      onCreatedRedirect?.(data.id)
    }

    lastSavedRef.current = { title, body }
    setLastSavedAt(new Date())
    setStatus('saved')
    // Successful Supabase save — clear the local backup since the server
    // now has the canonical copy.
    clearBackup(backupKey(entryId, userId))
    // Refresh the parent's data (e.g. journal list) so deletes/edits show up.
    router.refresh()
  }, [body, title, entryId, userId, router, onCreatedRedirect])

  // Debounced autosave on body / title change.
  // Side-effect: write a localStorage backup IMMEDIATELY (no debounce) on
  // every change so a network failure mid-write doesn't lose anything —
  // the next page load reads the backup back into the editor.
  useEffect(() => {
    if (typeof window !== 'undefined' && (body || title)) {
      writeBackup(backupKey(entryId, userId), { title, body, savedAt: Date.now() })
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { save() }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body])

  // Save-on-unmount safety net so navigating away mid-edit doesn't lose changes.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      // Trigger one synchronous-ish save attempt. Fire-and-forget — by the
      // time the page changes, the request is in flight.
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard shortcuts — Cmd+B / Cmd+I wrap selection.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'i')) {
      e.preventDefault()
      const el = e.currentTarget
      const wrapper = e.key === 'b' ? '**' : '*'
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = body.slice(0, start) + wrapper + body.slice(start, end) + wrapper + body.slice(end)
      setBody(next)
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(start + wrapper.length, end + wrapper.length)
      }, 0)
    }
  }

  const wordCount = countWords(body)

  function exportMarkdown() {
    if (typeof window === 'undefined') return
    const safeTitle = (title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
    const date = new Date().toISOString().slice(0, 10)
    const content = title ? `# ${title}\n\n${body}\n` : `${body}\n`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-${date}-${safeTitle}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {/* Restored-from-backup notice — shows when localStorage backup
          superseded the server's initial state (i.e. unsaved local edits
          survived a network failure). Clears once the user types again. */}
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

      {/* Optional title — full-page editor only. Big, Lora italic, no chrome. */}
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

      {/* Toolbar — formatting on the left, optional export on the right.
          Export only on the full-page editor (when showTitle = true). */}
      <div
        className="flex items-center justify-between flex-wrap gap-2 pb-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <JournalToolbar textareaRef={bodyRef} onChange={setBody} compact={compactToolbar} />
        {showTitle && body.trim().length > 0 && (
          <button
            type="button"
            onClick={exportMarkdown}
            className="text-eyebrow flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover-bg-themed"
            style={{ color: 'var(--text-secondary)' }}
            title="Download this entry as a markdown file"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export .md
          </button>
        )}
      </div>

      {/* Body textarea */}
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={bodyPlaceholder}
        rows={minRows}
        className="w-full bg-transparent border-0 outline-none resize-none px-0"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '1rem',
          lineHeight: 1.7,
        }}
      />

      {/* Status row — saved indicator + word count */}
      <div
        className="flex items-center justify-between text-eyebrow pt-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span>
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && lastSavedAt && `Saved ${formatSavedAt(lastSavedAt)}`}
          {status === 'idle' && lastSavedAt && `Saved ${formatSavedAt(lastSavedAt)}`}
          {status === 'idle' && !lastSavedAt && 'Not saved yet'}
          {status === 'error' && (
            <span style={{ color: 'var(--accent-red)' }}>Couldn&apos;t save — check your connection</span>
          )}
        </span>
        <span aria-label={`${wordCount} words`}>
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
          {wordCount > 50 && (
            <>
              {' · '}
              {/* 200 wpm matches the chapter reading-time estimate (CLAUDE.md
                  Decision Log). Personal reflective writing is denser than
                  general prose so 200 is a fair estimate. */}
              ~{Math.max(1, Math.round(wordCount / 200))} min read
            </>
          )}
        </span>
      </div>
    </div>
  )
}

/** Format a 'last saved at' time as 'Just now' / 'X minutes ago' / a clock time. */
function formatSavedAt(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  return date.toLocaleString('en-NZ', { hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' })
}
