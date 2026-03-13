'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  fontSize: number
  onFontSizeChange: (size: number) => void
  focusedMode: boolean
  onFocusedModeChange: (focused: boolean) => void
  annotationCount: number
  annotationKeyword?: string
  onAnnotationKeywordChange?: (keyword: string) => void
  matchingAnnotationCount?: number
}

const MIN_FONT = 14
const MAX_FONT = 24

export default function ReadingControls({
  fontSize,
  onFontSizeChange,
  focusedMode,
  onFocusedModeChange,
  annotationCount,
  annotationKeyword = '',
  onAnnotationKeywordChange,
  matchingAnnotationCount = 0,
}: Props) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [keywordInput, setKeywordInput] = useState(annotationKeyword)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    setIsDarkMode(isDark)
  }, [])

  const handleKeywordChange = useCallback((value: string) => {
    setKeywordInput(value)

    // Debounce the callback
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      onAnnotationKeywordChange?.(value)
    }, 300)

    setDebounceTimer(timer)
  }, [debounceTimer, onAnnotationKeywordChange])

  const clearKeyword = useCallback(() => {
    setKeywordInput('')
    onAnnotationKeywordChange?.('')
  }, [onAnnotationKeywordChange])

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('ccp-theme', newTheme)
    setIsDarkMode(!isDarkMode)
  }
  return (
    <div>
      {/* Annotation keyword filter — shown above controls when there are annotations */}
      {annotationCount > 0 && (
        <div className="mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)', border: '1px solid var(--border-default)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-warm-gray)' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Filter annotations by keyword…"
                value={keywordInput}
                onChange={(e) => handleKeywordChange(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--color-dark-brown)' }}
              />
              {keywordInput && (
                <button
                  onClick={clearKeyword}
                  className="p-1 rounded hover:bg-black/5 transition-colors"
                  title="Clear filter"
                  aria-label="Clear filter"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-warm-gray)' }}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            {keywordInput && (
              <span className="text-xs font-medium px-2 py-1 rounded" style={{ color: 'var(--color-warm-gray)', backgroundColor: 'var(--bg-card-alt)' }}>
                {matchingAnnotationCount} of {annotationCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main controls */}
      <div
        className="flex items-center justify-end gap-3 mb-4 pb-3 border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        {/* Font size controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFontSizeChange(Math.max(MIN_FONT, fontSize - 2))}
          disabled={fontSize <= MIN_FONT}
          className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
          style={{ color: 'var(--color-warm-gray)' }}
          title="Decrease font size"
          aria-label="Decrease font size"
        >
          A<span className="text-[10px]">-</span>
        </button>
        <span className="text-xs tabular-nums w-8 text-center" style={{ color: 'var(--color-warm-gray)' }}>
          {fontSize}
        </span>
        <button
          onClick={() => onFontSizeChange(Math.min(MAX_FONT, fontSize + 2))}
          disabled={fontSize >= MAX_FONT}
          className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
          style={{ color: 'var(--color-warm-gray)' }}
          title="Increase font size"
          aria-label="Increase font size"
        >
          A<span className="text-xs">+</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-4" style={{ backgroundColor: 'var(--border-default)' }} />

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors hover:bg-black/5"
        style={{ color: 'var(--color-warm-gray)' }}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
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

      {/* Focused mode toggle */}
      <button
        onClick={() => onFocusedModeChange(!focusedMode)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: focusedMode ? 'var(--color-dark-brown)' : 'transparent',
          color: focusedMode ? 'var(--color-warm-cream)' : 'var(--color-warm-gray)',
        }}
        title={focusedMode ? 'Show annotations' : 'Hide annotations for focused reading'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {focusedMode ? 'Show notes' : 'Focus'}
        {!focusedMode && annotationCount > 0 && (
          <span
            className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]"
            style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--color-dark-brown)' }}
          >
            {annotationCount}
          </span>
        )}
      </button>
    </div>
    </div>
  )
}
