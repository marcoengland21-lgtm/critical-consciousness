/**
 * Scroll position persistence for reading pages.
 *
 * Saves/restores scroll position per chapter so readers
 * can return to where they left off. Uses localStorage with
 * a namespaced key to avoid collisions.
 *
 * 200 wpm reading means a chapter might take 15-45 minutes.
 * Being able to resume exactly where you stopped is important
 * for a book this dense.
 */

const STORAGE_KEY_PREFIX = 'ccp-scroll-'

/** Save scroll position for a specific chapter */
export function saveScrollPosition(chapterNumber: number): void {
  try {
    const pos = window.scrollY
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${chapterNumber}`, String(pos))
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

/** Get saved scroll position for a specific chapter, or 0 if none */
export function getScrollPosition(chapterNumber: number): number {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chapterNumber}`)
    return saved ? parseInt(saved, 10) : 0
  } catch {
    return 0
  }
}
