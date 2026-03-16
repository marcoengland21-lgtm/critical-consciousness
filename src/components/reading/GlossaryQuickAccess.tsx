'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import type { GlossaryTerm } from '@/lib/glossary-utils'

interface GlossaryQuickAccessProps {
  terms: GlossaryTerm[]
  onTermClick: (term: string, definition: string) => void
  onClose: () => void
}

/**
 * Glossary Quick-Access Side Panel
 *
 * Slides in from the left to show all glossary terms found in the current chapter.
 * Lets the reader see which words have definitions without cluttering the text.
 *
 * Positioned opposite the AnnotationPanel (which slides from right) to avoid conflict.
 * Hidden in focused mode (parent handles this).
 */
export default function GlossaryQuickAccess({ terms, onTermClick, onClose }: GlossaryQuickAccessProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Small delay so the click that opened the panel doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <>
      {/* Backdrop — very subtle, just enough to show it's a panel */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.08)' }}
        aria-hidden="true"
      />

      {/* Panel — left side on desktop, full-width bottom on mobile */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Glossary terms in this chapter"
        aria-modal="true"
        className="fixed left-0 top-0 h-full w-full sm:w-80 z-50 overflow-hidden animate-slide-in-left flex flex-col"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Glossary Terms
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {terms.length} term{terms.length !== 1 ? 's' : ''} in this chapter
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close glossary panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Term list */}
        <div className="flex-1 overflow-y-auto">
          {terms.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {terms.map((term) => (
                <button
                  key={term.id}
                  onClick={() => onTermClick(term.term, term.definition)}
                  className="w-full text-left px-5 py-3 transition-colors"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-purple)' }}>
                    {term.term}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {term.definition.length > 120
                      ? term.definition.slice(0, 120) + '...'
                      : term.definition}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-5">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                No glossary terms found in this chapter yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                As the group adds terms to the glossary, they&apos;ll appear here when referenced in the text.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <Link
            href="/glossary"
            onClick={onClose}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--accent-purple)' }}
          >
            Browse Full Glossary →
          </Link>
        </div>
      </div>
    </>
  )
}
