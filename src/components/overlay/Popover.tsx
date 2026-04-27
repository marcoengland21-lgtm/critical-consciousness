'use client'

/**
 * <Popover> — click-triggered floating element (chunk 3b).
 *
 * Holds more content than a tooltip, still small enough to read at a
 * glance. Page behind stays fully active (no backdrop dim) on desktop.
 * At narrow widths (<480px), this primitive renders as a bottom sheet
 * with a backdrop — that's the same primitive, not a fourth one (per
 * the design pack cover rationale).
 *
 * Reference frames: 02 (settings, chrome-anchored), 06 (glossary entry,
 * chrome-anchored), 09B (mobile bottom sheet rendering).
 *
 * For paragraph-anchored popovers (annotation, confusion) — frames 03 /
 * 03B / 03C / 07 / 07B — see <ParagraphAnchoredPopover> which composes
 * this primitive and adds the gutter+connector+marker geometry.
 *
 * Stacking: replaces any same-or-heavier overlay on open. Tooltips can
 * sit above. Escape dismisses.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useOverlayStack } from './OverlayStack'
import { useMediaQuery } from './useMediaQuery'
import type { OverlayScope } from './types'

export type PopoverPlacement =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'right-start'
  | 'right'
  | 'right-end'
  | 'left-start'
  | 'left'
  | 'left-end'

interface PopoverProps {
  /** Whether the popover is shown. Controlled. */
  open: boolean
  /** Called when the user dismisses (click outside, Escape, or back). */
  onClose: () => void
  /** The element the popover anchors to on desktop. On mobile (sheet
      mode) the anchor is ignored; the sheet pins to the viewport bottom. */
  anchor?: React.RefObject<HTMLElement | null> | null
  /** Body or chrome scope. Default body — most popovers in the design
      pack are reading content (annotation, glossary, confusion). The
      settings popover overrides to chrome. */
  scope?: OverlayScope
  /** Preferred placement on desktop. Falls back to the opposite side or
      adjacent placement when there's not enough viewport space. Default
      'bottom-start'. */
  placement?: PopoverPlacement
  /** Distance between popover and anchor in px. Default 8. */
  offset?: number
  /** Width on desktop. Mobile sheet is always full-width. Default 320. */
  width?: number
  /** Maximum height before scrolling. Default 80% of viewport. */
  maxHeight?: number | string
  /** Disable the mobile bottom-sheet rendering and force desktop layout
      everywhere. Used by <ParagraphAnchoredPopover> which has its own
      paragraph-relative layout regardless of viewport. */
  disableMobileSheet?: boolean
  /** Render-prop or node for the popover content. */
  children: React.ReactNode
  /** Optional className applied to the popover surface. */
  className?: string
  /** Optional aria-label for the dialog. */
  ariaLabel?: string
}

const MOBILE_BREAKPOINT = '(max-width: 479px)'

export default function Popover({
  open,
  onClose,
  anchor,
  scope = 'body',
  placement = 'bottom-start',
  offset = 8,
  width = 320,
  maxHeight = '80vh',
  disableMobileSheet = false,
  children,
  className,
  ariaLabel,
}: PopoverProps) {
  const id = useId()
  const stack = useOverlayStack()
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT) && !disableMobileSheet

  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Stack registration.
  useEffect(() => {
    if (!open) return
    stack.open({
      id,
      kind: 'popover',
      onDismiss: onClose,
    })
    return () => stack.close(id)
  }, [open, id, stack, onClose])

  // Click-outside dismiss. Mounted once we open.
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const tgt = e.target as Node
      if (popoverRef.current && popoverRef.current.contains(tgt)) return
      // Don't dismiss if click was on the anchor itself — typically the
      // anchor is a trigger button that toggles open/close on its own.
      if (anchor?.current && anchor.current.contains(tgt)) return
      onClose()
    }
    // Slight delay so the click that opened doesn't immediately close.
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose, anchor])

  // Position calculation (desktop only — mobile sheet uses fixed bottom).
  useLayoutEffect(() => {
    if (!open || isMobile || !popoverRef.current) return
    if (!anchor?.current) {
      // No anchor — center it.
      const rect = popoverRef.current.getBoundingClientRect()
      setPos({
        top: Math.max(8, window.innerHeight / 2 - rect.height / 2),
        left: Math.max(8, window.innerWidth / 2 - rect.width / 2),
      })
      return
    }

    function calc() {
      const trigger = anchor?.current
      const pop = popoverRef.current
      if (!trigger || !pop) return
      const a = trigger.getBoundingClientRect()
      const p = pop.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const pad = 8

      // Decide vertical band first based on the placement prefix.
      const [side, align = 'start'] = placement.split('-') as [
        'top' | 'bottom' | 'left' | 'right',
        'start' | 'end' | undefined,
      ]

      let top = 0
      let left = 0

      if (side === 'top' || side === 'bottom') {
        const above = a.top - p.height - offset
        const below = a.bottom + offset
        if (side === 'top') {
          top = above >= pad ? above : below
        } else {
          top = below + p.height <= vh - pad ? below : above
        }
        if (align === 'start') left = a.left
        else if (align === 'end') left = a.right - p.width
        else left = a.left + a.width / 2 - p.width / 2
      } else {
        // left / right
        const right = a.right + offset
        const lft = a.left - p.width - offset
        if (side === 'right') {
          left = right + p.width <= vw - pad ? right : lft
        } else {
          left = lft >= pad ? lft : right
        }
        if (align === 'start') top = a.top
        else if (align === 'end') top = a.bottom - p.height
        else top = a.top + a.height / 2 - p.height / 2
      }

      // Clamp within viewport.
      left = Math.max(pad, Math.min(left, vw - p.width - pad))
      top = Math.max(pad, Math.min(top, vh - p.height - pad))

      setPos({ top, left })
    }

    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, true)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc, true)
    }
  }, [open, isMobile, anchor, placement, offset])

  if (!open || typeof document === 'undefined') return null

  const scopeClass = scope === 'chrome' ? 'chrome-scoped' : ''

  if (isMobile) {
    // Bottom sheet rendering — full-width with translucent backdrop and
    // slide-up animation. Backdrop here is intentionally translucent
    // (NOT the fully-opaque modal backdrop) so the user keeps spatial
    // context with the page underneath.
    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[60] animate-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={ariaLabel}
          aria-modal="false"
          className={[
            scopeClass,
            'fixed left-0 right-0 bottom-0 z-[70] animate-slide-up',
            className,
          ].filter(Boolean).join(' ')}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div
              className="h-1 w-10 rounded-full"
              style={{ backgroundColor: 'var(--border-strong)' }}
            />
          </div>
          {children}
        </div>
      </>,
      document.body
    )
  }

  // Desktop: floating card, no backdrop.
  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="false"
      className={[
        scopeClass,
        'fixed z-[70] animate-scale-in',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        top: pos ? `${pos.top}px` : '-9999px',
        left: pos ? `${pos.left}px` : '-9999px',
        width: `${width}px`,
        maxHeight,
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        overflowY: 'auto',
        opacity: pos ? 1 : 0,
      }}
    >
      {children}
    </div>,
    document.body
  )
}
