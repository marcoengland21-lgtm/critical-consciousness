'use client'

/**
 * Overlay stacking + Escape handling for the three primitives.
 *
 * Per the chunk 3b design pack stacking rule:
 *   - Lighter overlays can stack ABOVE heavier ones (tooltip on popover/
 *     modal; popover on modal).
 *   - Same-or-heavier overlays REPLACE — opening a new popover dismisses
 *     any open popover-or-heavier; opening a modal dismisses any modal.
 *   - Tooltip-on-tooltip is a chain → forbidden, replaces.
 *
 * Replacement back-navigation is left to the consumer surface (e.g. the
 * glossary popover keeps its own term-history stack and renders a back
 * arrow). Framework-level back-nav would require re-mounting the previous
 * component, which is fragile across surface types — keeping it
 * consumer-side is simpler and fits the "one component swaps content"
 * pattern (frame 06 → click related term → same popover, new content).
 *
 * Escape always dismisses the top of the stack (the lightest currently-
 * open overlay), one dismiss per layer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { OVERLAY_WEIGHT, type OverlayKind } from './types'

interface OverlayHandle {
  /** Stable identity for this overlay instance. */
  id: string
  kind: OverlayKind
  /** The framework calls this when this overlay should close itself
      (e.g. a same-kind overlay opened, replacing this one; or Escape
      dismissed the top of the stack). */
  onDismiss: () => void
}

interface OverlayStackAPI {
  /** Register an overlay as opened. Dismisses any same-or-heavier
      overlays already on the stack first. */
  open: (handle: OverlayHandle) => void
  /** Remove an overlay from the stack (consumer closing itself). */
  close: (id: string) => void
  /** Top of stack — used by Escape to know what to dismiss next. */
  topKind: () => OverlayKind | null
}

const NoopAPI: OverlayStackAPI = {
  open: () => {},
  close: () => {},
  topKind: () => null,
}

const Ctx = createContext<OverlayStackAPI | null>(null)

export function OverlayStackProvider({ children }: { children: React.ReactNode }) {
  // Stack stored bottom (heaviest) to top (lightest). A typical full
  // stack reads: [modal, popover, tooltip]. Index N is "above" index N-1
  // in z-order.
  const stackRef = useRef<OverlayHandle[]>([])

  const open = useCallback((handle: OverlayHandle) => {
    const stack = stackRef.current
    const newWeight = OVERLAY_WEIGHT[handle.kind]

    // Dismiss anything of equal or greater weight — they get replaced.
    // Lighter overlays stay (they can sit above the new one). The
    // dismiss callbacks are responsible for cleaning up their own state.
    const toDismiss: OverlayHandle[] = []
    const survivors: OverlayHandle[] = []
    for (const h of stack) {
      if (OVERLAY_WEIGHT[h.kind] >= newWeight && h.id !== handle.id) {
        toDismiss.push(h)
      } else {
        survivors.push(h)
      }
    }
    // Insert new at the position matching its weight (sorted ascending —
    // heaviest at index 0, lightest at the end).
    const insertIdx = survivors.findIndex(
      (s) => OVERLAY_WEIGHT[s.kind] > newWeight
    )
    if (insertIdx === -1) {
      survivors.push(handle)
    } else {
      survivors.splice(insertIdx, 0, handle)
    }
    stackRef.current = survivors

    // Fire dismissals AFTER reordering so each dismiss can call
    // close() without disturbing the current open() in flight.
    toDismiss.forEach((h) => h.onDismiss())
  }, [])

  const close = useCallback((id: string) => {
    const stack = stackRef.current
    const idx = stack.findIndex((h) => h.id === id)
    if (idx >= 0) stack.splice(idx, 1)
  }, [])

  const topKind = useCallback((): OverlayKind | null => {
    const top = stackRef.current[stackRef.current.length - 1]
    return top?.kind ?? null
  }, [])

  // Global Escape — dismiss the top of the stack. One press = one layer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const top = stackRef.current[stackRef.current.length - 1]
      if (!top) return
      // Don't preventDefault — input fields handling Escape natively
      // (e.g. cancelling autocomplete) shouldn't be blocked. Overlays
      // that own focus capture Escape themselves before this fires
      // anyway via their own keydown handler.
      top.onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <Ctx.Provider value={{ open, close, topKind }}>{children}</Ctx.Provider>
}

/**
 * Hook used by overlay primitives to register themselves. Outside a
 * provider, returns no-op API so primitives still work standalone (e.g.
 * in a Storybook or a route that hasn't been wrapped yet).
 */
export function useOverlayStack(): OverlayStackAPI {
  return useContext(Ctx) ?? NoopAPI
}
