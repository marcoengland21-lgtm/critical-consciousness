'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AccessibilityContextType {
  /** Global base font size in pixels (default 16) */
  fontSize: number
  setFontSize: (size: number) => void
  /** High contrast mode — stronger borders, brighter accents, higher contrast ratios */
  highContrast: boolean
  setHighContrast: (on: boolean) => void
  /** Dyslexia-friendly font (Lexend) with increased spacing */
  dyslexiaFont: boolean
  setDyslexiaFont: (on: boolean) => void
  /** Reading guide — word pacer that moves through text at configured WPM */
  readingGuide: boolean
  setReadingGuide: (on: boolean) => void
  /** Words per minute for reading guide pacer (default 200) */
  readingGuideWpm: number
  setReadingGuideWpm: (wpm: number) => void
  /** Whether the reading guide pacer is currently advancing */
  readingGuidePlaying: boolean
  setReadingGuidePlaying: (playing: boolean) => void
  /** Reading guide mode — cursor-driven (follows mouse) or auto (timer-driven) */
  readingGuideMode: 'cursor' | 'auto'
  setReadingGuideMode: (mode: 'cursor' | 'auto') => void
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  fontSize: 16,
  setFontSize: () => {},
  highContrast: false,
  setHighContrast: () => {},
  dyslexiaFont: false,
  setDyslexiaFont: () => {},
  readingGuide: false,
  setReadingGuide: () => {},
  readingGuideWpm: 200,
  setReadingGuideWpm: () => {},
  readingGuidePlaying: false,
  setReadingGuidePlaying: () => {},
  readingGuideMode: 'cursor',
  setReadingGuideMode: () => {},
})

export function useAccessibility() {
  return useContext(AccessibilityContext)
}

// localStorage keys
const KEYS = {
  fontSize: 'ccp-global-font-size',
  highContrast: 'ccp-high-contrast',
  dyslexiaFont: 'ccp-dyslexia-font',
  readingGuide: 'ccp-reading-guide',
  readingGuideWpm: 'ccp-reading-guide-wpm',
  readingGuideMode: 'ccp-reading-guide-mode',
} as const

export default function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // Initialize with defaults — useEffect syncs from localStorage on mount
  const [fontSize, setFontSizeState] = useState(16)
  const [highContrast, setHighContrastState] = useState(false)
  const [dyslexiaFont, setDyslexiaFontState] = useState(false)
  const [readingGuide, setReadingGuideState] = useState(false)
  const [readingGuideWpm, setReadingGuideWpmState] = useState(200)
  const [readingGuidePlaying, setReadingGuidePlayingState] = useState(false)
  const [readingGuideMode, setReadingGuideModeState] = useState<'cursor' | 'auto'>('cursor')

  // ── Sync from localStorage on mount ──
  useEffect(() => {
    const savedSize = localStorage.getItem(KEYS.fontSize)
    if (savedSize) {
      const size = parseInt(savedSize, 10)
      if (!isNaN(size) && size >= 12 && size <= 30) {
        setFontSizeState(size)
        // Set multiplier (not raw px) — only content text scales, not layout
        document.documentElement.style.setProperty('--text-size-multiplier', String(size / 16))
      }
    }

    const savedContrast = localStorage.getItem(KEYS.highContrast)
    if (savedContrast === 'true') {
      setHighContrastState(true)
      document.documentElement.setAttribute('data-high-contrast', 'true')
    }

    const savedDyslexia = localStorage.getItem(KEYS.dyslexiaFont)
    if (savedDyslexia === 'true') {
      setDyslexiaFontState(true)
      document.documentElement.setAttribute('data-dyslexia-font', 'true')
    }

    const savedGuide = localStorage.getItem(KEYS.readingGuide)
    if (savedGuide === 'true') {
      setReadingGuideState(true)
    }

    const savedWpm = localStorage.getItem(KEYS.readingGuideWpm)
    if (savedWpm) {
      const wpm = parseInt(savedWpm, 10)
      if (!isNaN(wpm) && wpm >= 80 && wpm <= 500) {
        setReadingGuideWpmState(wpm)
      }
    }

    const savedMode = localStorage.getItem(KEYS.readingGuideMode)
    if (savedMode === 'cursor' || savedMode === 'auto') {
      setReadingGuideModeState(savedMode)
    }
  }, [])

  // ── Setters that sync to DOM + localStorage ──
  const setFontSize = useCallback((size: number) => {
    const clamped = Math.max(12, Math.min(30, size))
    setFontSizeState(clamped)
    // Set multiplier (not raw px) — only content text scales, not layout
    document.documentElement.style.setProperty('--text-size-multiplier', String(clamped / 16))
    localStorage.setItem(KEYS.fontSize, String(clamped))
  }, [])

  const setHighContrast = useCallback((on: boolean) => {
    setHighContrastState(on)
    if (on) {
      document.documentElement.setAttribute('data-high-contrast', 'true')
    } else {
      document.documentElement.removeAttribute('data-high-contrast')
    }
    localStorage.setItem(KEYS.highContrast, String(on))
  }, [])

  const setDyslexiaFont = useCallback((on: boolean) => {
    setDyslexiaFontState(on)
    if (on) {
      document.documentElement.setAttribute('data-dyslexia-font', 'true')
    } else {
      document.documentElement.removeAttribute('data-dyslexia-font')
    }
    localStorage.setItem(KEYS.dyslexiaFont, String(on))
  }, [])

  const setReadingGuide = useCallback((on: boolean) => {
    setReadingGuideState(on)
    if (!on) setReadingGuidePlayingState(false) // Stop pacing when guide disabled
    localStorage.setItem(KEYS.readingGuide, String(on))
  }, [])

  const setReadingGuideWpm = useCallback((wpm: number) => {
    const clamped = Math.max(80, Math.min(500, wpm))
    setReadingGuideWpmState(clamped)
    localStorage.setItem(KEYS.readingGuideWpm, String(clamped))
  }, [])

  const setReadingGuidePlaying = useCallback((playing: boolean) => {
    setReadingGuidePlayingState(playing)
  }, [])

  const setReadingGuideMode = useCallback((mode: 'cursor' | 'auto') => {
    setReadingGuideModeState(mode)
    if (mode === 'cursor') setReadingGuidePlayingState(false) // Stop auto-play when switching to cursor
    localStorage.setItem(KEYS.readingGuideMode, mode)
  }, [])

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        dyslexiaFont,
        setDyslexiaFont,
        readingGuide,
        setReadingGuide,
        readingGuideWpm,
        setReadingGuideWpm,
        readingGuidePlaying,
        setReadingGuidePlaying,
        readingGuideMode,
        setReadingGuideMode,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}
