'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccessibility } from '@/components/layout/AccessibilityProvider'

/**
 * Reading Guide — Warm Glowing Companion
 *
 * A soft, warm amber glow that follows your cursor, gently guiding
 * your eyes along the text. Nothing gets dimmed — this is an additive
 * glow, like a little glowing buddy floating along with you.
 *
 * Features:
 * - Warm amber ellipse with heavy blur (looks like soft light)
 * - Subtle breathing animation (feels alive)
 * - Faint guide lines at top/bottom edges
 * - Direct cursor tracking (no lag)
 * - Works on both mouse and touch
 *
 * Toggle via AccessibilityProvider's readingGuide state.
 */

export default function ReadingGuide() {
  const { readingGuide } = useAccessibility()
  const [cursorY, setCursorY] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (glowRef.current) {
      // Direct DOM update — no state batching delay, instant response
      glowRef.current.style.top = `${e.clientY}px`
    }
    if (!isVisible) {
      setCursorY(e.clientY)
      setIsVisible(true)
    }
  }, [isVisible])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const y = e.touches[0].clientY
      if (glowRef.current) {
        glowRef.current.style.top = `${y}px`
      }
      if (!isVisible) {
        setCursorY(y)
        setIsVisible(true)
      }
    }
  }, [isVisible])

  useEffect(() => {
    if (!readingGuide) {
      setIsVisible(false)
      return
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [readingGuide, handleMouseMove, handleTouchMove])

  if (!readingGuide || !isVisible) return null

  return (
    <div
      ref={glowRef}
      className="fixed left-0 right-0 z-[100] pointer-events-none reading-guide-companion"
      aria-hidden="true"
      role="presentation"
      style={{
        top: cursorY ?? 0,
        transform: 'translateY(-50%)',
        height: '70px',
        willChange: 'top',
        transition: 'top 60ms ease-out',
      }}
    >
      {/* Main warm glow — the "companion" */}
      <div
        className="absolute left-1/2 top-1/2 reading-guide-glow"
        style={{
          transform: 'translate(-50%, -50%)',
          width: '420px',
          height: '55px',
          borderRadius: '50%',
          filter: 'blur(28px)',
        }}
      />

      {/* Top guide line */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 10%, rgba(var(--accent-amber-rgb), 0.18) 30%, rgba(var(--accent-amber-rgb), 0.25) 50%, rgba(var(--accent-amber-rgb), 0.18) 70%, transparent 90%)',
        }}
      />

      {/* Bottom guide line */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 10%, rgba(var(--accent-amber-rgb), 0.18) 30%, rgba(var(--accent-amber-rgb), 0.25) 50%, rgba(var(--accent-amber-rgb), 0.18) 70%, transparent 90%)',
        }}
      />
    </div>
  )
}
