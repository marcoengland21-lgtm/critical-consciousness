/**
 * Overlay primitive types. Three primitives — tooltip, popover, modal —
 * lifted directly from the chunk 3b design pack (CSG Overlay System).
 *
 * Mobile sheet rendering is internal to <Popover> at narrow widths and
 * is not a fourth primitive.
 *
 * Stacking weight (used by OverlayStack):
 *   tooltip < popover < modal
 *
 * Scaling scope: each primitive declares whether its contents follow the
 * View settings text-size slider (body) or the Menu Size preset (chrome).
 * Defaults — set per the distribution in the design pack:
 *   tooltip → body  (glossary tooltip is the canonical example)
 *   popover → body  (annotation / glossary / confusion are body; settings
 *                    overrides to chrome)
 *   modal   → body  (annotation / concepts & notes / glossary expanded /
 *                    journal capture are all conversation surfaces)
 */

export type OverlayKind = 'tooltip' | 'popover' | 'modal'

export type OverlayScope = 'body' | 'chrome'

/** Stacking weight, larger = heavier. */
export const OVERLAY_WEIGHT: Record<OverlayKind, number> = {
  tooltip: 0,
  popover: 1,
  modal: 2,
}
