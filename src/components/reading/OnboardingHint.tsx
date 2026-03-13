'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ccp-onboarding-hint-dismissed'

export default function OnboardingHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if not previously dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setVisible(true)
    }
  }, [])

  function handleDismiss() {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!visible) return null

  return (
    <div
      className="mb-6 px-4 py-3 rounded-lg border flex items-start gap-3 animate-fade-in"
      style={{
        backgroundColor: 'rgba(107, 76, 154, 0.08)',
        borderColor: 'var(--accent-purple)',
      }}
    >
      {/* Highlight icon */}
      <span className="flex-shrink-0 mt-0.5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Highlight any passage to leave a note
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Select text to annotate it or start a discussion thread. Your annotations are visible to the whole group.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-full transition-colors hover:bg-black/5"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Dismiss hint"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
