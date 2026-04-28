'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Term {
  id: string
  term: string
  first_appearance_week: string | null
}

interface Edge {
  id: string
  from_term_id: string
  to_term_id: string
}

interface ChapterConceptSliceProps {
  /** The reading_schedule.id for the chapter being read. May be null if the
      chapter isn't assigned to a week. */
  weekId: string | null
  /** Active group context (L1) — scopes the glossary + edge fetch. */
  groupId: string
}

/**
 * Per-chapter concept slice — IMPROVEMENTS_PLAN §11.5.
 *
 * Embedded inside the Reading Workspace panel. Shows concepts whose
 * first_appearance_week matches THIS chapter's week, plus their direct
 * one-hop neighbours (concepts those build on, and concepts that build on
 * them). Lets the reader see what's in play AND its lineage without
 * leaving the chapter page.
 *
 * Renders as a list (not a force-directed canvas) — the panel is too
 * narrow for a meaningful graph rendering, and the list is more useful
 * for orientation anyway. Click any concept → opens it in the glossary.
 */
export default function ChapterConceptSlice({ weekId, groupId }: ChapterConceptSliceProps) {
  const [terms, setTerms] = useState<Term[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch on mount — both queries are small (glossary terms + concept_edges).
  // L1: scope to active group; RLS additionally enforces.
  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const [{ data: t }, { data: e }] = await Promise.all([
        supabase
          .from('glossary_entries')
          .select('id, term, first_appearance_week')
          .eq('group_id', groupId)
          .order('term', { ascending: true }),
        supabase
          .from('concept_edges')
          .select('id, from_term_id, to_term_id')
          .eq('group_id', groupId)
          .eq('edge_type', 'builds_on'),
      ])
      if (cancelled) return
      setTerms((t || []) as Term[])
      setEdges((e || []) as Edge[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [groupId])

  const termById = useMemo(() => {
    const m = new Map<string, Term>()
    for (const t of terms) m.set(t.id, t)
    return m
  }, [terms])

  // Concepts whose first_appearance_week matches THIS chapter's week.
  const inThisWeek = useMemo(() => {
    if (!weekId) return []
    return terms.filter((t) => t.first_appearance_week === weekId)
  }, [terms, weekId])

  // For each in-week term, derive the one-hop neighbour set (in either
  // direction). De-duplicated. Excludes the in-week terms themselves.
  const neighbours = useMemo(() => {
    if (inThisWeek.length === 0) return []
    const inWeekIds = new Set(inThisWeek.map((t) => t.id))
    const neighbourIds = new Set<string>()
    for (const e of edges) {
      if (inWeekIds.has(e.from_term_id)) neighbourIds.add(e.to_term_id)
      if (inWeekIds.has(e.to_term_id)) neighbourIds.add(e.from_term_id)
    }
    for (const id of inWeekIds) neighbourIds.delete(id)
    return Array.from(neighbourIds)
      .map((id) => termById.get(id))
      .filter((t): t is Term => t !== undefined)
      .sort((a, b) => a.term.localeCompare(b.term))
  }, [edges, inThisWeek, termById])

  // For each in-week term, compute its outgoing 'builds on' destinations
  // (so we can show 'X → Y, Z' style under each in-week term).
  function outgoingFor(termId: string): string[] {
    return edges
      .filter((e) => e.from_term_id === termId)
      .map((e) => termById.get(e.to_term_id)?.term)
      .filter((s): s is string => !!s)
  }

  if (loading) {
    return (
      <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
        Loading concepts…
      </p>
    )
  }

  // No data either because no week assignment or no terms with that week
  if (!weekId || (inThisWeek.length === 0 && neighbours.length === 0)) {
    return (
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        No glossary concepts attached to this chapter yet. Add a term in the{' '}
        <Link href="/glossary" className="hover:underline" style={{ color: 'var(--accent-purple)' }}>
          glossary
        </Link>{' '}
        and tag its first appearance to this week.
      </p>
    )
  }

  return (
    <div className="space-y-3 text-xs">
      {inThisWeek.length > 0 && (
        <div>
          <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Introduced this week
          </p>
          <ul className="space-y-1">
            {inThisWeek.map((t) => {
              const out = outgoingFor(t.id)
              return (
                <li key={t.id}>
                  <Link
                    href={`/glossary?term=${encodeURIComponent(t.term.toLowerCase())}`}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--accent-purple)' }}
                  >
                    {t.term}
                  </Link>
                  {out.length > 0 && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {' '}— builds on {out.join(', ')}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {neighbours.length > 0 && (
        <div>
          <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Related from earlier or later
          </p>
          <ul className="space-y-1">
            {neighbours.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/glossary?term=${encodeURIComponent(t.term.toLowerCase())}`}
                  className="hover:underline"
                  style={{ color: 'var(--accent-purple)' }}
                >
                  {t.term}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <Link
          href="/concepts"
          className="text-[11px] font-medium"
          style={{ color: 'var(--accent-red)' }}
        >
          View full concept map →
        </Link>
      </div>
    </div>
  )
}
