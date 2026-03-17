'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAccessibility } from '@/components/layout/AccessibilityProvider'

/**
 * Reading Pacer — Word-by-word pace guide with auto-scroll
 *
 * A clean, minimal indicator line sits above the current word and
 * advances at a configurable WPM. Includes a floating control strip
 * with play/pause, WPM adjustment, and progress.
 *
 * - Scans .reading-text for words via TreeWalker (handles <mark> annotations)
 * - Positions indicator using Range API (no DOM modification)
 * - Smooth auto-scroll keeps current word in the top third of viewport
 * - Floating control strip appears at bottom of viewport when active
 *
 * Toggle via AccessibilityProvider's readingGuide state.
 */

interface WordPosition {
  node: Text
  start: number
  end: number
}

export default function ReadingGuide() {
  const {
    readingGuide,
    readingGuideWpm,
    setReadingGuideWpm,
    readingGuidePlaying,
    setReadingGuidePlaying,
    setReadingGuide,
  } = useAccessibility()
  const pathname = usePathname()

  const [words, setWords] = useState<WordPosition[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const [indicatorPos, setIndicatorPos] = useState<{
    left: number; top: number; width: number
  } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastScrollTime = useRef(0)

  // ── Find all words when guide activates or chapter changes ──
  useEffect(() => {
    if (!readingGuide) {
      setWords([])
      setWordIndex(0)
      setIndicatorPos(null)
      return
    }

    // Small delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const container = document.querySelector('.reading-text') as HTMLElement
      if (!container) return

      const foundWords: WordPosition[] = []
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

      let textNode: Text | null
      while ((textNode = walker.nextNode() as Text | null)) {
        const text = textNode.textContent || ''
        const regex = /\S+/g
        let match: RegExpExecArray | null
        while ((match = regex.exec(text)) !== null) {
          // Skip zero-width matches
          if (match[0].length === 0) continue
          foundWords.push({
            node: textNode,
            start: match.index,
            end: match.index + match[0].length,
          })
        }
      }

      setWords(foundWords)
      setWordIndex(0)
      setReadingGuidePlaying(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [readingGuide, pathname, setReadingGuidePlaying])

  // ── Position indicator above current word ──
  const positionIndicator = useCallback(() => {
    if (words.length === 0 || wordIndex >= words.length) {
      setIndicatorPos(null)
      return
    }

    const word = words[wordIndex]
    try {
      const range = document.createRange()
      range.setStart(word.node, word.start)
      range.setEnd(word.node, word.end)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0 || rect.height === 0) return

      setIndicatorPos({
        left: rect.left,
        top: rect.top - 4,
        width: rect.width,
      })
    } catch {
      // Range API can throw if text node left the DOM
    }
  }, [words, wordIndex])

  // ── Auto-scroll when playing ──
  const autoScroll = useCallback(() => {
    if (!readingGuidePlaying || words.length === 0 || wordIndex >= words.length) return

    const word = words[wordIndex]
    try {
      const range = document.createRange()
      range.setStart(word.node, word.start)
      range.setEnd(word.node, word.end)
      const rect = range.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const targetZone = viewportHeight * 0.33 // top third

      // Only scroll if word is outside the comfort zone
      // Below middle of viewport → scroll to put it in top third
      // Above top of viewport → scroll up
      const now = Date.now()
      if (now - lastScrollTime.current < 300) return // debounce

      if (rect.top > viewportHeight * 0.55) {
        const scrollTarget = window.scrollY + rect.top - targetZone
        window.scrollTo({ top: scrollTarget, behavior: 'smooth' })
        lastScrollTime.current = now
      } else if (rect.top < 60) {
        const scrollTarget = window.scrollY + rect.top - targetZone
        window.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' })
        lastScrollTime.current = now
      }
    } catch {
      // ignore
    }
  }, [readingGuidePlaying, words, wordIndex])

  // Update indicator + auto-scroll when word index changes
  useEffect(() => {
    positionIndicator()
    autoScroll()
  }, [positionIndicator, autoScroll])

  // Reposition on scroll (word rects shift when page scrolls)
  useEffect(() => {
    if (!readingGuide || words.length === 0) return

    const handleScroll = () => positionIndicator()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [readingGuide, words.length, positionIndicator])

  // ── Advance word-by-word at WPM pace ──
  useEffect(() => {
    if (!readingGuidePlaying || words.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const msPerWord = 60000 / readingGuideWpm

    intervalRef.current = setInterval(() => {
      setWordIndex(prev => {
        if (prev >= words.length - 1) {
          setReadingGuidePlaying(false)
          return prev
        }
        return prev + 1
      })
    }, msPerWord)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [readingGuidePlaying, readingGuideWpm, words.length, setReadingGuidePlaying])

  // ── Keyboard: arrow keys to step (no space — conflicts with page scroll) ──
  useEffect(() => {
    if (!readingGuide) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      if (e.code === 'ArrowRight' && !readingGuidePlaying) {
        e.preventDefault()
        setWordIndex(prev => Math.min(prev + 1, words.length - 1))
      }
      if (e.code === 'ArrowLeft' && !readingGuidePlaying) {
        e.preventDefault()
        setWordIndex(prev => Math.max(prev - 1, 0))
      }
      if (e.code === 'Escape') {
        setReadingGuidePlaying(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readingGuide, readingGuidePlaying, words.length, setReadingGuidePlaying])

  if (!readingGuide || words.length === 0) return null

  const progress = words.length > 0 ? ((wordIndex + 1) / words.length) * 100 : 0

  return (
    <>
      {/* ── The indicator line above the current word ── */}
      {indicatorPos && (
        <div
          className="reading-guide-indicator"
          style={{
            position: 'fixed',
            left: `${indicatorPos.left}px`,
            top: `${indicatorPos.top}px`,
            width: `${indicatorPos.width}px`,
            height: '2px',
            borderRadius: '1px',
            pointerEvents: 'none',
            zIndex: 100,
            transition: 'left 60ms ease-out, top 60ms ease-out, width 60ms ease-out',
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Floating control strip ── */}
      <div
        className="fixed z-50 left-1/2 animate-fade-in"
        style={{
          bottom: '5rem',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg"
          style={{
            backgroundColor: 'rgba(var(--bg-card-rgb), 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Play/Pause */}
          <button
            onClick={() => setReadingGuidePlaying(!readingGuidePlaying)}
            className="w-8 h-8 flex items-center justify-center rounded-full btn-transition"
            style={{
              backgroundColor: readingGuidePlaying ? 'var(--accent-amber)' : 'var(--bg-soft)',
              color: readingGuidePlaying ? 'var(--text-inverse)' : 'var(--text-primary)',
            }}
            aria-label={readingGuidePlaying ? 'Pause' : 'Play'}
          >
            <span className="text-xs">{readingGuidePlaying ? '⏸' : '▶'}</span>
          </button>

          {/* WPM - / display / + */}
          <button
            onClick={() => setReadingGuideWpm(readingGuideWpm - 20)}
            disabled={readingGuideWpm <= 80}
            className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold btn-transition disabled:opacity-30"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-soft)' }}
            aria-label="Decrease speed"
          >
            −
          </button>
          <span
            className="text-xs font-semibold tabular-nums min-w-[3.5rem] text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            {readingGuideWpm} <span className="text-[10px] font-normal" style={{ color: 'var(--text-secondary)' }}>wpm</span>
          </span>
          <button
            onClick={() => setReadingGuideWpm(readingGuideWpm + 20)}
            disabled={readingGuideWpm >= 500}
            className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold btn-transition disabled:opacity-30"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-soft)' }}
            aria-label="Increase speed"
          >
            +
          </button>

          {/* Progress bar */}
          <div
            className="w-16 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--bg-soft)' }}
            title={`Word ${wordIndex + 1} of ${words.length}`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--accent-amber)',
                transition: 'width 100ms linear',
              }}
            />
          </div>

          {/* Close */}
          <button
            onClick={() => setReadingGuide(false)}
            className="w-6 h-6 flex items-center justify-center rounded-full btn-transition"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close reading pacer"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
