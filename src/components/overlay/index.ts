/**
 * Three overlay primitives — chunk 3b foundation.
 *
 * Use these primitives for any new overlay surface in the platform:
 *   - <Tooltip>                  — hover, smallest content
 *   - <Popover>                  — click, chrome-anchored, mobile bottom-sheet
 *   - <ParagraphAnchoredPopover> — click, paragraph-anchored, gutter+connector
 *   - <Modal>                    — centered, fully-opaque backdrop
 *
 * Mobile sheet rendering is internal to <Popover> and to
 * <ParagraphAnchoredPopover>, NOT a fourth primitive.
 *
 * Stacking + Escape are handled by <OverlayStackProvider> at the app
 * root. Surfaces register themselves automatically via the primitives.
 */

export { default as Tooltip } from './Tooltip'
export { default as Popover, type PopoverPlacement } from './Popover'
export { default as ParagraphAnchoredPopover } from './ParagraphAnchoredPopover'
export { default as Modal } from './Modal'
export { OverlayStackProvider, useOverlayStack } from './OverlayStack'
export { useMediaQuery } from './useMediaQuery'
export type { OverlayKind, OverlayScope } from './types'
export { OVERLAY_WEIGHT } from './types'
