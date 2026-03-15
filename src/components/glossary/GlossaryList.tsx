'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import GlossaryVersionHistory from './GlossaryVersionHistory'
import { findGlossaryTermMatches } from '@/lib/glossary-utils'

// ── Types ───────────────────────────────────────────────────────────────────

interface GlossaryEntry {
  id: string
  term: string
  definition: string
  first_appearance_week: number | null
  related_terms: string[] | null
  created_by: string
  creator?: { display_name: string }
  created_at: string
  updated_at?: string
}

interface GlossaryListProps {
  entries: GlossaryEntry[]
  currentUserId: string
  isAdmin: boolean
}

type GroupMode = 'alphabetical' | 'chapter'

// ── Component ───────────────────────────────────────────────────────────────

export default function GlossaryList({ entries, currentUserId, isAdmin }: GlossaryListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [groupMode, setGroupMode] = useState<GroupMode>('alphabetical')
  const [showForm, setShowForm] = useState(false)
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [relatedTerms, setRelatedTerms] = useState('')
  const [firstWeek, setFirstWeek] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingDef, setEditingDef] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null)

  // Check URL for ?term= parameter (from reading page "View Full Definition")
  useEffect(() => {
    const termParam = searchParams.get('term')
    if (termParam) {
      const match = entries.find(
        (e) => e.term.toLowerCase() === decodeURIComponent(termParam).toLowerCase()
      )
      if (match) {
        setSelectedId(match.id)
      }
    }
  }, [searchParams, entries])

  // Filter entries
  const filtered = useMemo(() => {
    let result = entries

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.term.toLowerCase().includes(q) ||
          e.definition.toLowerCase().includes(q)
      )
    }

    return result
  }, [entries, search])

  // Group entries
  const grouped = useMemo(() => {
    if (groupMode === 'chapter') {
      const groups: Record<string, GlossaryEntry[]> = {}
      for (const entry of filtered) {
        const week = entry.first_appearance_week
        const key = week ? `Week ${week}` : 'Ungrouped'
        if (!groups[key]) groups[key] = []
        groups[key].push(entry)
      }
      return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'Ungrouped') return 1
        if (b[0] === 'Ungrouped') return -1
        return a[0].localeCompare(b[0], undefined, { numeric: true })
      })
    } else {
      const groups: Record<string, GlossaryEntry[]> = {}
      for (const entry of filtered) {
        const letter = entry.term[0]?.toUpperCase() || '#'
        if (!groups[letter]) groups[letter] = []
        groups[letter].push(entry)
      }
      return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
    }
  }, [filtered, groupMode])

  const selectedEntry = selectedId
    ? entries.find((e) => e.id === selectedId) || null
    : null

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!term.trim() || !definition.trim()) return
    setSubmitting(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('glossary_entries')
      .insert({
        term: term.trim(),
        definition: definition.trim(),
        created_by: currentUserId,
        first_appearance_week: firstWeek ? parseInt(firstWeek) : null,
        related_terms: relatedTerms
          ? relatedTerms.split(',').map((t) => t.trim()).filter(Boolean)
          : null,
      })
      .select('id')
      .single()

    if (!error && data) {
      setTerm('')
      setDefinition('')
      setRelatedTerms('')
      setFirstWeek('')
      setShowForm(false)
      setSelectedId(data.id)
      router.refresh()
    }
    setSubmitting(false)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEntry || !editingDef.trim()) return
    setSubmitting(true)

    const supabase = createClient()

    // Save old definition to version history
    if (selectedEntry.definition !== editingDef.trim()) {
      await supabase.from('glossary_versions').insert({
        entry_id: selectedEntry.id,
        definition: selectedEntry.definition,
        updated_by: currentUserId,
      })
    }

    const { error } = await supabase
      .from('glossary_entries')
      .update({
        definition: editingDef.trim(),
        updated_by: currentUserId,
      })
      .eq('id', selectedEntry.id)

    if (!error) {
      setIsEditing(false)
      setEditingDef('')
      router.refresh()
    }
    setSubmitting(false)
  }

  // Render definition with cross-linked glossary terms
  function renderDefinitionWithLinks(def: string, currentTermId: string) {
    const otherTerms = entries.filter((e) => e.id !== currentTermId)
    const matches = findGlossaryTermMatches(def, otherTerms)

    if (matches.length === 0) return <span>{def}</span>

    const segments: React.ReactNode[] = []
    let lastEnd = 0

    for (const match of matches) {
      if (lastEnd < match.start) {
        segments.push(
          <span key={`t-${lastEnd}`}>{def.slice(lastEnd, match.start)}</span>
        )
      }
      const matchedEntry = entries.find(
        (e) => e.term.toLowerCase() === match.term.toLowerCase()
      )
      segments.push(
        <button
          key={`m-${match.start}`}
          onClick={(e) => {
            e.stopPropagation()
            if (matchedEntry) setSelectedId(matchedEntry.id)
          }}
          className="border-b border-dotted transition-colors"
          style={{
            borderColor: 'var(--accent-purple)',
            color: 'var(--accent-red)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
          }}
          title={`View definition of "${match.term}"`}
        >
          {def.slice(match.start, match.end)}
        </button>
      )
      lastEnd = match.end
    }

    if (lastEnd < def.length) {
      segments.push(<span key={`t-${lastEnd}`}>{def.slice(lastEnd)}</span>)
    }

    return segments
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms or definitions..."
          className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
        <div className="flex gap-2">
          <select
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            className="px-2 py-2 rounded-lg border text-xs"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <option value="alphabetical">A–Z</option>
            <option value="chapter">By Week</option>
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: 'var(--accent-red)',
              color: 'var(--text-inverse)',
            }}
          >
            {showForm ? 'Cancel' : '+ Add Term'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-5 p-4 rounded-xl border space-y-3"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Term (e.g., Commodity Fetishism)"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
              required
            />
            <input
              type="text"
              value={relatedTerms}
              onChange={(e) => setRelatedTerms(e.target.value)}
              placeholder="Related terms (comma-separated)"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Definition — use Marx's own language where possible..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
              lineHeight: '1.75',
            }}
            required
          />
          <div className="flex items-center gap-3">
            <select
              value={firstWeek}
              onChange={(e) => setFirstWeek(e.target.value)}
              className="px-2 py-2 rounded-lg border text-xs"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <option value="">First appears: (select week)</option>
              {Array.from({ length: 20 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Week {i + 1}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-red)',
                color: 'var(--text-inverse)',
              }}
            >
              {submitting ? 'Saving...' : 'Save Term'}
            </button>
          </div>
        </form>
      )}

      {/* Two-pane layout: term list (left) + detail (right) */}
      <div className="flex gap-6" style={{ minHeight: '50vh' }}>
        {/* Left pane — term list */}
        <div
          className={`${selectedEntry ? 'hidden lg:block' : 'w-full'} lg:w-72 xl:w-80 shrink-0 overflow-y-auto`}
          style={{ maxHeight: 'calc(100vh - 220px)' }}
        >
          {/* Alphabet quick-jump */}
          {groupMode === 'alphabetical' && grouped.length > 3 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {grouped.map(([letter]) => (
                <button
                  key={letter}
                  onClick={() => {
                    document
                      .getElementById(`glossary-group-${letter}`)
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors"
                  style={{
                    color: 'var(--accent-red)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          {/* Term count */}
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            {filtered.length} {filtered.length === 1 ? 'term' : 'terms'}
            {search && ` matching "${search}"`}
          </p>

          {/* Grouped term list */}
          {grouped.length === 0 ? (
            <p
              className="text-center py-12 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {search
                ? 'No terms match your search.'
                : "As we work through Capital together, we'll build a shared vocabulary here. Stumbled on a term? Add it."}
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map(([groupLabel, groupEntries]) => (
                <div key={groupLabel} id={`glossary-group-${groupLabel}`}>
                  <h3
                    className="text-xs font-bold tracking-wide uppercase mb-1.5 pb-1 border-b"
                    style={{
                      color: 'var(--accent-red)',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    {groupLabel}
                  </h3>
                  <div className="space-y-0.5">
                    {groupEntries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setSelectedId(entry.id)
                          setIsEditing(false)
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sm"
                        style={{
                          backgroundColor:
                            selectedId === entry.id
                              ? 'var(--bg-soft)'
                              : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span className="font-medium">{entry.term}</span>
                        {entry.first_appearance_week && (
                          <span
                            className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: 'var(--bg-badge)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            W{entry.first_appearance_week}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right pane — detail view */}
        {selectedEntry ? (
          <div
            className="flex-1 min-w-0 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedId(null)}
              className="lg:hidden text-sm mb-4 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              ← Back to terms
            </button>

            <div
              className="p-5 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-default)',
              }}
            >
              {/* Term heading */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2
                  className="text-xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {selectedEntry.term}
                </h2>
                <div className="flex gap-2 shrink-0">
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(true)
                        setEditingDef(selectedEntry.definition)
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors border"
                      style={{
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setShowVersionHistory(selectedEntry.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-badge)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    History
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedEntry.first_appearance_week && (
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: 'var(--bg-badge)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    First appears: Week {selectedEntry.first_appearance_week}
                  </span>
                )}
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: 'var(--bg-badge)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Added by {selectedEntry.creator?.display_name || 'Unknown'}
                </span>
              </div>

              {/* Definition — editable or display */}
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-3">
                  <textarea
                    value={editingDef}
                    onChange={(e) => setEditingDef(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
                    style={{
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      lineHeight: '1.75',
                    }}
                    required
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--accent-red)',
                        color: 'var(--text-inverse)',
                      }}
                    >
                      {submitting ? 'Saving...' : 'Save Definition'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        setEditingDef('')
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium border"
                      style={{
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p
                  className="text-sm whitespace-pre-wrap mb-4"
                  style={{
                    color: 'var(--text-secondary)',
                    lineHeight: '1.85',
                  }}
                >
                  {renderDefinitionWithLinks(
                    selectedEntry.definition,
                    selectedEntry.id
                  )}
                </p>
              )}

              {/* Related terms */}
              {selectedEntry.related_terms &&
                selectedEntry.related_terms.length > 0 && (
                  <div className="mb-4">
                    <h4
                      className="text-xs font-bold tracking-wide uppercase mb-2"
                      style={{ color: 'var(--accent-purple)' }}
                    >
                      Related Terms
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEntry.related_terms.map((rt) => {
                        const relatedEntry = entries.find(
                          (e) =>
                            e.term.toLowerCase() === rt.toLowerCase()
                        )
                        return relatedEntry ? (
                          <button
                            key={rt}
                            onClick={() => setSelectedId(relatedEntry.id)}
                            className="text-xs px-2.5 py-1 rounded-full transition-colors"
                            style={{
                              backgroundColor: 'var(--bg-badge)',
                              color: 'var(--accent-red)',
                              cursor: 'pointer',
                            }}
                          >
                            {rt}
                          </button>
                        ) : (
                          <span
                            key={rt}
                            className="text-xs px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: 'var(--bg-badge)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {rt}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

              {/* Invitation to edit */}
              {!isEditing && (
                <div
                  className="mt-6 pt-4 border-t text-xs"
                  style={{
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  This is a starting definition. Edit and improve it as the
                  group&apos;s understanding deepens.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state — no term selected (desktop only) */
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <p
                className="text-sm mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Select a term to see its definition
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
              >
                The glossary grows as the group learns
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Version history modal */}
      {showVersionHistory && (
        <GlossaryVersionHistory
          entryId={showVersionHistory}
          term={
            entries.find((e) => e.id === showVersionHistory)?.term || ''
          }
          onClose={() => setShowVersionHistory(null)}
        />
      )}
    </div>
  )
}
