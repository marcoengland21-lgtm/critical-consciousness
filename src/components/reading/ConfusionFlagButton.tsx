'use client'

/**
 * ConfusionFlagButton — chunk 3b piece 2b update.
 *
 * Click behaviour changed from "toggle the user's flag directly" to
 * "open the ConfusionPopover for this paragraph". The popover handles
 * set/unset via its anonymous "I'm also stuck here" affordance.
 *
 * Visual treatment unchanged — same intensity coloring per count.
 */

import type { MouseEvent } from 'react'

interface Props {
  paragraphIndex: number
  initialCount: number
  isUserFlagged: boolean
  hidden?: boolean
  /** Open the confusion popover anchored to this paragraph. */
  onOpenPopover: (paragraphIndex: number, e: MouseEvent<HTMLButtonElement>) => void
}

export default function ConfusionFlagButton({
  paragraphIndex,
  initialCount,
  isUserFlagged,
  hidden,
  onOpenPopover,
}: Props) {
  if (hidden) return null

  const count = initialCount

  // Intensity class — colors defined in CSS for dark mode support
  let intensityClass = 'confusion-none'
  if (count > 0 && count <= 2) intensityClass = 'confusion-low'
  else if (count > 2 && count <= 5) intensityClass = 'confusion-mid'
  else if (count > 5) intensityClass = 'confusion-high'

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpenPopover(paragraphIndex, e)
      }}
      className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all opacity-40 group-hover/para:opacity-100 hover:opacity-100 ${intensityClass}`}
      title={
        count === 0
          ? 'Open passage feedback'
          : isUserFlagged
            ? `You flagged this as confusing (${count} total)`
            : `${count} ${count === 1 ? 'person is' : 'people are'} confused here — open to add yours`
      }
      aria-label={`Open confusion details for paragraph ${paragraphIndex}. ${count} ${count === 1 ? 'person is' : 'people are'} confused here${isUserFlagged ? ' (including you)' : ''}.`}
      aria-haspopup="dialog"
    >
      ?
    </button>
  )
}
