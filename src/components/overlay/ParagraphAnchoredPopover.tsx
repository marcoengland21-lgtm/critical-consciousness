'use client'

/**
 * <ParagraphAnchoredPopover> — composes <Popover> with the chunk 3b
 * paragraph-anchoring geometry (frames 03 / 03B / 03C and 07 / 07B).
 *
 * Three signals bind the popover to a paragraph:
 *
 *   1. Gutter — a left-edge purple bar drawn ON the anchored paragraph
 *      itself. Stays fixed to the paragraph's left edge regardless of
 *      where the popover sits relative to it.
 *   2. Connector — a curved line (default placement) or short vertical
 *      line (drops-below placement) running from the gutter to the
 *      popover.
 *   3. Marker — handled by the consumer (existing footnote-style
 *      indicator at the end of the relevant sentence). Not rendered by
 *      this component.
 *
 * Three placements based on viewport space:
 *
 *   - 'right' (default): popover sits to the right of the paragraph in
 *     the right margin, connector curves over.
 *   - 'above':  popover flips above the paragraph when it's near the
 *     viewport bottom, connector reverses to point down.
 *   - 'below':  popover drops below the paragraph when there's no
 *     margin to the right, connector becomes a short vertical line
 *     from the gutter.
 *
 * Same primitive making position decisions based on viewport space.
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

interface ParagraphAnchoredPopoverProps {
  open: boolean
  onClose: () => void
  /** Element ref for the anchored paragraph. The popover measures its
      bounding box to decide placement and draw the gutter/connector. */
  paragraphRef: React.RefObject<HTMLElement | null>
  scope?: OverlayScope
  /** Width of the popover card on desktop. Default 320. */
  width?: number
  /** Right-margin minimum needed for the default 'right' placement. If
      the right margin is smaller than this, the popover drops below.
      Default 280px (gives the popover + gap room). */
  rightMarginMin?: number
  /** Bottom margin threshold — if the paragraph's bottom is closer than
      this to the viewport bottom, popover flips above. Default 240. */
  bottomFlipThreshold?: number
  /** Accent color for gutter + connector. Defaults to --accent-purple. */
  accentColor?: string
  children: React.ReactNode
  ariaLabel?: string
}

type Placement = 'right' | 'above' | 'below'

interface Geometry {
  placement: Placement
  /** Where to render the popover surface (top-left in viewport coords). */
  surfaceTop: number
  surfaceLeft: number
  /** Where to render the gutter — pinned to the paragraph's left edge. */
  gutterTop: number
  gutterLeft: number
  gutterHeight: number
  /** Connector geometry. */
  connector: ConnectorGeometry
}

interface ConnectorGeometry {
  /** SVG viewBox-friendly bounding box (viewport coords). */
  top: number
  left: number
  width: number
  height: number
  /** SVG path data, drawn in the local viewBox space. */
  path: string
}

const MOBILE_BREAKPOINT = '(max-width: 479px)'

export default function ParagraphAnchoredPopover({
  open,
  onClose,
  paragraphRef,
  scope = 'body',
  width = 320,
  rightMarginMin = 280,
  bottomFlipThreshold = 240,
  accentColor,
  children,
  ariaLabel,
}: ParagraphAnchoredPopoverProps) {
  const id = useId()
  const stack = useOverlayStack()
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const [geom, setGeom] = useState<Geometry | null>(null)

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

  // Click-outside dismiss.
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const tgt = e.target as Node
      if (surfaceRef.current && surfaceRef.current.contains(tgt)) return
      // Don't close on click inside the anchored paragraph either —
      // typing/selecting in the same paragraph shouldn't dismiss the
      // popover unexpectedly.
      if (paragraphRef.current && paragraphRef.current.contains(tgt)) return
      onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose, paragraphRef])

  // Geometry calculation. Runs on open + on resize/scroll while open.
  useLayoutEffect(() => {
    if (!open || isMobile || !paragraphRef.current || !surfaceRef.current) return

    function calc() {
      const para = paragraphRef.current
      const surf = surfaceRef.current
      if (!para || !surf) return

      const pRect = para.getBoundingClientRect()
      const sRect = surf.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const pad = 12
      const gap = 24

      // Decide placement.
      const rightMargin = vw - pRect.right
      const distanceToBottom = vh - pRect.bottom

      let placement: Placement
      if (rightMargin >= rightMarginMin) {
        // Default — there's room to the right of the paragraph.
        placement = distanceToBottom < bottomFlipThreshold ? 'above' : 'right'
      } else {
        // No room to the right — drop below.
        placement = 'below'
      }

      // Compute surface position based on placement.
      let surfaceTop = 0
      let surfaceLeft = 0

      if (placement === 'right') {
        surfaceLeft = pRect.right + gap
        // Vertically aligned with the paragraph's top, but clamped to
        // viewport.
        surfaceTop = Math.max(
          pad,
          Math.min(pRect.top, vh - sRect.height - pad)
        )
      } else if (placement === 'above') {
        // Above the paragraph — sits in the right margin, anchored
        // vertically above pRect.top.
        surfaceLeft = Math.max(
          pad,
          Math.min(pRect.right - sRect.width, vw - sRect.width - pad)
        )
        surfaceTop = Math.max(pad, pRect.top - sRect.height - gap)
      } else {
        // Below — directly under the paragraph.
        surfaceLeft = Math.max(
          pad,
          Math.min(pRect.left, vw - sRect.width - pad)
        )
        surfaceTop = Math.min(pRect.bottom + 16, vh - sRect.height - pad)
      }

      // Gutter — pinned to the paragraph's left edge.
      const gutterLeft = pRect.left - 12 // sits a touch left of the text
      const gutterTop = pRect.top
      const gutterHeight = pRect.height

      // Connector geometry depends on placement.
      let connector: ConnectorGeometry
      if (placement === 'right') {
        // Curve from gutter midpoint over to popover left edge.
        const startX = gutterLeft + 4
        const startY = pRect.top + pRect.height / 2
        const endX = surfaceLeft
        const endY = surfaceTop + Math.min(40, sRect.height / 4)
        const minX = Math.min(startX, endX) - 4
        const minY = Math.min(startY, endY) - 4
        const w = Math.abs(endX - startX) + 8
        const h = Math.abs(endY - startY) + 8
        // Bezier curve from (startX,startY) to (endX,endY).
        const sx = startX - minX
        const sy = startY - minY
        const ex = endX - minX
        const ey = endY - minY
        const cp1x = sx + (ex - sx) * 0.5
        const cp1y = sy
        const cp2x = sx + (ex - sx) * 0.5
        const cp2y = ey
        connector = {
          top: minY,
          left: minX,
          width: w,
          height: h,
          path: `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`,
        }
      } else if (placement === 'above') {
        // Reverse curve — from gutter top up to popover bottom.
        const startX = gutterLeft + 4
        const startY = pRect.top
        const endX = surfaceLeft + Math.min(40, sRect.width / 4)
        const endY = surfaceTop + sRect.height
        const minX = Math.min(startX, endX) - 4
        const minY = Math.min(startY, endY) - 4
        const w = Math.abs(endX - startX) + 8
        const h = Math.abs(endY - startY) + 8
        const sx = startX - minX
        const sy = startY - minY
        const ex = endX - minX
        const ey = endY - minY
        const cp1x = sx
        const cp1y = sy + (ey - sy) * 0.5
        const cp2x = ex
        const cp2y = sy + (ey - sy) * 0.5
        connector = {
          top: minY,
          left: minX,
          width: w,
          height: h,
          path: `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`,
        }
      } else {
        // Below — short vertical line from the gutter bottom to the
        // popover top.
        const x = gutterLeft + 4
        const startY = pRect.bottom
        const endY = surfaceTop
        const minY = Math.min(startY, endY) - 4
        const h = Math.abs(endY - startY) + 8
        connector = {
          top: minY,
          left: x - 1,
          width: 2,
          height: h,
          path: `M 1 ${startY - minY} L 1 ${endY - minY}`,
        }
      }

      setGeom({
        placement,
        surfaceTop,
        surfaceLeft,
        gutterTop,
        gutterLeft,
        gutterHeight,
        connector,
      })
    }

    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, true)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc, true)
    }
  }, [open, isMobile, paragraphRef, rightMarginMin, bottomFlipThreshold])

  if (!open || typeof document === 'undefined') return null

  const scopeClass = scope === 'body' ? '' : 'chrome-scoped'
  const accent = accentColor ?? 'var(--accent-purple)'

  // Mobile: render as bottom sheet, no paragraph geometry.
  if (isMobile) {
    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[60] animate-backdrop"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={surfaceRef}
          role="dialog"
          aria-label={ariaLabel}
          aria-modal="false"
          className={[
            scopeClass,
            'fixed left-0 right-0 bottom-0 z-[70] animate-slide-up',
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

  return createPortal(
    <>
      {/* Gutter — drawn over the paragraph's left edge. Pointer-events
          none so it never intercepts clicks on the paragraph text. */}
      {geom && (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none z-[68]"
          style={{
            top: `${geom.gutterTop}px`,
            left: `${geom.gutterLeft}px`,
            width: 3,
            height: `${geom.gutterHeight}px`,
            backgroundColor: accent,
            borderRadius: 2,
          }}
        />
      )}

      {/* Connector — SVG curve or short vertical line. */}
      {geom && (
        <svg
          aria-hidden="true"
          className="fixed pointer-events-none z-[68]"
          style={{
            top: `${geom.connector.top}px`,
            left: `${geom.connector.left}px`,
            width: `${geom.connector.width}px`,
            height: `${geom.connector.height}px`,
            overflow: 'visible',
          }}
        >
          <path
            d={geom.connector.path}
            stroke={accent}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      )}

      {/* Popover surface. */}
      <div
        ref={surfaceRef}
        role="dialog"
        aria-label={ariaLabel}
        aria-modal="false"
        className={[
          scopeClass,
          'fixed z-[70] animate-scale-in',
        ].filter(Boolean).join(' ')}
        style={{
          top: geom ? `${geom.surfaceTop}px` : '-9999px',
          left: geom ? `${geom.surfaceLeft}px` : '-9999px',
          width: `${width}px`,
          maxHeight: '70vh',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          overflowY: 'auto',
          opacity: geom ? 1 : 0,
        }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}
