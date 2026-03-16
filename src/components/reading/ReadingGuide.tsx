'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccessibility } from '@/components/layout/AccessibilityProvider'

/**
 * Reading Guide / Reading Ruler
 *
 * A semi-transparent overlay that highlights a "reading strip" around the
 * user's cursor position. The top and bottom regions are dimmed, creating
 * a clear focus lane that makes it easier to track lines of text.
 *
 * Designed for users with dyslexia, ADHD, or anyone who benefits from
 * reduced visual noise while reading dense text.
 *
 * Toggle via AccessibilityProvider's readingGuide state.
 */
const STRIP_HEIGHT = 80 // px — approximately 3 lines of reading text

export default function ReadingGuide() {
  const { readingGuide } = useAccessibility()
  const [cursorY, setCursorY] = useState<number | null>(null)
  const [isTouch, setIsTouch] = useState(false)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setCursorY(e.clientY)
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      setCursorY(e.touches[0].clientY)
      setIsTouch(true)
    }
  }, [])

  useEffect(() => {
    if (!readingGuide) return

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [readingGuide, handleMouseMove, handleTouchMove])

  if (!readingGuide || cursorY === null) return null

  const halfStrip = STRIP_HEIGHT / 2
  const topHeight = Math.max(0, cursorY - halfStrip)
  const bottomTop = cursorY + halfStrip

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden="true"
      role="presentation"
    >
      {/* Top dimmed region */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: `${topHeight}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          transition: 'height 50ms linear',
        }}
      />
      {/* Clear reading strip — the "ruler" */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: `${topHeight}px`,
          height: `${STRIP_HEIGHT}px`,
          boxShadow: 'inset 0 1px 0 rgba(var(--accent-amber-rgb), 0.3), inset 0 -1px 0 rgba(var(--accent-amber-rgb), 0.3)',
        }}
      />
      {/* Bottom dimmed region */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          top: `${bottomTop}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          transition: 'top 50ms linear',
        }}
      />
    </div>
  )
}
