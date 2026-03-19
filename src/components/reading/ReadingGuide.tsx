'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAccessibility } from '@/components/layout/AccessibilityProvider'

/**
 * Reading Pacer — Two modes: Cursor-driven or Auto (timer-driven)
 *
 * **Cursor mode** (default): The paragraph under the mouse cursor gets
 * a subtle left border highlight. The reader leads — the pacer follows.
 * No timer, no WPM. Just move your cursor through the text and the
 * highlight tracks where you are.
 *
 * **Auto mode**: Word-by-word timing with adaptive duration. The pacer
 * advances automatically at a configurable WPM, with intelligent
 * slowdowns for long paragraphs and pauses at punctuation/transitions.
 *
 * Both modes use the same paragraph-level highlight (left border applied
 * directly to the DOM element — no overlay divs, no coordinate math).
 */

interface WordPosition {
  node: Text
  start: number
  end: number
  /** Index of the paragraph this word belongs to */
  paragraphIdx: number
}

interface ParagraphInfo {
  /** The DOM element */
  element: HTMLElement
  /** Number of words in this paragraph */
  wordCount: number
  /** Index of the first word in this paragraph */
  firstWordIdx: number
}

/** Walk up from a node to find the paragraph-level ancestor */
function findParagraphElement(node: Node): HTMLElement | null {
  let el: Node | null = node
  while (el) {
    if (el instanceof HTMLElement) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'p' || tag === 'blockquote' || tag === 'li' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
        return el
      }
      if (el.classList.contains('reading-text')) break
    }
    el = el.parentNode
  }
  return null
}

export default function ReadingGuide() {
  const {
    readingGuide,
    readingGuideWpm,
    setReadingGuideWpm,
    readingGuidePlaying,
    setReadingGuidePlaying,
    readingGuideMode,
    setReadingGuideMode,
    setReadingGuide,
  } = useAccessibility()
  const pathname = usePathname()

  const [words, setWords] = useState<WordPosition[]>([])
  const [paragraphs, setParagraphs] = useState<ParagraphInfo[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastScrollTime = useRef(0)
  const activeParagraphRef = useRef<HTMLElement | null>(null)

  // ── Clean up paragraph highlight ──
  const clearHighlight = useCallback(() => {
    if (activeParagraphRef.current) {
      activeParagraphRef.current.style.removeProperty('border-left')
      activeParagraphRef.current.style.removeProperty('padding-left')
      activeParagraphRef.current.style.removeProperty('transition')
      activeParagraphRef.current = null
    }
  }, [])

  // ── Apply highlight to a specific paragraph element ──
  const applyHighlight = useCallback((paragraph: HTMLElement) => {
    if (paragraph === activeParagraphRef.current) return
    clearHighlight()
    paragraph.style.transition = 'border-left-color 300ms ease-out, padding-left 300ms ease-out'
    paragraph.style.borderLeft = '2px solid var(--accent-purple)'
    paragraph.style.paddingLeft = '1rem'
    activeParagraphRef.current = paragraph
  }, [clearHighlight])

  // ── Find all words when guide activates or chapter changes ──
  useEffect(() => {
    if (!readingGuide) {
      setWords([])
      setParagraphs([])
      setWordIndex(0)
      clearHighlight()
      return
    }

    const timer = setTimeout(() => {
      const container = document.querySelector('.reading-text') as HTMLElement
      if (!container) return

      const foundWords: WordPosition[] = []
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

      // Build words array with paragraph tracking
      const paraMap = new Map<HTMLElement, number>()
      const paraInfos: ParagraphInfo[] = []

      let textNode: Text | null
      while ((textNode = walker.nextNode() as Text | null)) {
        const text = textNode.textContent || ''
        const regex = /\S+/g
        let match: RegExpExecArray | null

        const paraEl = findParagraphElement(textNode)
        let paraIdx = -1
        if (paraEl) {
          if (paraMap.has(paraEl)) {
            paraIdx = paraMap.get(paraEl)!
          } else {
            paraIdx = paraInfos.length
            paraMap.set(paraEl, paraIdx)
            paraInfos.push({ element: paraEl, wordCount: 0, firstWordIdx: foundWords.length })
          }
        }

        while ((match = regex.exec(text)) !== null) {
          if (match[0].length === 0) continue
          foundWords.push({
            node: textNode,
            start: match.index,
            end: match.index + match[0].length,
            paragraphIdx: paraIdx,
          })
          if (paraIdx >= 0) {
            paraInfos[paraIdx].wordCount++
          }
        }
      }

      setWords(foundWords)
      setParagraphs(paraInfos)
      setWordIndex(0)
      setReadingGuidePlaying(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [readingGuide, pathname, setReadingGuidePlaying, clearHighlight])

  // ── Cursor-driven mode: track mouse/touch over .reading-text ──
  useEffect(() => {
    if (!readingGuide || readingGuideMode !== 'cursor') {
      return
    }

    const container = document.querySelector('.reading-text') as HTMLElement
    if (!container) return

    let throttleTimer: ReturnType<typeof setTimeout> | null = null

    const handleCursorAt = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)
      if (!el) return

      // Walk up from the element under the cursor to find the paragraph
      const paragraph = findParagraphElement(el)
      if (paragraph && container.contains(paragraph)) {
        applyHighlight(paragraph)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle to ~50ms
      if (throttleTimer) return
      throttleTimer = setTimeout(() => { throttleTimer = null }, 50)
      handleCursorAt(e.clientX, e.clientY)
    }

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (touch) {
        handleCursorAt(touch.clientX, touch.clientY)
      }
    }

    const handleClick = (e: MouseEvent) => {
      // Immediate highlight on click (for touch devices that may not
      // fire mousemove, and for precise paragraph selection)
      handleCursorAt(e.clientX, e.clientY)
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('click', handleClick)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('click', handleClick)
      if (throttleTimer) clearTimeout(throttleTimer)
    }
  }, [readingGuide, readingGuideMode, applyHighlight])

  // ── Auto mode: highlight paragraph from word index ──
  const highlightParagraph = useCallback(() => {
    if (readingGuideMode !== 'auto') return
    if (words.length === 0 || wordIndex >= words.length) {
      clearHighlight()
      return
    }

    const word = words[wordIndex]
    const paragraph = findParagraphElement(word.node)
    if (paragraph) {
      applyHighlight(paragraph)
    }
  }, [readingGuideMode, words, wordIndex, clearHighlight, applyHighlight])

  // ── Auto-scroll when playing (auto mode) ──
  const autoScroll = useCallback(() => {
    if (readingGuideMode !== 'auto' || !readingGuidePlaying || words.length === 0 || wordIndex >= words.length) return

    const word = words[wordIndex]
    try {
      const range = document.createRange()
      range.setStart(word.node, word.start)
      range.setEnd(word.node, word.end)
      const rect = range.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const targetZone = viewportHeight * 0.33

      const now = Date.now()
      if (now - lastScrollTime.current < 300) return

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
  }, [readingGuideMode, readingGuidePlaying, words, wordIndex])

  // Update paragraph highlight + auto-scroll when word index changes (auto mode)
  useEffect(() => {
    highlightParagraph()
    autoScroll()
  }, [highlightParagraph, autoScroll])

  // Clean up highlight on unmount
  useEffect(() => {
    return () => clearHighlight()
  }, [clearHighlight])

  // ── Adaptive word timing (auto mode only) ──
  const wordsRef = useRef(words)
  const paragraphsRef = useRef(paragraphs)
  const wpmRef = useRef(readingGuideWpm)
  wordsRef.current = words
  paragraphsRef.current = paragraphs
  wpmRef.current = readingGuideWpm

  const getWordDuration = useCallback((idx: number): number => {
    const currentWords = wordsRef.current
    const currentParas = paragraphsRef.current
    const baseMs = 60000 / wpmRef.current
    if (idx >= currentWords.length) return baseMs

    const word = currentWords[idx]
    const text = (word.node.textContent || '').slice(word.start, word.end)
    const len = text.length

    const lengthFactor = Math.max(0.5, Math.min(1.8, 0.3 + len * 0.14))

    const lastChar = text[text.length - 1]
    let punctuationMs = 0
    if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
      punctuationMs = baseMs * 0.6
    } else if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
      punctuationMs = baseMs * 0.3
    } else if (lastChar === '—' || lastChar === ')' || lastChar === '"') {
      punctuationMs = baseMs * 0.2
    }

    let paragraphMs = 0
    let paragraphSlowdown = 1.0
    const paraIdx = word.paragraphIdx
    if (paraIdx >= 0 && paraIdx < currentParas.length) {
      const para = currentParas[paraIdx]

      const isFirstWord = para.firstWordIdx === idx
      if (isFirstWord && idx > 0) {
        paragraphMs = Math.min(1200, 400 + para.wordCount * 3)
      }

      if (para.wordCount > 80) {
        paragraphSlowdown = Math.min(1.4, 1.0 + (para.wordCount - 80) * 0.002)
      }
    }

    return (baseMs * lengthFactor * paragraphSlowdown) + punctuationMs + paragraphMs
  }, [])

  // ── Advance word-by-word at adaptive pace (auto mode only) ──
  useEffect(() => {
    // Only run timer in auto mode when playing
    if (readingGuideMode !== 'auto' || !readingGuidePlaying || words.length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const scheduleNext = () => {
      setWordIndex(prev => {
        if (prev >= wordsRef.current.length - 1) {
          setReadingGuidePlaying(false)
          return prev
        }
        const nextIdx = prev + 1
        timerRef.current = setTimeout(scheduleNext, getWordDuration(nextIdx))
        return nextIdx
      })
    }

    timerRef.current = setTimeout(scheduleNext, getWordDuration(wordIndex))

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingGuideMode, readingGuidePlaying, words.length, setReadingGuidePlaying, getWordDuration])

  // ── Keyboard: arrow keys to step (auto mode), Escape to pause ──
  useEffect(() => {
    if (!readingGuide) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      if (readingGuideMode === 'auto') {
        if (e.code === 'ArrowRight' && !readingGuidePlaying) {
          e.preventDefault()
          setWordIndex(prev => Math.min(prev + 1, words.length - 1))
        }
        if (e.code === 'ArrowLeft' && !readingGuidePlaying) {
          e.preventDefault()
          setWordIndex(prev => Math.max(prev - 1, 0))
        }
      }
      if (e.code === 'Escape') {
        setReadingGuidePlaying(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readingGuide, readingGuideMode, readingGuidePlaying, words.length, setReadingGuidePlaying])

  // Don't render controls until words are scanned (auto mode) or guide is active (cursor mode)
  if (!readingGuide) return null
  if (readingGuideMode === 'auto' && words.length === 0) return null

  const progress = words.length > 0 ? ((wordIndex + 1) / words.length) * 100 : 0

  return (
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
        {/* Mode toggle — two-segment pill */}
        <div
          className="flex rounded-full overflow-hidden"
          style={{ border: '1px solid var(--border-default)' }}
        >
          <button
            onClick={() => setReadingGuideMode('cursor')}
            className="px-2.5 py-1 text-[11px] font-semibold btn-transition"
            style={{
              backgroundColor: readingGuideMode === 'cursor' ? 'var(--accent-purple)' : 'transparent',
              color: readingGuideMode === 'cursor' ? 'var(--text-inverse)' : 'var(--text-secondary)',
            }}
            aria-label="Cursor mode"
          >
            Cursor
          </button>
          <button
            onClick={() => setReadingGuideMode('auto')}
            className="px-2.5 py-1 text-[11px] font-semibold btn-transition"
            style={{
              backgroundColor: readingGuideMode === 'auto' ? 'var(--accent-purple)' : 'transparent',
              color: readingGuideMode === 'auto' ? 'var(--text-inverse)' : 'var(--text-secondary)',
            }}
            aria-label="Auto mode"
          >
            Auto
          </button>
        </div>

        {/* Auto mode controls — play/pause, WPM, progress */}
        {readingGuideMode === 'auto' && (
          <>
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
          </>
        )}

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
  )
}
