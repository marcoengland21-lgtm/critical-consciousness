'use client'

/**
 * SelectionActionBar — chunk 3b piece 2c-i.
 *
 * The two-action floating bar that appears when the reader selects
 * text in the chapter. Replaces the old SelectionToolbar.
 *
 * Per frames 11A / 11B / 11C / 11E:
 *   - Two equal-weight buttons: Annotate · Give this its own space
 *   - Default placement: ABOVE the selection
 *   - Flips BELOW when the selection is near the top of the viewport
 *   - Mobile (<480px): stacks VERTICALLY with full-text labels per
 *     11C / 11E rationale ("stack the buttons. Keep the words.")
 *
 * Not built on top of <Popover> because the anchor is a Range/rect,
 * not a DOM element, and there's no gutter/connector — it's a
 * floating action bar with viewport-aware placement only. The
 * primitive's API stays clean (element OR ref); selection bar lives
 * separately.
 *
 * Body-content scope is irrelevant here — this surface is chrome
 * (action labels), not reading content. Doesn't apply chrome-scoped
 * either though: the surface is short-lived and self-contained, so
 * leaning on the Tailwind defaults is fine. (Empirically: action
 * labels at 14 px stay legible across the chrome scale range.)
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '@/components/overlay'

interface SelectionActionBarProps {
  /** The selection rect (DOMRect from getBoundingClientRect on the
      selected range). Bar positions relative to this. */
  rect: DOMRect
  /** Open the create-annotation flow. */
  onAnnotate: () => void
  /** Promote selection to a /threads/new flow with lineage params. */
  onGiveItsOwnSpace: () => void
  /** Dismiss (e.g., click outside, Escape). */
  onClose: () => void
}

const MOBILE_BREAKPOINT = '(max-width: 479px)'

export default function SelectionActionBar({
  rect,
  onAnnotate,
  onGiveItsOwnSpace,
  onClose,
}: SelectionActionBarProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const barRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'above' | 'below' } | null>(null)

  // Placement calc — flips below when there isn't room above (frame 11B).
  useLayoutEffect(() => {
    if (!barRef.current) return

    function calc() {
      const bar = barRef.current
      if (!bar) return
      const bRect = bar.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const pad = 8
      const gap = 12

      let placement: 'above' | 'below' = 'above'
      let top = rect.top - bRect.height - gap
      if (top < pad) {
        placement = 'below'
        top = rect.bottom + gap
      }
      // Keep within viewport vertically.
      top = Math.max(pad, Math.min(top, vh - bRect.height - pad))

      // Horizontal: center over the selection on desktop; full-width on mobile.
      let left: number
      if (isMobile) {
        left = pad
      } else {
        left = rect.left + rect.width / 2 - bRect.width / 2
        left = Math.max(pad, Math.min(left, vw - bRect.width - pad))
      }

      setPos({ top, left, placement })
    }

    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, true)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc, true)
    }
  }, [rect, isMobile])

  // Click-outside dismiss.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  // Mobile layout: full-width bar pinned to the bottom of the
  // selection (or top, flipped) with stacked vertical buttons.
  if (isMobile) {
    return createPortal(
      <div
        ref={barRef}
        role="toolbar"
        aria-label="Selection actions"
        className="fixed z-[70] animate-scale-in"
        style={{
          top: pos ? `${pos.top}px` : '-9999px',
          left: pos ? `${pos.left}px` : '-9999px',
          right: pos ? '8px' : 'auto',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          opacity: pos ? 1 : 0,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={onAnnotate}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover-bg-themed text-left"
          style={{ color: 'var(--text-primary)' }}
        >
          <PencilIcon />
          Annotate
        </button>
        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
        <button
          type="button"
          onClick={onGiveItsOwnSpace}
          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover-bg-themed text-left"
          style={{ color: 'var(--accent-red)' }}
        >
          <ThreadIcon />
          Give this its own space
        </button>
      </div>,
      document.body
    )
  }

  // Desktop layout: horizontal bar with two equal-weight buttons.
  return createPortal(
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Selection actions"
      className="fixed z-[70] flex items-center gap-1 animate-scale-in"
      style={{
        top: pos ? `${pos.top}px` : '-9999px',
        left: pos ? `${pos.left}px` : '-9999px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        padding: '0.25rem',
        opacity: pos ? 1 : 0,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onAnnotate}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors hover-bg-themed"
        style={{ color: 'var(--text-primary)' }}
        title="Add an annotation to this passage"
      >
        <PencilIcon />
        Annotate
      </button>
      <span className="w-px h-4" style={{ backgroundColor: 'var(--border-subtle)' }} aria-hidden="true" />
      <button
        type="button"
        onClick={onGiveItsOwnSpace}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors hover-bg-themed"
        style={{ color: 'var(--accent-red)' }}
        title="Promote this passage into its own /threads conversation"
      >
        <ThreadIcon />
        Give this its own space
      </button>
    </div>,
    document.body
  )
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
