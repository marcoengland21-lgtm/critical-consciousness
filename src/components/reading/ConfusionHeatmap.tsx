'use client'

import { useState, useCallback } from 'react'
import { toggleConfusionFlag } from '@/lib/confusion-flags'

interface Props {
  chapterId: string
  paragraphIndex: number
  initialCount: number
  isUserFlagged: boolean
  hidden?: boolean
}

/**
 * Confusion Heatmap Margin Strip
 *
 * Replaces the tiny "?" confusion flag buttons with a warm-colored vertical
 * margin strip that runs alongside each paragraph. Hotter = more people
 * found this paragraph confusing. Click to toggle your own flag.
 *
 * Makes collective struggle VISIBLE and beautiful. The hesitant member sees
 * warm glowing margins and thinks "oh, everyone struggles here" — not
 * "I'm the only one who doesn't get it."
 *
 * Uses the existing confusion_counts table (genuinely anonymous, counts only).
 */
export default function ConfusionHeatmap({
  chapterId,
  paragraphIndex,
  initialCount,
  isUserFlagged,
  hidden,
}: Props) {
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isSet, setIsSet] = useState(isUserFlagged)

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      const result = await toggleConfusionFlag(chapterId, paragraphIndex)
      setCount(result.count)
      setIsSet(result.isSet)
    } catch (error) {
      console.error('Failed to toggle confusion flag:', error)
    } finally {
      setIsLoading(false)
    }
  }, [chapterId, paragraphIndex])

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
    ? 'Mark as confusing'
    : `${count} ${count === 1 ? 'person finds' : 'people find'} this confusing`

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className="absolute -left-6 top-0 bottom-0 w-[6px] rounded-sm cursor-pointer transition-all duration-200 group/heat disabled:opacity-50"
      style={{
        backgroundColor: heatColor,
        border: isSet ? '1px solid var(--accent-amber)' : '1px solid transparent',
        opacity: count === 0 ? 0 : 1,
      }}
      title={tooltipText}
      aria-label={`Toggle confusion flag for paragraph ${paragraphIndex + 1}. ${tooltipText}`}
    >
      {/* Hover indicator — shows even when count is 0, so users discover the feature */}
      <span
        className="absolute inset-0 rounded-sm opacity-0 group-hover/para:opacity-100 transition-opacity duration-200"
        style={{
          backgroundColor: count === 0 ? 'var(--heatmap-low)' : heatColor,
          filter: count === 0 ? 'none' : 'brightness(1.2)',
        }}
      />
      {/* Flagged indicator dot */}
      {isSet && (
        <span
          className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{ backgroundColor: 'var(--accent-amber)' }}
        />
      )}
    </button>
  )
}
