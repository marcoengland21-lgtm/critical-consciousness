'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { GlossaryTermWithCount } from '@/lib/glossary-utils'

interface GlossaryQuickAccessProps {
  terms: GlossaryTermWithCount[]
  onTermClick: (term: string, definition: string) => void
  onClose: () => void
}

/**
 * Glossary Quick-Access Side Panel
 *
 * A richer panel that slides from the left showing all glossary terms found
 * in the current chapter. Features:
 * - Search/filter input
 * - Alphabetical letter grouping with sticky headers
 * - Occurrence counts (how many times each term appears in the chapter)
 * - Visual density indicators for frequently-appearing terms
 *
 * Positioned opposite the AnnotationPanel (which slides from right) to avoid conflict.
 * Hidden in focused mode (parent handles this).
 */
export default function GlossaryQuickAccess({ terms, onTermClick, onClose }: GlossaryQuickAccessProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  // Auto-focus search on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 300) // Wait for slide-in animation
    return () => clearTimeout(timer)
  }, [])

  // Filter and group terms
  const { filteredTerms, letterGroups, totalOccurrences } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    const filtered = query
      ? terms.filter((t) =>
          t.term.toLowerCase().includes(query) ||
          t.definition.toLowerCase().includes(query)
        )
      : terms

    // Group by first letter
    const groups = new Map<string, GlossaryTermWithCount[]>()
    let total = 0
    for (const term of filtered) {
      const letter = term.term[0].toUpperCase()
      if (!groups.has(letter)) groups.set(letter, [])
      groups.get(letter)!.push(term)
      total += term.occurrences
    }

    return { filteredTerms: filtered, letterGroups: groups, totalOccurrences: total }
  }, [terms, searchQuery])

  // Sort letters alphabetically
  const sortedLetters = Array.from(letterGroups.keys()).sort()

  // Quick-jump letter bar — only letters that have terms
  const allLetters = useMemo(() => {
    const letters = new Set<string>()
    for (const term of terms) {
      letters.add(term.term[0].toUpperCase())
    }
    return Array.from(letters).sort()
  }, [terms])

  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(`glossary-letter-${letter}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      {/* Backdrop — very subtle, just enough to show it's a panel */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.08)' }}
        aria-hidden="true"
      />

      {/* Panel — left side on desktop, full-width on mobile */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Glossary terms in this chapter"
        aria-modal="true"
        className="fixed left-0 top-0 h-full w-full sm:w-96 z-50 overflow-hidden animate-slide-in-left flex flex-col"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRight: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 py-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Glossary Terms
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {terms.length} term{terms.length !== 1 ? 's' : ''} found in this chapter
                {totalOccurrences > terms.length && (
                  <span> · {totalOccurrences} total mentions</span>
                )}
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

          {/* Search input */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-page)',
              border: '1px solid var(--border-default)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search terms or definitions..."
              aria-label="Filter glossary terms"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none min-w-0"
              style={{ color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-0.5 rounded transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-secondary)' }}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Search result count */}
          {searchQuery && (
            <p className="text-[11px] mt-1.5 text-center" style={{ color: 'var(--text-secondary)' }}>
              {filteredTerms.length} of {terms.length} term{terms.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </div>

        {/* Letter quick-jump bar — only shown when not searching and enough terms */}
        {!searchQuery && allLetters.length > 3 && (
          <div
            className="flex items-center gap-0.5 px-5 py-2 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-card-alt)' }}
          >
            {allLetters.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold transition-colors"
                style={{ color: 'var(--accent-purple)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-soft)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }}
                aria-label={`Jump to terms starting with ${letter}`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* Term list with letter grouping */}
        <div className="flex-1 overflow-y-auto">
          {filteredTerms.length > 0 ? (
            <div>
              {sortedLetters.map((letter) => {
                const groupTerms = letterGroups.get(letter)!
                return (
                  <div key={letter}>
                    {/* Letter header — sticky within scroll */}
                    <div
                      id={`glossary-letter-${letter}`}
                      className="sticky top-0 z-[5] px-5 py-1.5 flex items-center gap-2"
                      style={{
                        backgroundColor: 'var(--bg-card-alt)',
                        borderBottom: '1px solid var(--border-default)',
                      }}
                    >
                      <span
                        className="w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold"
                        style={{
                          backgroundColor: 'var(--accent-purple)',
                          color: 'var(--text-inverse)',
                        }}
                      >
                        {letter}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {groupTerms.length} term{groupTerms.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Terms in this letter group */}
                    {groupTerms.map((term) => (
                      <button
                        key={term.id}
                        onClick={() => onTermClick(term.term, term.definition)}
                        className="w-full text-left px-5 py-3 transition-colors"
                        style={{ borderBottom: '1px solid var(--border-default)' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--accent-purple)' }}>
                              {term.term}
                            </p>
                            <p
                              className="text-xs mt-0.5"
                              style={{
                                color: 'var(--text-secondary)',
                                lineHeight: '1.6',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {term.definition}
                            </p>
                          </div>

                          {/* Occurrence count badge */}
                          <div className="flex-shrink-0 mt-0.5">
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                backgroundColor: term.occurrences >= 10
                                  ? 'rgba(var(--accent-purple-rgb), 0.15)'
                                  : term.occurrences >= 5
                                    ? 'rgba(var(--accent-purple-rgb), 0.08)'
                                    : 'var(--bg-soft)',
                                color: term.occurrences >= 5
                                  ? 'var(--accent-purple)'
                                  : 'var(--text-secondary)',
                              }}
                              title={`Appears ${term.occurrences} time${term.occurrences !== 1 ? 's' : ''} in this chapter`}
                            >
                              {term.occurrences > 1 && (
                                <>
                                  <span style={{ fontSize: '8px' }}>×</span>
                                  {term.occurrences}
                                </>
                              )}
                              {term.occurrences === 1 && '1×'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12 px-5">
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                No matches for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Try a different search term, or browse the full glossary for all definitions.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-medium mt-3 transition-colors"
                style={{ color: 'var(--accent-purple)' }}
              >
                Clear search
              </button>
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

        {/* Footer — summary + link */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-card-alt)' }}
        >
          {/* Tip text */}
          <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Click any term to see its full definition
          </p>
          <Link
            href="/glossary"
            onClick={onClose}
            className="text-xs font-medium transition-colors"
            style={{ color: 'var(--accent-purple)' }}
          >
            Full Glossary →
          </Link>
        </div>
      </div>
    </>
  )
}
