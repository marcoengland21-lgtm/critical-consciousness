/**
 * Hook: persist and restore scroll position per chapter.
 *
 * On mount, restores the last saved scroll position for this chapter.
 * While reading, debounce-saves scroll position every 500ms.
 * On unmount (navigating away), saves final position.
 *
 * The debounce interval (500ms) balances responsiveness with
 * localStorage write frequency. Scroll events fire very often —
 * we don't want to write on every pixel of scroll.
 */

import { useEffect, useRef } from 'react'
import { saveScrollPosition, getScrollPosition } from '@/lib/scroll-persistence'

export function useScrollPersistence(chapterNumber: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Restore saved position after a brief delay to let the DOM settle
    const savedPos = getScrollPosition(chapterNumber)
    if (savedPos > 0) {
      // Use requestAnimationFrame to wait for layout
      requestAnimationFrame(() => {
        window.scrollTo(0, savedPos)
      })
    }

    // Debounced scroll handler — saves position every 500ms
    function handleScroll() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        saveScrollPosition(chapterNumber)
      }, 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      // Save final position on unmount (navigating to another chapter)
      saveScrollPosition(chapterNumber)
      window.removeEventListener('scroll', handleScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [chapterNumber])
}
