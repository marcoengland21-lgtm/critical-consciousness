'use client'

/**
 * JournalCaptureModal — chunk 3b piece 4.
 *
 * Triggered by the "Capture a thought…" affordance at the bottom of
 * the dashboard right rail. Per frame 13D-modal:
 *
 *   NEW JOURNAL ENTRY                                            ×
 *
 *   {Title field — Lora italic}
 *
 *   {Body textarea}
 *
 *   Open in journal →                              Cancel    Save
 *
 * Backdrop is FULLY OPAQUE — uses the <Modal> primitive's default
 * which is the chunk 3b round-4-locked behaviour. On mobile, the
 * primitive renders as full-screen automatically.
 *
 * Save behaviour: inserts a new private_notes row with title + body
 * + body_text + word_count, then closes. "Open in journal →" routes
 * the user to /journal/[id] for the freshly-created entry — they
 * can keep writing if they want.
 *
 * No chapter_id passed — captures from the dashboard are
 * unaffiliated with a specific chapter. (The
 * ConceptsNotesModal-triggered create flow uses ?chapter_id=X
 * separately for per-chapter notes.)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/overlay'
import { createClient } from '@/lib/supabase/client'

interface JournalCaptureModalProps {
  open: boolean
  onClose: () => void
  userId: string
}

export default function JournalCaptureModal({
  open,
  onClose,
  userId,
}: JournalCaptureModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Reset on open + focus the title.
  useEffect(() => {
    if (!open) return
    setTitle('')
    setBody('')
    setSubmitting(false)
    const t = setTimeout(() => titleRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  const handleSave = useCallback(
    async (afterSave: 'close' | 'open-in-journal') => {
      const trimmedTitle = title.trim()
      const trimmedBody = body.trim()
      if (!trimmedTitle && !trimmedBody) return
      if (submitting) return
      setSubmitting(true)

      const supabase = createClient()
      const wordCount = trimmedBody
        ? trimmedBody.split(/\s+/).filter(Boolean).length
        : 0

      // Tiptap-compatible JSON for the body. Plain paragraph since
      // this is a quick capture; the full Tiptap editor takes over
      // when the user clicks "Open in journal".
      const bodyJson = trimmedBody
        ? {
            type: 'doc',
            content: trimmedBody.split('\n').map((line) => ({
              type: 'paragraph',
              content: line ? [{ type: 'text', text: line }] : undefined,
            })),
          }
        : { type: 'doc', content: [] }

      const { data, error } = await supabase
        .from('private_notes')
        .insert({
          user_id: userId,
          title: trimmedTitle || null,
          body_json: bodyJson,
          body_text: trimmedBody,
          word_count: wordCount,
        })
        .select('id')
        .single()

      setSubmitting(false)

      if (error || !data) {
        console.error('[CCP] Journal capture save failed:', error)
        return
      }

      onClose()
      if (afterSave === 'open-in-journal') {
        router.push(`/journal/${data.id}`)
      } else {
        router.refresh()
      }
    },
    [title, body, userId, onClose, router, submitting]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave('close')
      }
    },
    [handleSave]
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      scope="body"
      eyebrow="New journal entry"
      maxWidth={560}
      ariaLabel="Capture a thought"
    >
      <div className="px-6 py-5 space-y-4">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Untitled (optional)"
          className="w-full bg-transparent border-0 outline-none px-0 py-1"
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '1.5rem',
            lineHeight: 1.2,
          }}
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          rows={8}
          className="w-full rounded-md text-sm p-3 resize-vertical"
          style={{
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            lineHeight: 1.65,
          }}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleSave('open-in-journal')}
            disabled={submitting || (!title.trim() && !body.trim())}
            className="text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'var(--accent-red)' }}
          >
            Open in journal →
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-xs px-3 py-2 rounded-md transition-colors hover-bg-themed disabled:opacity-50"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave('close')}
              disabled={submitting || (!title.trim() && !body.trim())}
              className="text-xs font-medium px-3 py-2 rounded-md btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
