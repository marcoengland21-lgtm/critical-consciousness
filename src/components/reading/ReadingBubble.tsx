'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/layout/ThemeProvider'
import { getChapterLabel, getPartNumber, partTitles } from '@/lib/chapter-utils'

interface ReadingBubbleProps {
  // Chapter navigation
  chapters: { chapter_number: number; title: string }[]
  currentChapter: number
  currentIndex: number
  slug: string
  // Reading controls
  fontSize: number
  onFontSizeChange: (size: number) => void
  focusedMode: boolean
  onFocusedModeChange: (focused: boolean) => void
  annotationCount: number
  annotationKeyword: string
  onAnnotationKeywordChange: (keyword: string) => void
  matchingAnnotationCount: number
}

const MIN_FONT = 14
const MAX_FONT = 24

export default function ReadingBubble({
  chapters,
  currentChapter,
  currentIndex,
  slug,
  fontSize,
  onFontSizeChange,
  focusedMode,
  onFocusedModeChange,
  annotationCount,
  annotationKeyword,
  onAnnotationKeywordChange,
  matchingAnnotationCount,
}: ReadingBubbleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isDark: isDarkMode, toggle: toggleTheme } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Keyword filter state (with debounce)
  const [keywordInput, setKeywordInput] = useState(annotationKeyword)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Chapter navigation — group by Part, expand current part
  const currentPart = getPartNumber(currentChapter)
  const [expandedParts, setExpandedParts] = useState<Set<number>>(() => new Set([currentPart]))

  const togglePart = (part: number) => {
    setExpandedParts((prev) => {
      const next = new Set(prev)
      if (next.has(part)) {
        next.delete(part)
      } else {
        next.add(part)
      }
      return next
    })
  }

  // Group chapters by part
  const parts = new Map<number, typeof chapters>()
  for (const ch of chapters) {
    const part = getPartNumber(ch.chapter_number)
    if (!parts.has(part)) parts.set(part, [])
    parts.get(part)!.push(ch)
  }

  // Keyword filter with debounce
  const handleKeywordChange = useCallback((value: string) => {
    setKeywordInput(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => {
      onAnnotationKeywordChange(value)
    }, 300)
    setDebounceTimer(timer)
  }, [debounceTimer, onAnnotationKeywordChange])

  const clearKeyword = useCallback(() => {
    setKeywordInput('')
    onAnnotationKeywordChange('')
  }, [onAnnotationKeywordChange])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    // Slight delay to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const { label: currentLabel } = getChapterLabel(currentChapter)
  const progressPercent = chapters.length > 1
    ? Math.round((currentIndex / (chapters.length - 1)) * 100)
    : 0

  // Show keyword filter when there are annotations and we're not in focused mode
  const showKeywordFilter = annotationCount > 0 && !focusedMode

  return (
    <>
      {/* Floating trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-11 h-11 rounded-full shadow-lg flex items-center justify-center btn-transition"
        style={{
          backgroundColor: isOpen ? 'var(--accent-purple)' : 'var(--bg-card)',
          border: `1px solid ${isOpen ? 'var(--accent-purple)' : 'var(--border-default)'}`,
          color: isOpen ? 'var(--text-inverse)' : 'var(--text-secondary)',
        }}
        title={isOpen ? 'Close reading panel' : 'Open reading panel'}
        aria-label={isOpen ? 'Close reading panel' : 'Open reading panel'}
        aria-expanded={isOpen}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </>
          )}
        </svg>
      </button>

      {/* Floating panel */}
      <div
        ref={panelRef}
        className="fixed bottom-[calc(5rem+0.75rem)] right-4 md:bottom-[calc(1.5rem+3.25rem)] md:right-6 z-50 w-72 rounded-xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transformOrigin: 'bottom right',
          transition: 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="dialog"
        aria-label="Reading controls and chapter navigation"
      >
        {/* Progress section */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-xs text-center mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {currentLabel} of {chapters.length} · Part {currentPart}
          </p>
          <div className="h-[3px] rounded-full" style={{ backgroundColor: 'var(--bg-soft)' }}>
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: 'var(--accent-purple)',
                width: `${progressPercent}%`,
                transition: 'width 300ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3" style={{ borderBottom: '1px solid var(--border-default)' }} />

        {/* Reading controls */}
        <div className="px-3 py-2 flex items-center justify-between gap-1">
          {/* Font size */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onFontSizeChange(Math.max(MIN_FONT, fontSize - 2))}
              disabled={fontSize <= MIN_FONT}
              className="w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
              style={{ color: 'var(--text-secondary)' }}
              title="Decrease font size"
              aria-label="Decrease font size"
            >
              A<span className="text-[9px]">-</span>
            </button>
            <span className="text-[11px] tabular-nums w-6 text-center" style={{ color: 'var(--text-secondary)' }} aria-live="polite">
              {fontSize}
            </span>
            <button
              onClick={() => onFontSizeChange(Math.min(MAX_FONT, fontSize + 2))}
              disabled={fontSize >= MAX_FONT}
              className="w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
              style={{ color: 'var(--text-secondary)' }}
              title="Increase font size"
              aria-label="Increase font size"
            >
              A<span className="text-[10px]">+</span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-4" style={{ backgroundColor: 'var(--border-default)' }} />

          {/* Dark mode */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-secondary)' }}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-4" style={{ backgroundColor: 'var(--border-default)' }} />

          {/* Focused mode */}
          <button
            onClick={() => onFocusedModeChange(!focusedMode)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: focusedMode ? 'var(--text-primary)' : 'transparent',
              color: focusedMode ? 'var(--bg-page)' : 'var(--text-secondary)',
            }}
            title={focusedMode ? 'Show annotations' : 'Hide annotations'}
            aria-label={focusedMode ? 'Show annotations' : 'Hide annotations for focused reading'}
            aria-pressed={focusedMode}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {focusedMode ? (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              ) : (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              )}
            </svg>
            {focusedMode ? 'Notes' : 'Focus'}
            {!focusedMode && annotationCount > 0 && (
              <span
                className="ml-0.5 px-1 py-0.5 rounded-full text-[9px]"
                style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-primary)' }}
              >
                {annotationCount}
              </span>
            )}
          </button>
        </div>

        {/* Annotation keyword filter */}
        {showKeywordFilter && (
          <>
            <div className="mx-3" style={{ borderBottom: '1px solid var(--border-default)' }} />
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)', border: '1px solid var(--border-default)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter annotations…"
                  aria-label="Filter annotations by keyword"
                  value={keywordInput}
                  onChange={(e) => handleKeywordChange(e.target.value)}
                  className="flex-1 bg-transparent text-xs outline-none min-w-0"
                  style={{ color: 'var(--text-primary)' }}
                />
                {keywordInput && (
                  <button
                    onClick={clearKeyword}
                    className="p-0.5 rounded hover:bg-black/5 transition-colors"
                    title="Clear filter"
                    aria-label="Clear filter"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              {keywordInput && (
                <p className="text-[10px] mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
                  {matchingAnnotationCount} of {annotationCount} annotations
                </p>
              )}
            </div>
          </>
        )}

        {/* Divider */}
        <div className="mx-3" style={{ borderBottom: '1px solid var(--border-default)' }} />

        {/* Chapter navigation — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          <p className="text-[10px] font-semibold tracking-wide mb-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>
            Chapters
          </p>
          <nav className="space-y-0.5" aria-label="Chapter navigation">
            {Array.from(parts.entries()).map(([partNum, partChapters]) => {
              const isExpanded = expandedParts.has(partNum)
              return (
                <div key={partNum}>
                  {/* Part header */}
                  <button
                    onClick={() => togglePart(partNum)}
                    className="w-full text-left px-1 py-1 text-[11px] font-medium rounded flex items-center gap-1 hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    title={partTitles[partNum]}
                  >
                    <span
                      className="transition-transform"
                      style={{
                        display: 'inline-block',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        fontSize: '8px',
                        transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    >
                      ▶
                    </span>
                    <span className="truncate">
                      Part {partNum}
                    </span>
                  </button>

                  {/* Chapter list within part */}
                  {isExpanded && (
                    <div className="ml-2.5 space-y-px">
                      {partChapters.map((ch) => {
                        const isCurrent = ch.chapter_number === currentChapter
                        return (
                          <Link
                            key={ch.chapter_number}
                            href={`/reading/${slug}/${ch.chapter_number}`}
                            className="block px-1.5 py-0.5 text-[11px] rounded truncate transition-colors"
                            style={{
                              color: isCurrent ? 'var(--accent-purple)' : 'var(--text-secondary)',
                              backgroundColor: isCurrent ? 'var(--bg-soft)' : 'transparent',
                              fontWeight: isCurrent ? 600 : 400,
                            }}
                            title={`${getChapterLabel(ch.chapter_number).shortLabel}: ${ch.title}`}
                          >
                            {getChapterLabel(ch.chapter_number).shortLabel}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
