'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAccessibility } from '@/components/layout/AccessibilityProvider'

/**
 * Reading Pacer — Paragraph-highlight pace guide with auto-scroll
 *
 * Words are tracked internally for WPM timing, but the visual indicator
 * is a subtle left border on the current paragraph — applied directly
 * to the DOM element, so it can never misposition. No overlay divs,
 * no coordinate math, no Range API positioning bugs.
 *
 * - Scans .reading-text for words via TreeWalker
 * - Internal word-by-word timing with adaptive duration
 * - Highlights the paragraph containing the current word (left border)
 * - Smooth auto-scroll keeps current paragraph in the top third
 * - Floating control strip with play/pause, WPM, and progress
 *
 * Toggle via AccessibilityProvider's readingGuide state.
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

  // ── Find all words when guide activates or chapter changes ──
  useEffect(() => {
    if (!readingGuide) {
      setWords([])
      setWordIndex(0)
      clearHighlight()
      return
    }

    const timer = setTimeout(() => {
      const container = document.querySelector('.reading-text') as HTMLElement
      if (!container) return

      const foundWords: WordPosition[] = []
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

      // Helper: find the paragraph-level ancestor of a text node
      const findParagraph = (node: Node): HTMLElement | null => {
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

      // Build words array with paragraph tracking
      const paraMap = new Map<HTMLElement, number>() // element → paragraph index
      const paraInfos: ParagraphInfo[] = []
      let currentParaIdx = -1

      let textNode: Text | null
      while ((textNode = walker.nextNode() as Text | null)) {
        const text = textNode.textContent || ''
        const regex = /\S+/g
        let match: RegExpExecArray | null

        // Find which paragraph this text node belongs to
        const paraEl = findParagraph(textNode)
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

  // ── Highlight the paragraph containing the current word ──
  // Walks up from the text node to find the nearest block-level parent
  // (p, blockquote, li, div) inside .reading-text, then applies a
  // subtle left border. No overlays, no coordinate math.
  const highlightParagraph = useCallback(() => {
    if (words.length === 0 || wordIndex >= words.length) {
      clearHighlight()
      return
    }

    const word = words[wordIndex]
    // Walk up from the text node to find the paragraph-level element
    let el: Node | null = word.node
    let paragraph: HTMLElement | null = null
    while (el) {
      if (el instanceof HTMLElement) {
        const tag = el.tagName.toLowerCase()
        if (tag === 'p' || tag === 'blockquote' || tag === 'li' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
          paragraph = el
          break
        }
        // Stop searching if we hit the container
        if (el.classList.contains('reading-text')) break
      }
      el = el.parentNode
    }

    if (!paragraph) return

    // Same paragraph — no change needed
    if (paragraph === activeParagraphRef.current) return

    // Remove highlight from previous paragraph
    clearHighlight()

    // Apply highlight to new paragraph
    paragraph.style.transition = 'border-left-color 300ms ease-out, padding-left 300ms ease-out'
    paragraph.style.borderLeft = '2px solid var(--accent-purple)'
    paragraph.style.paddingLeft = '1rem'
    activeParagraphRef.current = paragraph
  }, [words, wordIndex, clearHighlight])

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
  }, [readingGuidePlaying, words, wordIndex])

  // Update paragraph highlight + auto-scroll when word index changes
  useEffect(() => {
    highlightParagraph()
    autoScroll()
  }, [highlightParagraph, autoScroll])

  // Clean up highlight on unmount
  useEffect(() => {
    return () => clearHighlight()
  }, [clearHighlight])

  // ── Adaptive word timing ──
  // Considers word length, punctuation, paragraph length, and paragraph
  // transitions. Long paragraphs (common in Capital) get slowed down
  // so readers have time to absorb dense material.
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

    // ── Word length factor ──
    const lengthFactor = Math.max(0.5, Math.min(1.8, 0.3 + len * 0.14))

    // ── Punctuation pause ──
    const lastChar = text[text.length - 1]
    let punctuationMs = 0
    if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
      punctuationMs = baseMs * 0.6
    } else if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
      punctuationMs = baseMs * 0.3
    } else if (lastChar === '—' || lastChar === ')' || lastChar === '"') {
      punctuationMs = baseMs * 0.2
    }

    // ── Paragraph-level adjustments ──
    let paragraphMs = 0
    let paragraphSlowdown = 1.0
    const paraIdx = word.paragraphIdx
    if (paraIdx >= 0 && paraIdx < currentParas.length) {
      const para = currentParas[paraIdx]

      // New paragraph pause: settling time when entering a new paragraph.
      // Longer paragraphs get more settling time — your eye needs to
      // take in the new block before starting to read.
      const isFirstWord = para.firstWordIdx === idx
      if (isFirstWord && idx > 0) {
        // Base pause of 400ms + 3ms per word in the paragraph
        // A 20-word paragraph: 460ms pause. A 200-word paragraph: 1000ms.
        paragraphMs = Math.min(1200, 400 + para.wordCount * 3)
      }

      // Long paragraph slowdown: paragraphs over 80 words get a global
      // slowdown factor. Capital is full of 150-300 word paragraphs that
      // need more time to absorb.
      // 80 words = 1.0x, 150 words = 1.15x, 250 words = 1.3x, caps at 1.4x
      if (para.wordCount > 80) {
        paragraphSlowdown = Math.min(1.4, 1.0 + (para.wordCount - 80) * 0.002)
      }
    }

    return (baseMs * lengthFactor * paragraphSlowdown) + punctuationMs + paragraphMs
  }, [])

  // ── Advance word-by-word at adaptive pace ──
  useEffect(() => {
    if (!readingGuidePlaying || words.length === 0) {
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
  }, [readingGuidePlaying, words.length, setReadingGuidePlaying, getWordDuration])

  // ── Keyboard: arrow keys to step, Escape to pause ──
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
    // No overlay indicator — paragraph highlight is applied directly to DOM.
    // Only the floating control strip renders here.
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
  )
}
