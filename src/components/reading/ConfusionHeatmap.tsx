'use client'

/**
 * Confusion Heatmap Margin Strip
 *
 * Warm-colored vertical margin strip that runs alongside each paragraph.
 * Hotter = more people found this paragraph confusing.
 *
 * Chunk 3b piece 2b update: click behaviour changed from "toggle the
 * user's flag directly" to "open the ConfusionPopover" anchored to
 * this paragraph. The popover (frames 07 / 07B) handles set/unset via
 * its anonymous "I'm also stuck here" affordance, plus the "Start
 * thinking together" placeholder for chunk 5's think-together threads.
 *
 * The reasoning: a single click that toggles a flag silently is
 * pedagogically thin. Opening the popover lets the reader SEE the
 * count, read the anonymity description, and decide whether to add
 * their own flag — same gesture, more thinking room.
 *
 * Visual treatment unchanged. Uses the existing confusion_counts
 * table (counts only — see CLAUDE.md Rule 24).
 */

import type { MouseEvent } from 'react'

interface Props {
  paragraphIndex: number
  count: number
  isUserFlagged: boolean
  hidden?: boolean
  /** Open the confusion popover for this paragraph. Owned by
      ChapterReader so the popover can be paragraph-anchored. */
  onOpenPopover: (paragraphIndex: number, e: MouseEvent<HTMLButtonElement>) => void
}

export default function ConfusionHeatmap({
  paragraphIndex,
  count,
  isUserFlagged,
  hidden,
  onOpenPopover,
}: Props) {
  if (hidden) return null

  // Determine heatmap intensity
  const heatColor =
    count === 0
      ? 'var(--heatmap-none)'
      : count <= 2
        ? 'var(--heatmap-low)'
        : count <= 5
          ? 'var(--heatmap-mid)'
          : 'var(--heatmap-high)'

  const tooltipText = count === 0
    ? 'Open passage feedback'
    : `${count} ${count === 1 ? 'person finds' : 'people find'} this confusing`

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpenPopover(paragraphIndex, e)
      }}
      className="absolute -left-6 top-0 bottom-0 w-[6px] rounded-sm cursor-pointer transition-all duration-200 group/heat"
      style={{
        backgroundColor: count === 0 ? 'transparent' : heatColor,
        border: isUserFlagged ? '1px solid var(--accent-amber)' : '1px solid transparent',
      }}
      title={tooltipText}
      aria-label={`Open confusion details for paragraph ${paragraphIndex + 1}. ${tooltipText}`}
      aria-haspopup="dialog"
    >
      {/* Hover indicator — shows on paragraph hover, so users discover the feature. */}
      <span
        className="absolute inset-0 rounded-sm opacity-0 group-hover/para:opacity-100 transition-opacity duration-200"
        style={{
          backgroundColor: count === 0 ? 'var(--heatmap-low)' : heatColor,
          filter: count === 0 ? 'none' : 'brightness(1.2)',
        }}
      />
      {/* Flagged indicator dot */}
      {isUserFlagged && (
        <span
          className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{ backgroundColor: 'var(--accent-amber)' }}
        />
      )}
    </button>
  )
}
