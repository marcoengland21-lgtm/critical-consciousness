'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggle: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from DOM (set by ThemeInitializer before hydration)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark'
    }
    return false
  })

  // Sync if the attribute was set after initial render (edge case)
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark'
    if (current !== isDark) {
      setIsDark(current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for storage events (cross-tab sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ccp-theme') {
        const newIsDark = e.newValue === 'dark'
        setIsDark(newIsDark)
        if (newIsDark) {
          document.documentElement.setAttribute('data-theme', 'dark')
        } else {
          document.documentElement.removeAttribute('data-theme')
        }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggle = useCallback(() => {
    const next = isDark ? 'light' : 'dark'
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('ccp-theme', next)
    setIsDark(!isDark)
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
