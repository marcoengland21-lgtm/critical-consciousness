'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { PrivateNote } from '@/types/database'

interface JournalSearchableListProps {
  initialEntries: Pick<PrivateNote, 'id' | 'title' | 'body' | 'word_count' | 'created_at' | 'updated_at'>[]
  initialQuery: string
}

const SEARCH_DEBOUNCE_MS = 250

/**
 * JournalSearchableList — search field + chronological-reverse list of the
 * user's journal entries.
 *
 * Search is server-side (Postgres full-text via tsv generated column). The
 * client typing a new query updates the URL `?q=...`, which the server-
 * component page picks up and re-fetches. Debounced so a fast typist
 * doesn't fire a query per keystroke.
 */
export default function JournalSearchableList({
  initialEntries,
  initialQuery,
}: JournalSearchableListProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  // Debounced URL update — drives the server-side re-fetch.
  useEffect(() => {
    if (query === initialQuery) return
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      const qs = params.toString()
      router.replace(qs ? `/journal?${qs}` : '/journal', { scroll: false })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, initialQuery, router])

  const showEmpty = initialEntries.length === 0
  const isSearching = !!initialQuery

  return (
    <div className="space-y-4">
      {/* Search field — only render when there are entries to search OR
          a query is active. No point on a brand-new empty journal. */}
      {(initialEntries.length > 0 || isSearching) && (
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your journal…"
            className="input-base w-full pl-9 text-sm"
            aria-label="Search journal entries"
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-secondary)' }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      )}

      {showEmpty && !isSearching && (
        <div
          className="text-center py-16 px-4"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <p
            className="mb-2"
            style={{
              color: 'var(--text-primary)',
              fontFamily: "'Lora', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '1.5rem',
              lineHeight: 1.2,
            }}
          >
            Your journal is empty
          </p>
          <p className="text-sm mb-5 mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: '40ch' }}>
            Write something only you&apos;ll see — half-formed thoughts, personal
            connections, working drafts, questions you&apos;re not ready to ask out loud.
          </p>
          <Link href="/journal/new" className="btn-primary text-sm">
            + Write your first entry
          </Link>
        </div>
      )}

      {showEmpty && isSearching && (
        <div className="text-center py-12 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No entries match &ldquo;{initialQuery}&rdquo;.
        </div>
      )}

      {!showEmpty && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {initialEntries.map((entry) => {
            const date = new Date(entry.updated_at).toLocaleDateString('en-NZ', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Pacific/Auckland',
            })
            const preview = entry.body
              .replace(/^>\s+/gm, '')
              .replace(/^#+\s+/gm, '')
              .replace(/\*\*(.+?)\*\*/g, '$1')
              .replace(/\*(.+?)\*/g, '$1')
              .replace(/\n+/g, ' ')
              .trim()
              .slice(0, 140)
            return (
              <Link
                key={entry.id}
                href={`/journal/${entry.id}`}
                className="block px-2 py-3 transition-colors hover-bg-themed"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                  <p className="text-eyebrow">{date}</p>
                  <span className="text-eyebrow" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                    {entry.word_count} {entry.word_count === 1 ? 'word' : 'words'}
                  </span>
                </div>
                {entry.title && (
                  <h3
                    className="mb-1"
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: "'Lora', Georgia, serif",
                      fontStyle: 'italic',
                      fontWeight: 500,
                      fontSize: '1.125rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {entry.title}
                  </h3>
                )}
                {preview && (
                  <p
                    className="text-sm"
                    style={{
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {preview}
                    {entry.body.length > 140 ? '…' : ''}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
