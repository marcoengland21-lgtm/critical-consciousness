'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AccessibilityContextType {
  /** Global base font size in pixels (default 16) */
  fontSize: number
  setFontSize: (size: number) => void
  /** High contrast mode — stronger borders, darker text, higher contrast ratios */
  highContrast: boolean
  setHighContrast: (on: boolean) => void
  /** Dyslexia-friendly font (Lexend) with increased spacing */
  dyslexiaFont: boolean
  setDyslexiaFont: (on: boolean) => void
  /** Reading guide overlay — semi-transparent ruler that follows cursor */
  readingGuide: boolean
  setReadingGuide: (on: boolean) => void
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
} as const

export default function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // Initialize with defaults — useEffect syncs from localStorage on mount
  const [fontSize, setFontSizeState] = useState(16)
  const [highContrast, setHighContrastState] = useState(false)
  const [dyslexiaFont, setDyslexiaFontState] = useState(false)
  const [readingGuide, setReadingGuideState] = useState(false)

  // ── Sync from localStorage on mount ──
  useEffect(() => {
    const savedSize = localStorage.getItem(KEYS.fontSize)
    if (savedSize) {
      const size = parseInt(savedSize, 10)
      if (!isNaN(size) && size >= 12 && size <= 30) {
        setFontSizeState(size)
        document.documentElement.style.setProperty('--global-font-size', `${size}px`)
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
  }, [])

  // ── Setters that sync to DOM + localStorage ──
  const setFontSize = useCallback((size: number) => {
    const clamped = Math.max(12, Math.min(30, size))
    setFontSizeState(clamped)
    document.documentElement.style.setProperty('--global-font-size', `${clamped}px`)
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
    localStorage.setItem(KEYS.readingGuide, String(on))
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
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}
