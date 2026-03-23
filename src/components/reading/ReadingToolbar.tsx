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
  // Glossary
  glossaryTermCount: number
  showGlossaryPanel: boolean
  onGlossaryPanelToggle: () => void
  // Panel visibility (controlled by parent)
  isOpen: boolean
  onClose: () => void
  // Audio
  audioAlignment?: { reader_name?: string; audio_duration?: number } | null
  audioIsPlaying?: boolean
  onAudioToggle?: () => void
}

const MIN_FONT = 14
const MAX_FONT = 30

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
  glossaryTermCount,
  showGlossaryPanel,
  onGlossaryPanelToggle,
  isOpen,
  onClose,
  audioAlignment,
  audioIsPlaying,
  onAudioToggle,
}: ReadingToolbarProps) {
  const { isDark: isDarkMode, toggle: toggleTheme } = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Keyword filter with debounce
  const [keywordInput, setKeywordInput] = useState(annotationKeyword)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const handleKeywordChange = useCallback((value: string) => {
    setKeywordInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onAnnotationKeywordChange(value)
    }, 300)
  }, [onAnnotationKeywordChange])

  // Prev/next chapter
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  // Ch1 section tabs (chapter_number 1-4)
  const isChapter1 = currentChapter >= 1 && currentChapter <= 4
  const ch1Sections = isChapter1 ? chapters.filter(c => c.chapter_number >= 1 && c.chapter_number <= 4) : []

  // Current position label
  const currentLabel = getChapterLabel(currentChapter).label
  const totalChapters = chapters.length

  // Format audio duration
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowLeft':
          if (prevChapter) window.location.href = `/reading/${slug}/${prevChapter.chapter_number}`
          break
        case 'ArrowRight':
          if (nextChapter) window.location.href = `/reading/${slug}/${nextChapter.chapter_number}`
          break
        case 'f':
          onFocusedModeChange(!focusedMode)
          break
        case 'g':
          if (!focusedMode && glossaryTermCount > 0) onGlossaryPanelToggle()
          break
        case '?':
          setShowShortcuts(prev => !prev)
          break
        case 'Escape':
          if (showShortcuts) setShowShortcuts(false)
          else if (isOpen) onClose()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prevChapter, nextChapter, slug, focusedMode, onFocusedModeChange, glossaryTermCount, onGlossaryPanelToggle, isOpen, onClose, showShortcuts])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
        onClick={onClose}
      />

      {/* Slide-in panel from right */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full sm:w-80 z-50 overflow-y-auto animate-slide-in-right"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Reading Tools
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close tools panel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">

          {/* ── Chapter Navigation ── */}
          <section>
            <h3 className="text-xs font-semibold tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
              Chapter Navigation
            </h3>
            <div className="space-y-2">
              {prevChapter && (
                <Link
                  href={`/reading/${slug}/${prevChapter.chapter_number}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-sm"
                  style={{
                    backgroundColor: 'var(--bg-soft)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>←</span>
                  <span className="truncate">{prevChapter.title}</span>
                </Link>
              )}
              {nextChapter && (
                <Link
                  href={`/reading/${slug}/${nextChapter.chapter_number}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-sm"
                  style={{
                    backgroundColor: 'var(--bg-soft)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>→</span>
                  <span className="truncate">{nextChapter.title}</span>
                </Link>
              )}
            </div>

            {/* Section jump (Ch1 only) */}
            {isChapter1 && ch1Sections.length > 1 && (
              <div className="mt-3">
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Jump to section:
                </p>
                <div className="flex gap-1.5">
                  {ch1Sections.map((s) => (
                    <Link
                      key={s.chapter_number}
                      href={`/reading/${slug}/${s.chapter_number}`}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: s.chapter_number === currentChapter ? 'var(--accent-purple)' : 'var(--bg-soft)',
                        color: s.chapter_number === currentChapter ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      }}
                    >
                      {s.chapter_number}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-default)' }} />

          {/* ── Text Size ── */}
          <section>
            <h3 className="text-xs font-semibold tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
              Text Size
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onFontSizeChange(Math.max(MIN_FONT, fontSize - 1))}
                disabled={fontSize <= MIN_FONT}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                style={{
                  backgroundColor: 'var(--bg-soft)',
                  color: 'var(--text-primary)',
                }}
                aria-label="Decrease font size"
              >
                A−
              </button>
              <span className="text-sm tabular-nums min-w-[2.5rem] text-center" style={{ color: 'var(--text-secondary)' }}>
                {fontSize}px
              </span>
              <button
                onClick={() => onFontSizeChange(Math.min(MAX_FONT, fontSize + 1))}
                disabled={fontSize >= MAX_FONT}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
                style={{
                  backgroundColor: 'var(--bg-soft)',
                  color: 'var(--text-primary)',
                }}
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </section>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-default)' }} />

          {/* ── Appearance ── */}
          <section>
            <h3 className="text-xs font-semibold tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
              Appearance
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => { if (isDarkMode) toggleTheme() }}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: !isDarkMode ? 'var(--accent-purple)' : 'var(--bg-soft)',
                  color: !isDarkMode ? 'var(--text-inverse)' : 'var(--text-secondary)',
                }}
              >
                Light
              </button>
              <button
                onClick={() => { if (!isDarkMode) toggleTheme() }}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isDarkMode ? 'var(--accent-purple)' : 'var(--bg-soft)',
                  color: isDarkMode ? 'var(--text-inverse)' : 'var(--text-secondary)',
                }}
              >
                Dark
              </button>
            </div>
            <button
              onClick={() => onFocusedModeChange(!focusedMode)}
              className="w-full mt-2 flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: focusedMode ? 'var(--accent-purple)' : 'var(--bg-soft)',
                color: focusedMode ? 'var(--text-inverse)' : 'var(--text-primary)',
              }}
            >
              <span>Focus mode</span>
              <span className="text-xs opacity-70">{focusedMode ? 'On' : 'Off'}</span>
            </button>
          </section>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-default)' }} />

          {/* ── Annotations ── */}
          {!focusedMode && (
            <section>
              <h3 className="text-xs font-semibold tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
                Annotations
              </h3>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                {annotationCount} {annotationCount === 1 ? 'annotation' : 'annotations'} on this chapter
              </p>
              {annotationCount > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => handleKeywordChange(e.target.value)}
                    placeholder="Filter by keyword..."
                    className="w-full input-base text-sm pl-8"
                  />
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)', opacity: 0.5 }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {keywordInput && (
                    <button
                      onClick={() => { setKeywordInput(''); onAnnotationKeywordChange('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      ✕ {matchingAnnotationCount} match{matchingAnnotationCount !== 1 ? 'es' : ''}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Glossary ── */}
          {!focusedMode && glossaryTermCount > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--border-default)' }} />
              <section>
                <h3 className="text-xs font-semibold tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
                  Glossary
                </h3>
                <button
                  onClick={() => {
                    onGlossaryPanelToggle()
                    onClose()
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor: showGlossaryPanel ? 'var(--accent-purple)' : 'var(--bg-soft)',
                    color: showGlossaryPanel ? 'var(--text-inverse)' : 'var(--text-primary)',
                  }}
                >
                  <span>Look up a term</span>
                  <span className="text-xs opacity-70">{glossaryTermCount} terms</span>
                </button>
              </section>
            </>
          )}

          {/* ── Audio ── */}
          {audioAlignment && (
            <>
              <div style={{ borderTop: '1px solid var(--border-default)' }} />
              <section>
                <h3 className="text-xs font-semibold tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
                  Audio
                </h3>
                <div
                  className="px-3 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'var(--bg-soft)' }}
                >
                  <p style={{ color: 'var(--text-primary)' }}>
                    Listen to this chapter
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {audioAlignment.audio_duration ? formatDuration(audioAlignment.audio_duration) : ''} · Read by {audioAlignment.reader_name || 'LibriVox'}
                  </p>
                  {onAudioToggle && (
                    <button
                      onClick={() => {
                        onAudioToggle()
                        onClose()
                      }}
                      className="mt-2 btn-primary text-xs px-4 py-1.5"
                    >
                      {audioIsPlaying ? 'Pause' : 'Play'}
                    </button>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-default)' }} />

          {/* ── Position ── */}
          <section>
            <h3 className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--accent-purple)' }}>
              Your Position
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {currentLabel}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
              {currentIndex + 1} of {totalChapters} sections
            </p>
          </section>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-default)' }} />

          {/* ── Keyboard Shortcuts ── */}
          <section>
            <button
              onClick={() => setShowShortcuts(prev => !prev)}
              className="w-full flex items-center justify-between text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>Keyboard shortcuts</span>
              <span>{showShortcuts ? '▾' : '▸'}</span>
            </button>
            {showShortcuts && (
              <div className="mt-2 space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex justify-between"><span>Previous chapter</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)' }}>←</kbd></div>
                <div className="flex justify-between"><span>Next chapter</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)' }}>→</kbd></div>
                <div className="flex justify-between"><span>Focus mode</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)' }}>f</kbd></div>
                <div className="flex justify-between"><span>Glossary</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)' }}>g</kbd></div>
                <div className="flex justify-between"><span>Shortcuts</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)' }}>?</kbd></div>
                <div className="flex justify-between"><span>Close panel</span><kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)' }}>Esc</kbd></div>
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
