'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/layout/ThemeProvider'
import { getChapterLabel, getPartNumber, partTitles } from '@/lib/chapter-utils'

interface ReadingToolbarProps {
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

export default function ReadingToolbar({
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
}: ReadingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showChapterNav, setShowChapterNav] = useState(false)
  const { isDark: isDarkMode, toggle: toggleTheme } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)

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

  // Prev/next chapter
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case 'ArrowLeft':
          if (prevChapter) {
            window.location.href = `/reading/${slug}/${prevChapter.chapter_number}`
          }
          break
        case 'ArrowRight':
          if (nextChapter) {
            window.location.href = `/reading/${slug}/${nextChapter.chapter_number}`
          }
          break
        case 'f':
          e.preventDefault()
          onFocusedModeChange(!focusedMode)
          break
        case 'Escape':
          if (showChapterNav) {
            setShowChapterNav(false)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [prevChapter, nextChapter, slug, focusedMode, onFocusedModeChange, showChapterNav])

  // Click outside chapter nav panel to close
  useEffect(() => {
    if (!showChapterNav) return
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        pillRef.current && !pillRef.current.contains(e.target as Node)
      ) {
        setShowChapterNav(false)
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showChapterNav])

  const { shortLabel } = getChapterLabel(currentChapter)
  const showKeywordFilter = annotationCount > 0 && !focusedMode

  return (
    <>
      {/* Chapter navigation panel — floats above the pill */}
      <div
        ref={panelRef}
        className="fixed z-50 w-72 rounded-xl shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          right: '1rem',
          bottom: isExpanded ? 'calc(5rem + 52px)' : 'calc(5rem + 44px)',
          opacity: showChapterNav ? 1 : 0,
          transform: showChapterNav ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(8px)',
          pointerEvents: showChapterNav ? 'auto' : 'none',
          transformOrigin: 'bottom right',
          transition: 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
          maxHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="dialog"
        aria-label="Chapter navigation"
      >
        {/* Annotation keyword filter */}
        {showKeywordFilter && (
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-default)' }}>
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
        )}

        {/* Divider */}
        {showKeywordFilter && (
          <div className="mx-3" style={{ borderBottom: '1px solid var(--border-default)' }} />
        )}

        {/* Chapter list — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          <p className="text-[10px] font-semibold tracking-wide mb-1.5 px-1" style={{ color: 'var(--text-secondary)' }}>
            Chapters
          </p>
          <nav className="space-y-0.5" aria-label="Chapter navigation">
            {Array.from(parts.entries()).map(([partNum, partChapters]) => {
              const isPartExpanded = expandedParts.has(partNum)
              return (
                <div key={partNum}>
                  <button
                    onClick={() => togglePart(partNum)}
                    className="w-full text-left px-1 py-1 text-[11px] font-medium rounded flex items-center gap-1 hover:bg-black/5 transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    title={partTitles[partNum]}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        transform: isPartExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        fontSize: '8px',
                        transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    >
                      ▶
                    </span>
                    <span className="truncate">
                      Part {partNum}: {partTitles[partNum]}
                    </span>
                  </button>

                  {isPartExpanded && (
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
                            {getChapterLabel(ch.chapter_number).shortLabel}: {ch.title}
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

      {/* The floating pill */}
      <div
        ref={pillRef}
        className="fixed z-40"
        style={{
          right: '1rem',
          bottom: '5rem',
          transition: 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {isExpanded ? (
          /* ── Expanded pill ── */
          <div
            className="flex items-center gap-0.5 px-2 rounded-full shadow-lg"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              height: '44px',
            }}
          >
            {/* Collapse button */}
            <button
              onClick={() => {
                setIsExpanded(false)
                setShowChapterNav(false)
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
              style={{ color: 'var(--text-secondary)' }}
              title="Collapse toolbar"
              aria-label="Collapse toolbar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Divider */}
            <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-default)' }} />

            {/* Font size controls */}
            <button
              onClick={() => onFontSizeChange(Math.max(MIN_FONT, fontSize - 2))}
              disabled={fontSize <= MIN_FONT}
              className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
              style={{ color: 'var(--text-secondary)' }}
              title="Decrease font size"
              aria-label="Decrease font size"
            >
              A<span className="text-[9px]">−</span>
            </button>
            <button
              onClick={() => onFontSizeChange(Math.min(MAX_FONT, fontSize + 2))}
              disabled={fontSize >= MAX_FONT}
              className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
              style={{ color: 'var(--text-secondary)' }}
              title="Increase font size"
              aria-label="Increase font size"
            >
              A<span className="text-[10px]">+</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
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

            {/* Focus mode */}
            <button
              onClick={() => onFocusedModeChange(!focusedMode)}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
              style={{
                backgroundColor: focusedMode ? 'var(--text-primary)' : 'transparent',
                color: focusedMode ? 'var(--bg-page)' : 'var(--text-secondary)',
              }}
              title={focusedMode ? 'Show annotations (f)' : 'Hide annotations (f)'}
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
            </button>

            {/* Divider */}
            <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-default)' }} />

            {/* Prev chapter */}
            {prevChapter ? (
              <Link
                href={`/reading/${slug}/${prevChapter.chapter_number}`}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
                style={{ color: 'var(--text-secondary)' }}
                title={`Previous: ${getChapterLabel(prevChapter.chapter_number).label} (←)`}
                aria-label={`Previous: ${getChapterLabel(prevChapter.chapter_number).label}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
            ) : (
              <span className="w-7 h-7 flex items-center justify-center opacity-20" style={{ color: 'var(--text-secondary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </span>
            )}

            {/* Current position — clickable to open chapter nav */}
            <button
              onClick={() => setShowChapterNav(!showChapterNav)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:bg-black/5"
              style={{
                color: showChapterNav ? 'var(--accent-purple)' : 'var(--text-primary)',
              }}
              title="Browse all chapters"
              aria-label="Browse all chapters"
              aria-expanded={showChapterNav}
            >
              <span className="tabular-nums whitespace-nowrap">{shortLabel}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: showChapterNav ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>

            {/* Next chapter */}
            {nextChapter ? (
              <Link
                href={`/reading/${slug}/${nextChapter.chapter_number}`}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
                style={{ color: 'var(--text-secondary)' }}
                title={`Next: ${getChapterLabel(nextChapter.chapter_number).label} (→)`}
                aria-label={`Next: ${getChapterLabel(nextChapter.chapter_number).label}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ) : (
              <span className="w-7 h-7 flex items-center justify-center opacity-20" style={{ color: 'var(--text-secondary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            )}

            {/* Annotation count badge */}
            {!focusedMode && annotationCount > 0 && (
              <>
                <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-default)' }} />
                <span
                  className="flex items-center gap-1 px-1.5 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                  title={`${annotationCount} annotation${annotationCount !== 1 ? 's' : ''}`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span className="tabular-nums">{annotationCount}</span>
                </span>
              </>
            )}
          </div>
        ) : (
          /* ── Collapsed pill ── */
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-3 rounded-full shadow-lg transition-colors hover:bg-black/5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              height: '36px',
              color: 'var(--text-secondary)',
            }}
            title="Show reading toolbar"
            aria-label="Show reading toolbar"
          >
            <span className="text-xs font-medium tabular-nums">{shortLabel}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
      </div>
    </>
  )
}
