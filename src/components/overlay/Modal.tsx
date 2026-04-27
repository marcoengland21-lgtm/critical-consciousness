'use client'

/**
 * <Modal> — heaviest overlay primitive (chunk 3b).
 *
 * Centered surface with a FULLY OPAQUE backdrop — page content does
 * NOT read through. This is the round-4-locked behaviour: translucent
 * backdrops break foreground/background distinction for non-technical
 * users. Dismiss via close icon, click on backdrop, or Escape.
 *
 * Reference frames: 04 (annotation modal — sit-with conversation), 08
 * (concepts & notes modal — empty + populated), 13D-modal (journal
 * capture). Mobile: 09C (modal at 375px goes full-screen).
 *
 * Stacking: heaviest weight. Opening a new modal dismisses any open
 * modal (no chained modals). Tooltips and popovers can sit above.
 * Escape dismisses one modal at a time.
 */

import { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayStack } from './OverlayStack'
import { useMediaQuery } from './useMediaQuery'
import type { OverlayScope } from './types'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Body or chrome scope. Default body — most modals in the design
      pack are conversation surfaces. */
  scope?: OverlayScope
  /** Optional structured header. If provided, the modal renders the
      eyebrow + title + close button. Otherwise children controls the
      whole frame. */
  eyebrow?: React.ReactNode
  title?: React.ReactNode
  /** Maximum width on desktop. Mobile is always full-screen. Default
      720px (concepts & notes width per frame 08). */
  maxWidth?: number
  /** Render-prop or node for the modal body. */
  children: React.ReactNode
  /** Extra className for the modal surface (not the backdrop). */
  className?: string
  ariaLabel?: string
  /** Optional footer node — sits below the body inside the modal. */
  footer?: React.ReactNode
  /** Show the "ESC TO CLOSE" indicator at the bottom (per frame 08). */
  showEscIndicator?: boolean
}

const MOBILE_BREAKPOINT = '(max-width: 479px)'

export default function Modal({
  open,
  onClose,
  scope = 'body',
  eyebrow,
  title,
  maxWidth = 720,
  children,
  className,
  ariaLabel,
  footer,
  showEscIndicator = false,
}: ModalProps) {
  const id = useId()
  const stack = useOverlayStack()
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Stack registration.
  useEffect(() => {
    if (!open) return
    stack.open({
      id,
      kind: 'modal',
      onDismiss: onClose,
    })
    return () => stack.close(id)
  }, [open, id, stack, onClose])

  // Capture the focused element on open and restore it on close.
  useEffect(() => {
    if (!open) return
    triggerRef.current = (document.activeElement as HTMLElement) ?? null
    // Move focus into the modal after mount.
    const t = setTimeout(() => {
      surfaceRef.current?.focus()
    }, 0)
    return () => {
      clearTimeout(t)
      // Restore focus to the trigger on unmount.
      triggerRef.current?.focus?.()
    }
  }, [open])

  // Backdrop click.
  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  if (!open || typeof document === 'undefined') return null

  const scopeClass = scope === 'chrome' ? 'chrome-scoped' : ''

  // FULLY OPAQUE backdrop — uses --overlay-backdrop CSS var which is
  // defined in globals.css to be a solid color (no rgba transparency)
  // matching the theme.
  const backdropStyle: React.CSSProperties = {
    backgroundColor: 'var(--overlay-backdrop)',
  }

  // Mobile: full-screen, no padding. Desktop: centered with margin.
  const surfaceStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-card)',
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        position: 'relative',
        width: '100%',
        maxWidth: `${maxWidth}px`,
        maxHeight: '90vh',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
      }

  return createPortal(
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 z-[80] flex items-center justify-center animate-fade-in"
      style={backdropStyle}
      aria-hidden="false"
    >
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={[
          scopeClass,
          'animate-scale-in outline-none',
          className,
        ].filter(Boolean).join(' ')}
        style={surfaceStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {(eyebrow || title) && (
          <header
            className="flex items-start justify-between gap-4 px-6 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="min-w-0">
              {eyebrow && <p className="text-eyebrow mb-1">{eyebrow}</p>}
              {title && (
                <h2
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: '1.5rem',
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h2>
              )}
            </div>
            <button
              onClick={onClose}
              type="button"
              aria-label="Close"
              className="flex-shrink-0 p-1.5 rounded-md transition-colors hover-bg-themed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>
        )}

        <div
          className="flex-1 overflow-y-auto"
          style={{ minHeight: 0 }}
        >
          {children}
        </div>

        {(footer || showEscIndicator) && (
          <footer
            className="flex items-center justify-between px-6 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div>{footer}</div>
            {showEscIndicator && (
              <span
                className="text-eyebrow"
                style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
              >
                ESC to close
              </span>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}
