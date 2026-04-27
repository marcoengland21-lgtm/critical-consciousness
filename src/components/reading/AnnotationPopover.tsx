'use client'

/**
 * AnnotationPopover — chunk 3b piece 2c-i (REBUILT).
 *
 * The read-flow preview that appears when the reader clicks an
 * annotation highlight on a paragraph. Per frames 03 / 03B / 03C.
 * Uses the shared <ParagraphAnchoredPopover> primitive — gutter +
 * connector + right-of / flipped-above / dropped-below placements.
 *
 *   ⓙ Jeena                                              · 2 days ago · #3
 *
 *   The shift from "quantitative relation" to "appears accidental"
 *   is the move I keep tripping on. […]
 *
 *   ⏵ 2 replies
 *
 *   [ ↩ Reply ]                       [ Open full conversation → ]
 *
 * Note (chunk 3b piece 2c-i, Mars's #5 answer): the design pack's
 * "N GOT STUCK HERE TOO" cluster is intentionally NOT rendered here.
 * That solidarity primitive lives on the chunk 5 think-together
 * threads with a properly-scoped schema. Shipping a fake on
 * annotations now would commit us to a schema we haven't designed.
 * Reply count is rendered in its place.
 *
 * Multi-annotation paragraphs (Mars's #5 answer in Piece 2 surface
 * points, "show most recent + 'N of M' indicator"): the popover
 * accepts the FULL annotation list for the paragraph, displays the
 * most-recent one, and shows a small "1 of M" indicator when M > 1.
 * Clicking "Open full conversation" lands on the modal which lists
 * all annotations for the paragraph.
 *
 * REPLACES the previous AnnotationPopover.tsx, which was misnamed —
 * it was actually the create-flow popover (now rebuilt at
 * AnnotationCreatePopover.tsx per frame 11D). Old AnnotationPanel
 * slide-over also replaced by this + AnnotationModal.
 *
 * Body scope.
 */

import { useMemo } from 'react'
import { ParagraphAnchoredPopover } from '@/components/overlay'
import TimeAgo from '@/components/ui/TimeAgo'

interface ReplyShape {
  id: string
  body: string
  created_at: string
  author?: { id: string; display_name: string }
}

interface AnnotationShape {
  id: string
  body: string
  quote_exact: string
  position_start: number
  position_end: number
  created_at: string
  author?: { id: string; display_name: string }
  replies?: ReplyShape[]
}

interface AnnotationPopoverProps {
  open: boolean
  onClose: () => void
  paragraphRef: React.RefObject<HTMLElement | null>
  /** All annotations attached to the clicked paragraph. The popover
      shows the MOST RECENT and an "N of M" indicator if there are
      more. */
  annotations: AnnotationShape[]
  /** Stable display number for the focused annotation in the popover
      header (e.g. "#3"). Computed at the chapter level so it matches
      the modal. */
  annotationNumber: (annotation: AnnotationShape) => number
  /** Open the reply composer in the modal — chapter routes this to
      the same handler as "Open full conversation" but the modal
      pre-focuses the composer. */
  onReply: (annotation: AnnotationShape) => void
  /** Open the full conversation modal. */
  onOpenFull: (annotation: AnnotationShape) => void
}

export default function AnnotationPopover({
  open,
  onClose,
  paragraphRef,
  annotations,
  annotationNumber,
  onReply,
  onOpenFull,
}: AnnotationPopoverProps) {
  // Most-recent first
  const sorted = useMemo(
    () => [...annotations].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [annotations]
  )
  const focused = sorted[0]
  const total = sorted.length
  const replyCount = focused?.replies?.length ?? 0

  if (!focused) return null

  const authorName = focused.author?.display_name ?? 'Guest'
  const initial = authorName.charAt(0).toUpperCase()
  const annNumber = annotationNumber(focused)

  return (
    <ParagraphAnchoredPopover
      open={open}
      onClose={onClose}
      paragraphRef={paragraphRef}
      scope="body"
      width={360}
      ariaLabel={`Annotation #${annNumber} by ${authorName}`}
    >
      <div className="px-5 py-4 space-y-3">
        {/* Header row: avatar + author + eyebrow */}
        <div className="flex items-center gap-2">
          <AuthorAvatar name={authorName} initial={initial} />
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {authorName}
            </div>
            <div className="text-eyebrow" style={{ color: 'var(--text-secondary)' }}>
              <TimeAgo date={focused.created_at} /> · #{annNumber}
            </div>
          </div>
          {total > 1 && (
            <span
              className="text-eyebrow flex-shrink-0"
              style={{ color: 'var(--text-secondary)', opacity: 0.85 }}
              title={`${total} annotations on this paragraph — showing the most recent`}
            >
              1 of {total}
            </span>
          )}
        </div>

        {/* Body */}
        <p
          className="annotation-body"
          style={{ color: 'var(--text-primary)', lineHeight: 1.65 }}
        >
          {focused.body}
        </p>

        {/* Reply count line — replaces the design pack's "N got stuck
            here too" cluster (out of scope for 2c-i; chunk 5 brings
            the proper solidarity_marker primitive). */}
        {replyCount > 0 && (
          <p
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChatIcon />
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onReply(focused)}
            className="btn-secondary text-xs px-3 py-1.5 flex-1 flex items-center justify-center gap-1.5"
          >
            <ReplyIcon />
            Reply
          </button>
          <button
            type="button"
            onClick={() => onOpenFull(focused)}
            className="btn-primary text-xs px-3 py-1.5 flex-1 flex items-center justify-center gap-1"
          >
            Open full conversation
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </ParagraphAnchoredPopover>
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

function AuthorAvatar({ name, initial }: { name: string; initial: string }) {
  return (
    <span
      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs"
      style={{ backgroundColor: hashColor(name) }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

function ChatIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
