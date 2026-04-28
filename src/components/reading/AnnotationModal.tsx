'use client'

/**
 * AnnotationModal — chunk 3b piece 2c-i.
 *
 * The "sit with this" conversation surface for a single annotation.
 * Triggered by "Open full conversation" in the AnnotationPopover, or
 * by Reply (which routes here with the composer focused).
 *
 * Frame 04:
 *   ANNOTATION #N · SIT WITH THIS                              [ × ]
 *   On Chapter X, §Y — paragraph N
 *
 *   "Exchange value, at first sight, presents itself as…"     (quote)
 *
 *   ⓙ Jeena · 2 days ago
 *      The shift from "quantitative relation" to…
 *
 *      ⓓ David · 1 day ago
 *         Yes — and the geometric illustration two paragraphs…
 *      ⓜ Mei · 14 hours ago
 *         What helped me was reading Heinrich…
 *
 *   ── composer ──
 *   [ B  I  "  ☰  ↗ ]
 *   {Add to this conversation…}
 *
 *   Cancel                      [ Reply ]   [ Give this its own space ]
 *
 * The composer offers TWO equal-weight destinations per frame 04R
 * (Mars-locked):
 *   - Reply (default)         — saves a reply attached to this annotation
 *   - Give this its own space — promotes to /threads/new with lineage
 *                               URL params (started_from=annotation,
 *                               annotation_id, author_id, chapter_ref)
 *                               for chunk 3c/3d to render the lineage
 *                               chip from. No schema work in 2c-i.
 *
 * Composer formatting buttons (chunk 3b piece 2c-i, Mars's #6 answer):
 * insert markdown syntax. Reply body stays a string; render path is
 * MarkdownBody (consistent with how annotations have always been
 * rendered).
 *
 * Body scope.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/overlay'
import { createClient } from '@/lib/supabase/client'
import TimeAgo from '@/components/ui/TimeAgo'
import MarkdownBody from '@/components/ui/MarkdownBody'

const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

interface ReplyShape {
  id: string
  body: string
  created_at: string
  author?: { id: string; display_name: string }
}

interface AnnotationShape {
  id: string
  chapter_id: string
  body: string
  quote_exact: string
  position_start: number
  position_end: number
  created_at: string
  author_id: string
  author?: { id: string; display_name: string }
  replies?: ReplyShape[]
}

interface AnnotationModalProps {
  open: boolean
  onClose: () => void
  annotation: AnnotationShape | null
  /** Chapter context for the subtitle line ("On Chapter X, §Y — paragraph N"). */
  chapterLabel: string
  paragraphNumber: number
  /** Stable display number (e.g. "#3"). */
  annotationNumber: number
  /** When true, the modal opens with the composer focused (Reply
      came from the popover). */
  focusComposer?: boolean
  /** Current user id; null = guest. */
  userId: string | null
  /** Active group context (L1) — required for the reply insert. */
  groupId: string
  /** Called after a successful reply insert so the chapter can refresh
      the annotation's reply list. */
  onReplyAdded: () => void
}

const QUOTE_TRUNCATE = 360

export default function AnnotationModal({
  open,
  onClose,
  annotation,
  chapterLabel,
  paragraphNumber,
  annotationNumber,
  focusComposer = false,
  userId,
  groupId,
  onReplyAdded,
}: AnnotationModalProps) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset body when modal opens with a new annotation; focus composer
  // if requested.
  useEffect(() => {
    if (!open) return
    setBody('')
    setSubmitting(false)
    if (focusComposer) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open, annotation?.id, focusComposer])

  const handleReply = useCallback(async () => {
    if (!annotation || !body.trim() || submitting) return
    setSubmitting(true)
    const supabase = createClient()
    const authorId = userId || GUEST_ID
    const { error } = await supabase.from('annotation_replies').insert({
      annotation_id: annotation.id,
      author_id: authorId,
      body: body.trim(),
      // L1: scope reply to active group (trigger also enforces parity with parent annotation)
      group_id: groupId,
    })
    setSubmitting(false)
    if (!error) {
      setBody('')
      onReplyAdded()
    } else {
      console.error('[CCP] Annotation reply failed:', error)
    }
  }, [annotation, body, userId, groupId, onReplyAdded, submitting])

  const handleGiveItsOwnSpace = useCallback(() => {
    if (!annotation) return
    // Lineage URL params per Piece 1 surface answers (data capture
    // only; chunk 3c/3d builds the lineage chip from these).
    const params = new URLSearchParams({
      started_from: 'annotation',
      annotation_id: annotation.id,
      author_id: annotation.author_id,
      chapter_id: annotation.chapter_id,
      quote: annotation.quote_exact,
      // The annotation body is the seed for the new thread's body so
      // the user doesn't lose their thinking — but they edit at
      // /threads/new before posting.
      body: annotation.body,
      type: 'passage_pick',
    })
    router.push(`/threads/new?${params.toString()}`)
  }, [annotation, router])

  // Markdown insert helpers — same pattern as AnnotationCreatePopover.
  const wrapSelection = useCallback((before: string, after: string = before) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.slice(start, end)
    const next = body.slice(0, start) + before + selected + after + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + selected.length
    })
  }, [body])

  const insertLinePrefix = useCallback((prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const lineStart = body.lastIndexOf('\n', start - 1) + 1
    const next = body.slice(0, lineStart) + prefix + body.slice(lineStart)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + prefix.length
    })
  }, [body])

  const insertLink = useCallback(() => {
    const url = window.prompt('Link URL:')
    if (!url) return
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.slice(start, end) || 'link text'
    const linkMarkdown = `[${selected}](${url})`
    const next = body.slice(0, start) + linkMarkdown + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + 1
      ta.selectionEnd = start + 1 + selected.length
    })
  }, [body])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleReply()
      }
    },
    [handleReply]
  )

  if (!annotation) return null

  const replies = annotation.replies ?? []
  const authorName = annotation.author?.display_name ?? 'Guest'
  const initial = authorName.charAt(0).toUpperCase()

  const displayQuote =
    annotation.quote_exact.length > QUOTE_TRUNCATE
      ? annotation.quote_exact.slice(0, QUOTE_TRUNCATE).replace(/\s+\S*$/, '') + '…'
      : annotation.quote_exact

  return (
    <Modal
      open={open}
      onClose={onClose}
      scope="body"
      eyebrow={`Annotation #${annotationNumber} · Sit with this`}
      title={`On ${chapterLabel} — paragraph ${paragraphNumber}`}
      maxWidth={720}
      ariaLabel="Annotation conversation"
    >
      <div className="px-6 pt-4 pb-6 space-y-5">
        {/* Anchored quote */}
        <blockquote
          style={{
            borderLeft: '3px solid var(--accent-purple)',
            paddingLeft: '0.875rem',
            color: 'var(--text-secondary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          &ldquo;{displayQuote}&rdquo;
        </blockquote>

        {/* OP: original annotation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AuthorAvatar name={authorName} initial={initial} />
            <div className="min-w-0">
              <div
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {authorName}
              </div>
              <div className="text-eyebrow" style={{ color: 'var(--text-secondary)' }}>
                <TimeAgo date={annotation.created_at} />
              </div>
            </div>
          </div>
          <div
            className="annotation-body markdown-body pl-9"
            style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}
          >
            <MarkdownBody content={annotation.body} />
          </div>
        </div>

        {/* Reply tree */}
        {replies.length > 0 && (
          <div
            className="pl-9 space-y-4"
            style={{ borderLeft: '2px solid var(--border-subtle)', marginLeft: 14 }}
          >
            {replies
              .slice()
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .map((reply) => {
                const replyAuthor = reply.author?.display_name ?? 'Guest'
                const replyInitial = replyAuthor.charAt(0).toUpperCase()
                return (
                  <div key={reply.id} className="pl-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <AuthorAvatar
                        name={replyAuthor}
                        initial={replyInitial}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {replyAuthor}
                        </div>
                        <div
                          className="text-eyebrow"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <TimeAgo date={reply.created_at} />
                        </div>
                      </div>
                    </div>
                    <div
                      className="annotation-body markdown-body pl-7"
                      style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}
                    >
                      <MarkdownBody content={reply.body} />
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* Composer — sticks to the bottom of the modal scroll area */}
        <div
          className="rounded-md"
          style={{
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-card-alt)',
          }}
        >
          {/* Format buttons */}
          <div
            className="flex items-center gap-0.5 px-2 py-1.5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <FormatBtn label="Bold (⌘B)" onClick={() => wrapSelection('**')}>
              <strong>B</strong>
            </FormatBtn>
            <FormatBtn label="Italic (⌘I)" onClick={() => wrapSelection('*')}>
              <em>I</em>
            </FormatBtn>
            <FormatBtn label="Quote" onClick={() => insertLinePrefix('> ')}>
              &ldquo;
            </FormatBtn>
            <FormatBtn label="Bulleted list" onClick={() => insertLinePrefix('- ')}>
              <ListIcon />
            </FormatBtn>
            <FormatBtn label="Link" onClick={insertLink}>
              <LinkIcon />
            </FormatBtn>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add to this conversation…"
            rows={3}
            className="w-full p-3 text-sm border-0 resize-vertical focus:outline-none"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: "'Lora', Georgia, serif",
              lineHeight: 1.6,
            }}
          />

          {/* Two equal-weight destinations (frame 04R, locked) */}
          <div
            className="flex items-center justify-end gap-2 px-3 py-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={handleGiveItsOwnSpace}
              className="text-xs font-medium px-3 py-2 rounded-md transition-colors hover-bg-themed flex items-center gap-1.5"
              style={{ color: 'var(--accent-red)' }}
            >
              <ThreadIcon />
              Give this its own space
            </button>
            <button
              type="button"
              onClick={handleReply}
              disabled={!body.trim() || submitting}
              className="text-xs font-medium px-3 py-2 rounded-md btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ReplyIcon />
              {submitting ? 'Sending…' : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Presentational helpers ─────────────────────────────────────────────

const AVATAR_COLORS = [
  '#a31545', '#2e7d6e', '#6b4c9a', '#7b6b3d',
  '#6B4C7D', '#2D7A8A', '#8A4B3D', '#4A7B4F',
]

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function AuthorAvatar({
  name,
  initial,
  size = 'md',
}: {
  name: string
  initial: string
  size?: 'sm' | 'md'
}) {
  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-xs'
  return (
    <span
      className={`${sz} flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: hashColor(name) }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

function FormatBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      className="w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors hover-bg-themed"
      style={{ color: 'var(--text-secondary)' }}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function ReplyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  )
}

function ThreadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}
