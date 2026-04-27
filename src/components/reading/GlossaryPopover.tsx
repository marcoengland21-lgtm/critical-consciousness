'use client'

/**
 * GlossaryPopover — chunk 3b piece 2b.
 *
 * Click-triggered glossary entry preview, anchored to a glossary term
 * inline in the chapter text. Per frame 06.
 *
 *   GLOSSARY · INTRODUCED WEEK 1                         [ ← ] [ × ]
 *
 *   commodity                                  (Lora italic display)
 *
 *   {full definition rendered as markdown body}
 *
 *   RELATED TERMS
 *   use-value · exchange-value · value · labour
 *
 *   Edited by N members                          Open full entry →
 *
 * Internal navigation history: clicking a related term doesn't open a
 * second popover (popover-on-popover is forbidden). Instead this same
 * popover swaps content to show the new term, pushing the previous to
 * an internal history stack. When history is non-empty a back arrow
 * appears in the header.
 *
 * Replaces the previous GlossaryTooltip.tsx (misnamed — that was a
 * click popover, not a hover tooltip). Uses <Popover scope="body">.
 *
 * Body scope: glossary entries are reading content, not chrome.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Popover } from '@/components/overlay'
import { createClient } from '@/lib/supabase/client'
import MarkdownBody from '@/components/ui/MarkdownBody'

interface GlossaryEntry {
  id: string
  term: string
  definition: string
  related_terms: string[] | null
  first_appearance_week_label: string | null
  edited_by_count: number
}

interface GlossaryPopoverProps {
  open: boolean
  onClose: () => void
  /** DOM ref of the inline glossary term that triggered the popover. */
  anchor: React.RefObject<HTMLElement | null>
  /** The term the popover initially shows (the one that was clicked). */
  initialTerm: string
}

/**
 * Fetches a glossary entry by term name (case-insensitive). Joins
 * `reading_schedule` for the introduction-week label.
 */
async function fetchEntry(termName: string): Promise<GlossaryEntry | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('glossary_entries')
    .select(
      `id, term, definition, related_terms, first_appearance_week,
       schedule:first_appearance_week ( week_number )`
    )
    .ilike('term', termName)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[CCP] Glossary entry fetch failed:', error)
    return null
  }
  if (!data) return null

  // Edited-by count: a separate aggregate. For 2b we use the 'updated_by'
  // distinct count in the versions table if present; fall back to 1.
  // Kept simple — the popover header just needs a number.
  let editedBy = 1
  try {
    const versionsRes = await supabase
      .from('glossary_versions')
      .select('updated_by', { count: 'exact', head: false })
      .eq('entry_id', (data as { id: string }).id)
    if (versionsRes.data) {
      editedBy = new Set(
        (versionsRes.data as { updated_by: string }[]).map((v) => v.updated_by)
      ).size || 1
    }
  } catch {
    // Non-fatal; default of 1 is fine.
  }

  const scheduleRow = (data as {
    schedule?: { week_number: number } | { week_number: number }[] | null
  }).schedule
  const weekNumber = Array.isArray(scheduleRow)
    ? scheduleRow[0]?.week_number
    : scheduleRow?.week_number

  return {
    id: (data as { id: string }).id,
    term: (data as { term: string }).term,
    definition: (data as { definition: string }).definition,
    related_terms: (data as { related_terms: string[] | null }).related_terms,
    first_appearance_week_label:
      typeof weekNumber === 'number' ? `INTRODUCED WEEK ${weekNumber}` : null,
    edited_by_count: editedBy,
  }
}

export default function GlossaryPopover({
  open,
  onClose,
  anchor,
  initialTerm,
}: GlossaryPopoverProps) {
  const [entry, setEntry] = useState<GlossaryEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const seedTermRef = useRef<string | null>(null)

  // Reset when the popover opens with a new term.
  useEffect(() => {
    if (!open) return
    if (seedTermRef.current !== initialTerm) {
      seedTermRef.current = initialTerm
      setHistory([])
      setEntry(null)
      setLoading(true)
      fetchEntry(initialTerm).then((e) => {
        setEntry(e)
        setLoading(false)
      })
    }
  }, [open, initialTerm])

  // Reset state on close so the next open starts fresh.
  useEffect(() => {
    if (!open) {
      seedTermRef.current = null
      setHistory([])
      setEntry(null)
    }
  }, [open])

  const navigateTo = useCallback((termName: string) => {
    setLoading(true)
    setHistory((prev) => (entry ? [...prev, entry.term] : prev))
    fetchEntry(termName).then((e) => {
      setEntry(e)
      setLoading(false)
    })
  }, [entry])

  const goBack = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setLoading(true)
    fetchEntry(prev).then((e) => {
      setEntry(e)
      setLoading(false)
    })
  }, [history])

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchor={anchor}
      scope="body"
      placement="bottom-start"
      width={420}
      maxHeight="70vh"
      ariaLabel={entry ? `${entry.term} — glossary entry` : 'Glossary entry'}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
        <div className="min-w-0">
          <p className="text-eyebrow mb-1" style={{ color: 'var(--accent-purple)' }}>
            Glossary
            {entry?.first_appearance_week_label && (
              <> · {entry.first_appearance_week_label.replace('INTRODUCED ', 'introduced ')}</>
            )}
          </p>
          <h3
            style={{
              color: 'var(--text-primary)',
              fontFamily: "'Lora', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '1.5rem',
              lineHeight: 1.2,
            }}
          >
            {loading && !entry ? '…' : entry?.term ?? initialTerm}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {history.length > 0 && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Back to previous term"
              className="p-1 rounded-md transition-colors hover-bg-themed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close glossary entry"
            className="p-1 rounded-md transition-colors hover-bg-themed"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Definition */}
      <div className="px-5 pb-3 markdown-body" style={{ color: 'var(--text-primary)', lineHeight: 1.65 }}>
        {loading && !entry ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : entry ? (
          <MarkdownBody content={entry.definition} />
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No glossary entry found for &ldquo;{initialTerm}&rdquo;.
          </p>
        )}
      </div>

      {/* Related terms */}
      {entry && entry.related_terms && entry.related_terms.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-eyebrow mb-2">Related terms</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {entry.related_terms.map((rt, i) => (
              <span key={`${rt}-${i}`} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo(rt)}
                  className="text-sm transition-colors"
                  style={{
                    color: 'var(--accent-purple)',
                    textDecoration: 'underline',
                    textDecorationThickness: '1px',
                    textUnderlineOffset: '0.18em',
                  }}
                >
                  {rt}
                </button>
                {i < entry.related_terms!.length - 1 && (
                  <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {entry && (
        <div
          className="flex items-center justify-between px-5 py-3 text-xs"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            Edited by {entry.edited_by_count} {entry.edited_by_count === 1 ? 'member' : 'members'}
          </span>
          <Link
            href={`/glossary?term=${encodeURIComponent(entry.term)}`}
            onClick={onClose}
            className="font-medium"
            style={{ color: 'var(--accent-red)' }}
          >
            Open full entry →
          </Link>
        </div>
      )}
    </Popover>
  )
}
