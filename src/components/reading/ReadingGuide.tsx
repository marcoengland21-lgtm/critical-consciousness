'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccessibility } from '@/components/layout/AccessibilityProvider'

/**
 * Reading Guide — Word Pacer
 *
 * A small, warm indicator line that sits above the current word and
 * advances word-by-word at a configurable WPM pace. Like a little
 * reading buddy pacing you through the text.
 *
 * - Finds all words in the .reading-text container
 * - Positions a small line above the current word using Range API
 * - Advances at the user's chosen WPM (default 200)
 * - Play/pause with spacebar or click on the indicator
 * - Auto-scrolls gently to keep the current word in view
 * - Does NOT modify the DOM (no wrapping words in spans)
 *
 * Toggle via AccessibilityProvider's readingGuide state.
 */

interface WordPosition {
  node: Text
  start: number
  end: number
}

export default function ReadingGuide() {
  const { readingGuide, readingGuideWpm, readingGuidePlaying, setReadingGuidePlaying } = useAccessibility()
  const [words, setWords] = useState<WordPosition[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({ display: 'none' })
  const indicatorRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLElement | null>(null)

  // Find all words in the reading text on mount / when guide activates
  useEffect(() => {
    if (!readingGuide) {
      setWords([])
      setWordIndex(0)
      return
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const container = document.querySelector('.reading-text') as HTMLElement
      if (!container) return
      containerRef.current = container

      const foundWords: WordPosition[] = []
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

      let textNode: Text | null
      while ((textNode = walker.nextNode() as Text | null)) {
        const text = textNode.textContent || ''
        // Match words (sequences of non-whitespace)
        const regex = /\S+/g
        let match: RegExpExecArray | null
        while ((match = regex.exec(text)) !== null) {
          foundWords.push({
            node: textNode,
            start: match.index,
            end: match.index + match[0].length,
          })
        }
      }

      setWords(foundWords)
      setWordIndex(0)
    }, 300)

    return () => clearTimeout(timer)
  }, [readingGuide])

  // Position the indicator above the current word
  const positionIndicator = useCallback(() => {
    if (words.length === 0 || wordIndex >= words.length) {
      setIndicatorStyle({ display: 'none' })
      return
    }

    const word = words[wordIndex]
    try {
      const range = document.createRange()
      range.setStart(word.node, word.start)
      range.setEnd(word.node, word.end)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0 || rect.height === 0) return

      setIndicatorStyle({
        display: 'block',
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top - 4}px`,
        width: `${rect.width}px`,
        height: '2px',
        borderRadius: '1px',
        pointerEvents: 'none' as const,
        zIndex: 100,
        transition: 'left 80ms ease-out, top 80ms ease-out, width 80ms ease-out',
      })

      // Auto-scroll: if the word is near the bottom of the viewport, scroll down
      const viewportHeight = window.innerHeight
      if (rect.bottom > viewportHeight - 120) {
        window.scrollBy({ top: rect.height * 3, behavior: 'smooth' })
      }
      // If word scrolled above viewport, scroll up
      if (rect.top < 80) {
        window.scrollBy({ top: -(rect.height * 3), behavior: 'smooth' })
      }
    } catch {
      // Range API can throw if text node is no longer in DOM
    }
  }, [words, wordIndex])

  // Update indicator position whenever word index changes
  useEffect(() => {
    positionIndicator()
  }, [positionIndicator])

  // Also reposition on scroll (words move when page scrolls)
  useEffect(() => {
    if (!readingGuide || words.length === 0) return

    const handleScroll = () => positionIndicator()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [readingGuide, words.length, positionIndicator])

  // Advance word-by-word at WPM pace
  useEffect(() => {
    if (!readingGuidePlaying || words.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // WPM → ms per word
    const msPerWord = 60000 / readingGuideWpm

    intervalRef.current = setInterval(() => {
      setWordIndex(prev => {
        if (prev >= words.length - 1) {
          // Reached the end — pause
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

  // Keyboard: space to play/pause, arrow keys to step
  useEffect(() => {
    if (!readingGuide) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setReadingGuidePlaying(!readingGuidePlaying)
      }
      if (e.code === 'ArrowRight' && !readingGuidePlaying) {
        e.preventDefault()
        setWordIndex(prev => Math.min(prev + 1, words.length - 1))
      }
      if (e.code === 'ArrowLeft' && !readingGuidePlaying) {
        e.preventDefault()
        setWordIndex(prev => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readingGuide, readingGuidePlaying, words.length, setReadingGuidePlaying])

  if (!readingGuide || words.length === 0) return null

  return (
    <div
      ref={indicatorRef}
      className="reading-guide-indicator"
      style={indicatorStyle}
      aria-hidden="true"
    />
  )
}
