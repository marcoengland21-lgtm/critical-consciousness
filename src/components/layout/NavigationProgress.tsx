'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Thin animated progress bar at the top of the viewport during navigation.
 * Gives instant visual feedback that something is happening when you click a link.
 * Similar to NProgress but lightweight (~1KB) and built on CSS transitions.
 */
export default function NavigationProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const prevPathname = useRef(pathname)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const trickleRef = useRef<NodeJS.Timeout | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (trickleRef.current) clearInterval(trickleRef.current)
    timerRef.current = null
    trickleRef.current = null
  }, [])

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // Navigation completed — finish the bar
      cleanup()
      setProgress(100)
      setVisible(true)

      // Hide after animation completes
      timerRef.current = setTimeout(() => {
        setVisible(false)
        // Reset for next navigation
        timerRef.current = setTimeout(() => {
          setProgress(0)
        }, 200)
      }, 300)

      prevPathname.current = pathname
    }
  }, [pathname, cleanup])

  // Intercept clicks on internal links to start the progress bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return

      // It's an internal navigation — start the progress bar
      if (href !== pathname) {
        cleanup()
        setProgress(15)
        setVisible(true)

        // Trickle: slowly increase progress to give the feeling of loading
        trickleRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) return prev
            // Slow down as we approach 90%
            const increment = prev < 50 ? 8 : prev < 80 ? 3 : 1
            return Math.min(prev + increment, 90)
          })
        }, 300)
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      cleanup()
    }
  }, [pathname, cleanup])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none"
      style={{ height: '3px' }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: 'var(--accent-red)',
          transition: progress === 0
            ? 'none'
            : progress === 100
              ? 'width 200ms ease-out, opacity 200ms ease-out 200ms'
              : 'width 300ms ease-out',
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 8px var(--accent-red)',
        }}
      />
    </div>
  )
}
