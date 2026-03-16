/**
 * Shared author avatar colors and hash function.
 * Used across thread list, reply section, and thread detail pages
 * to give each author a consistent color based on their display name.
 *
 * Centralized here to avoid duplicating the array in 3+ files.
 * See Rule 32 in CLAUDE.md.
 */

export const AUTHOR_COLORS = [
  '#a31545', '#2e7d6e', '#6b4c9a', '#7b6b3d',
  '#6B4C7D', '#2D7A8A', '#8A4B3D', '#4A7B4F',
]

/** Deterministic hash of a name string to a color from the palette */
export function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length]
}
