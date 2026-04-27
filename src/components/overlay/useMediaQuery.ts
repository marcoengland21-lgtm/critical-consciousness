'use client'

import { useEffect, useState } from 'react'

/**
 * SSR-safe media query hook used by <Popover> to switch to bottom-sheet
 * rendering at narrow widths and by <Modal> to go full-screen on mobile.
 *
 * Returns false on the server (no `window`); mounts client-side and
 * resolves to the actual match.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    // Modern browsers: addEventListener; legacy: addListener.
    if (mq.addEventListener) {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    } else {
      mq.addListener(update)
      return () => mq.removeListener(update)
    }
  }, [query])

  return matches
}
