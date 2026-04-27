'use client'

/**
 * <Tooltip> — the lightest overlay primitive (chunk 3b).
 *
 * Hover-triggered (desktop) or tap-and-hold (touch). Holds the smallest
 * unit of content — glossary one-line definition, member name + role,
 * passage reference quote. No backdrop, no focus trap, no close button:
 * dismisses naturally when the user moves away.
 *
 * Reference frames: 05 (glossary tooltip on hover), 10 (tooltip stacked
 * above a popover — the only allowed same-trigger stacking).
 *
 * Stacking: tooltip is the lightest weight. Opening a new tooltip while
 * another is open replaces the old one (no chained tooltips). Stacking
 * above a popover or modal is allowed.
 */

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { createPortal } from 'react-dom'
import { useOverlayStack } from './OverlayStack'
import type { OverlayScope } from './types'

interface TooltipProps {
  /** The trigger element. Must be a single ReactElement that accepts
      onMouseEnter / onMouseLeave / onFocus / onBlur. The tooltip clones
      it to attach handlers without adding DOM noise. */
  children: ReactElement
  /** Tooltip body. Kept short — single line if possible. */
  content: React.ReactNode
  /** Scaling scope. Default body — glossary tooltip is the canonical
      example; consumers that want chrome (e.g. a chrome-button hover
      label) override. */
  scope?: OverlayScope
  /** Delay before showing on hover, in ms. Default 200. */
  showDelay?: number
  /** Preferred placement. Falls back to the opposite side near the
      viewport edge. Default 'top'. */
  placement?: 'top' | 'bottom'
  /** Disable the tooltip entirely (e.g. on touch where you want a
      different UX). */
  disabled?: boolean
  /** Optional max width on the tooltip card. Default 280px. */
  maxWidth?: number
}

interface TriggerHandlers {
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
  onFocus?: (e: React.FocusEvent) => void
  onBlur?: (e: React.FocusEvent) => void
  ref?: React.Ref<HTMLElement>
}

interface TriggerElementProps extends TriggerHandlers {
  [k: string]: unknown
}

export default function Tooltip({
  children,
  content,
  scope = 'body',
  showDelay = 200,
  placement = 'top',
  disabled = false,
  maxWidth = 280,
}: TooltipProps) {
  const id = useId()
  const stack = useOverlayStack()

  const triggerRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Cancel any pending show-timer.
  const cancelShow = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
  }, [])

  const handleEnter = useCallback(() => {
    if (disabled) return
    cancelShow()
    showTimerRef.current = setTimeout(() => setOpen(true), showDelay)
  }, [cancelShow, disabled, showDelay])

  const handleLeave = useCallback(() => {
    cancelShow()
    setOpen(false)
  }, [cancelShow])

  // Register / unregister with the overlay stack.
  useEffect(() => {
    if (!open) return
    stack.open({
      id,
      kind: 'tooltip',
      onDismiss: () => setOpen(false),
    })
    return () => stack.close(id)
  }, [open, id, stack])

  // Position the tooltip after it mounts (and on resize / scroll while
  // open). useLayoutEffect so positioning is set before paint, no flash.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return

    function calc() {
      const trigger = triggerRef.current
      const tip = tooltipRef.current
      if (!trigger || !tip) return
      const tRect = trigger.getBoundingClientRect()
      const pRect = tip.getBoundingClientRect()
      const pad = 8
      const gap = 8

      // Horizontal centre over the trigger, clamped to viewport.
      let left = tRect.left + tRect.width / 2 - pRect.width / 2
      left = Math.max(pad, Math.min(left, window.innerWidth - pRect.width - pad))

      // Vertical: preferred placement, flip if no room.
      let top: number
      if (placement === 'top') {
        const above = tRect.top - pRect.height - gap
        const below = tRect.bottom + gap
        top = above >= pad ? above : below
      } else {
        const below = tRect.bottom + gap
        const above = tRect.top - pRect.height - gap
        top = below + pRect.height <= window.innerHeight - pad ? below : above
      }

      setPos({ top, left })
    }

    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, true)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc, true)
    }
  }, [open, placement])

  // Cleanup any pending timer on unmount.
  useEffect(() => () => cancelShow(), [cancelShow])

  // Clone the trigger to attach handlers + ref.
  if (!isValidElement(children)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Tooltip] children must be a single ReactElement')
    }
    return <>{children}</>
  }

  const childProps = (children as ReactElement<TriggerElementProps>).props
  const cloned = cloneElement(children as ReactElement<TriggerElementProps>, {
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el
      // Forward to existing ref if any.
      const existingRef = (children as { ref?: React.Ref<HTMLElement> }).ref
      if (typeof existingRef === 'function') existingRef(el)
      else if (existingRef && typeof existingRef === 'object') {
        ;(existingRef as React.MutableRefObject<HTMLElement | null>).current = el
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      childProps.onMouseEnter?.(e)
      handleEnter()
    },
    onMouseLeave: (e: React.MouseEvent) => {
      childProps.onMouseLeave?.(e)
      handleLeave()
    },
    onFocus: (e: React.FocusEvent) => {
      childProps.onFocus?.(e)
      handleEnter()
    },
    onBlur: (e: React.FocusEvent) => {
      childProps.onBlur?.(e)
      handleLeave()
    },
  })

  return (
    <>
      {cloned}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className={[
            scope === 'chrome' ? 'chrome-scoped' : '',
            'fixed z-[10000] pointer-events-none animate-fade-in',
          ].filter(Boolean).join(' ')}
          style={{
            top: pos ? `${pos.top}px` : '-9999px',
            left: pos ? `${pos.left}px` : '-9999px',
            maxWidth: `${maxWidth}px`,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            // Visually below tooltips themselves, but clearly above
            // popovers and modals (z-50 / z-60 are used elsewhere).
            opacity: pos ? 1 : 0,
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
