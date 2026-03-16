'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccessibility } from '@/components/layout/AccessibilityProvider'

/**
 * Reading Guide — "Torch Under The Blankets" Effect
 *
 * Creates a warm, soft glow that follows the cursor, illuminating
 * the text you're reading while gently dimming everything else.
 * Like reading with a flashlight under a blanket — the focus area
 * has a warm amber glow that fades smoothly into darkness.
 *
 * Designed for users with dyslexia, ADHD, or anyone who benefits from
 * reduced visual noise while reading dense text.
 *
 * Toggle via AccessibilityProvider's readingGuide state or 'r' key.
 */

export default function ReadingGuide() {
  const { readingGuide } = useAccessibility()
  const [cursorY, setCursorY] = useState<number | null>(null)
  const [cursorX, setCursorX] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const targetY = useRef<number>(0)
  const targetX = useRef<number>(0)
  const currentY = useRef<number>(0)
  const currentX = useRef<number>(0)

  // Smooth animation loop for fluid cursor following
  const animate = useCallback(() => {
    // Ease toward target position (lerp)
    const easing = 0.15
    currentY.current += (targetY.current - currentY.current) * easing
    currentX.current += (targetX.current - currentX.current) * easing

    setCursorY(currentY.current)
    setCursorX(currentX.current)

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    targetY.current = e.clientY
    targetX.current = e.clientX
    if (!isVisible) setIsVisible(true)
  }, [isVisible])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      targetY.current = e.touches[0].clientY
      targetX.current = e.touches[0].clientX
      if (!isVisible) setIsVisible(true)
    }
  }, [isVisible])

  useEffect(() => {
    if (!readingGuide) {
      setIsVisible(false)
      return
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    // Start animation loop
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [readingGuide, handleMouseMove, handleTouchMove, animate])

  if (!readingGuide || !isVisible || cursorY === null || cursorX === null) return null

  // The glow is an ellipse — wider than tall to follow text lines naturally
  // The "torch" creates a warm amber spotlight with soft edges
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden="true"
      role="presentation"
      style={{
        // Dark overlay with a radial "cut-out" glow centered on cursor
        // Multiple gradients layer to create depth:
        // 1. Main warm glow (amber-tinted transparent ellipse)
        // 2. Wider soft falloff
        background: `
          radial-gradient(
            ellipse 500px 120px at ${cursorX}px ${cursorY}px,
            transparent 0%,
            transparent 40%,
            rgba(0, 0, 0, 0.03) 60%,
            rgba(0, 0, 0, 0.25) 80%,
            rgba(0, 0, 0, 0.45) 100%
          )
        `,
        transition: 'opacity 400ms ease-out',
      }}
    >
      {/* Inner warm glow — the "torch light" itself */}
      <div
        className="absolute"
        style={{
          left: `${cursorX}px`,
          top: `${cursorY}px`,
          width: '600px',
          height: '160px',
          transform: 'translate(-50%, -50%)',
          background: `
            radial-gradient(
              ellipse 100% 100% at 50% 50%,
              rgba(255, 191, 71, 0.06) 0%,
              rgba(255, 191, 71, 0.03) 40%,
              rgba(255, 191, 71, 0) 70%
            )
          `,
          borderRadius: '50%',
          filter: 'blur(8px)',
        }}
      />

      {/* Subtle line indicator — two faint horizontal lines marking the reading zone */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: `${cursorY - 50}px`,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 5%, rgba(255, 191, 71, 0.08) 20%, rgba(255, 191, 71, 0.12) 50%, rgba(255, 191, 71, 0.08) 80%, transparent 95%)',
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          top: `${cursorY + 50}px`,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 5%, rgba(255, 191, 71, 0.08) 20%, rgba(255, 191, 71, 0.12) 50%, rgba(255, 191, 71, 0.08) 80%, transparent 95%)',
        }}
      />
    </div>
  )
}
