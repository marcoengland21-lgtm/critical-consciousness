'use client'

/**
 * ConfusionPopover — chunk 3b piece 2b.
 *
 * Click-triggered, paragraph-anchored popover summoned by the
 * confusion-flag indicator on a paragraph. Per frames 07 / 07B.
 *
 * Content (Mars-locked for 2b — prose only, no gradient bar, no
 * recency line; recency queues as its own focused piece with proper
 * anonymity-impact review):
 *
 *   THIS PASSAGE IS CONFUSING                          (eyebrow, amber)
 *
 *   {N} people have flagged this paragraph             (Lora italic)
 *
 *   Flags are anonymous. Nobody sees who flagged what — only how many.
 *
 *   [ I'm also stuck here ]   [ Start thinking together ]
 *
 * "I'm also stuck here" toggles the user's local flag (chunk 1's
 * counts-only schema preserves anonymity at the DB level). "Start
 * thinking together" is a placeholder — chunk 5 will build the
 * think-together threads with their joinable-public-existence-private-
 * content visibility model. For 2b, clicking shows a toast, no params
 * captured (different model from regular threads — silently routing
 * to /threads/new would create the wrong type of thread).
 *
 * Body scope: confusion popover is reading content (the user is
 * thinking about this passage), not chrome.
 *
 * Same paragraph-anchored geometry (gutter + connector) as the
 * annotation popover, via the shared <ParagraphAnchoredPopover>
 * primitive — flips above when paragraph is near viewport bottom,
 * drops below when there's no margin to the right (frame 07B).
 */

import { useCallback, useState } from 'react'
import { ParagraphAnchoredPopover } from '@/components/overlay'
import { toggleConfusionFlag } from '@/lib/confusion-flags'

interface ConfusionPopoverProps {
  open: boolean
  onClose: () => void
  paragraphRef: React.RefObject<HTMLElement | null>
  chapterId: string
  paragraphIndex: number
  /** The current flag count for this paragraph (incl. user's). */
  count: number
  /** Whether the current user/browser has flagged this paragraph. */
  isUserFlagged: boolean
  /** Called after a successful toggle so the chapter can update its
      counts/userFlags maps without a refetch. */
  onCountChange: (newCount: number, newIsSet: boolean) => void
  /** Called when the user clicks "Start thinking together" — chapter
      surfaces a toast since the feature lands in chunk 5. */
  onStartThinkingTogether: () => void
}

export default function ConfusionPopover({
  open,
  onClose,
  paragraphRef,
  chapterId,
  paragraphIndex,
  count,
  isUserFlagged,
  onCountChange,
  onStartThinkingTogether,
}: ConfusionPopoverProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleToggleFlag = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await toggleConfusionFlag(chapterId, paragraphIndex)
      onCountChange(result.count, result.isSet)
    } catch (err) {
      console.error('[CCP] Confusion flag toggle failed:', err)
    } finally {
      setSubmitting(false)
    }
  }, [submitting, chapterId, paragraphIndex, onCountChange])

  // Use the amber-tinted accent for the eyebrow (confusion ≠ a hard
  // "this is wrong" red; warmer signal that says "we noticed").
  const amber = 'var(--accent-amber)'

  return (
    <ParagraphAnchoredPopover
      open={open}
      onClose={onClose}
      paragraphRef={paragraphRef}
      scope="body"
      width={340}
      accentColor={amber}
      ariaLabel="Confusion flag details"
    >
      <div className="px-5 py-4 space-y-3">
        <p className="text-eyebrow" style={{ color: amber }}>
          This passage is confusing
        </p>

        <p
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '1.125rem',
            lineHeight: 1.3,
          }}
        >
          {count === 0
            ? 'Nobody has flagged this yet.'
            : `${count} ${count === 1 ? 'person has' : 'people have'} flagged this paragraph`}
        </p>

        <p
          className="text-xs"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          Flags are anonymous. Nobody sees who flagged what — only how many.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleToggleFlag}
            disabled={submitting}
            className="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium btn-transition"
            style={{
              backgroundColor: isUserFlagged ? 'var(--bg-soft)' : 'var(--bg-card-alt)',
              color: 'var(--text-primary)',
              border: `1px solid ${isUserFlagged ? amber : 'var(--border-subtle)'}`,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'wait' : 'pointer',
            }}
            aria-pressed={isUserFlagged}
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isUserFlagged ? amber : 'none'} stroke={amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              {isUserFlagged ? "You're flagged here" : "I'm also stuck here"}
            </span>
            <span className="text-eyebrow" style={{ color: 'var(--text-secondary)' }}>
              Anonymous
            </span>
          </button>

          <button
            type="button"
            onClick={onStartThinkingTogether}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium btn-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Start thinking together
          </button>
        </div>
      </div>
    </ParagraphAnchoredPopover>
  )
}
