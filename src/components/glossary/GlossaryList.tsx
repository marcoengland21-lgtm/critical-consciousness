'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { findGlossaryTermMatches } from '@/lib/glossary-utils'
import MarkdownBody from '@/components/ui/MarkdownBody'
import TimeAgo from '@/components/ui/TimeAgo'

// ── Types ───────────────────────────────────────────────────────────────────

interface Week {
  id: string
  week_number: number
}

interface GlossaryEntry {
  id: string
  term: string
  definition: string
  first_appearance_week: string | null
  related_terms: string[] | null
  created_by: string
  creator?: { display_name: string }
  created_at: string
  updated_at?: string
}

interface GlossaryVersionRow {
  id: string
  entry_id: string
  definition: string
  updated_by: string
  created_at: string
  author?: { display_name: string }
}

interface GlossaryCommentRow {
  id: string
  entry_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author?: { display_name: string }
}

// Unified timeline item
type TimelineItem =
  | { type: 'version'; data: GlossaryVersionRow }
  | { type: 'comment'; data: GlossaryCommentRow }
  | { type: 'created'; createdAt: string; createdBy: string }

interface GlossaryListProps {
  entries: GlossaryEntry[]
  currentUserId: string
  isAdmin: boolean
  weeks: Week[]
  versions: GlossaryVersionRow[]
  comments: GlossaryCommentRow[]
}

type GroupMode = 'alphabetical' | 'chapter'

// ── Component ───────────────────────────────────────────────────────────────

export default function GlossaryList({ entries, currentUserId, isAdmin, weeks, versions, comments }: GlossaryListProps) {
  const weekNumberMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of weeks) map.set(w.id, w.week_number)
    return map
  }, [weeks])

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
  const [commentInput, setCommentInput] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  // URL param deep-link
  useEffect(() => {
    const termParam = searchParams.get('term')
    if (termParam) {
      const match = entries.find(
        (e) => e.term.toLowerCase() === decodeURIComponent(termParam).toLowerCase()
      )
      if (match) setSelectedId(match.id)
    }
  }, [searchParams, entries])

  // Filter entries
  const filtered = useMemo(() => {
    if (!search) return entries
    const q = search.toLowerCase()
    return entries.filter(
      (e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)
    )
  }, [entries, search])

  // Group entries
  const grouped = useMemo(() => {
    if (groupMode === 'chapter') {
      const groups: Record<string, GlossaryEntry[]> = {}
      for (const entry of filtered) {
        const weekNum = entry.first_appearance_week ? weekNumberMap.get(entry.first_appearance_week) : null
        const key = weekNum ? `Week ${weekNum}` : 'Ungrouped'
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
  }, [filtered, groupMode, weekNumberMap])

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) || null : null

  // Build timeline for selected entry
  const timeline = useMemo<TimelineItem[]>(() => {
    if (!selectedEntry) return []

    const items: TimelineItem[] = []

    // Add version edits for this entry
    const entryVersions = versions.filter((v) => v.entry_id === selectedEntry.id)
    for (const v of entryVersions) {
      items.push({ type: 'version', data: v })
    }

    // Add comments for this entry
    const entryComments = comments.filter((c) => c.entry_id === selectedEntry.id)
    for (const c of entryComments) {
      items.push({ type: 'comment', data: c })
    }

    // Add creation event
    items.push({
      type: 'created',
      createdAt: selectedEntry.created_at,
      createdBy: selectedEntry.creator?.display_name || 'Unknown',
    })

    // Sort chronologically (newest first)
    items.sort((a, b) => {
      const dateA = a.type === 'created' ? a.createdAt : a.data.created_at
      const dateB = b.type === 'created' ? b.createdAt : b.data.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    return items
  }, [selectedEntry, versions, comments])

  // ── Handlers ──────────────────────────────────────────────────────────────

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
        first_appearance_week: firstWeek || null,
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

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEntry || !commentInput.trim()) return
    setSubmittingComment(true)

    const supabase = createClient()
    const { error } = await supabase.from('glossary_comments').insert({
      entry_id: selectedEntry.id,
      author_id: currentUserId,
      body: commentInput.trim(),
    })

    if (!error) {
      setCommentInput('')
      router.refresh()
    }
    setSubmittingComment(false)
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
        segments.push(<span key={`t-${lastEnd}`}>{def.slice(lastEnd, match.start)}</span>)
      }
      const matchedEntry = entries.find((e) => e.term.toLowerCase() === match.term.toLowerCase())
      segments.push(
        <button
          key={`m-${match.start}`}
          onClick={(ev) => {
            ev.stopPropagation()
            if (matchedEntry) setSelectedId(matchedEntry.id)
          }}
          className="rounded-sm transition-colors hover:bg-[var(--bg-soft)]"
          style={{
            color: 'var(--accent-purple)',
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms or definitions..."
          className="input-base text-sm flex-1"
        />
        <div className="flex gap-2">
          <select
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            className="input-base text-xs px-2 py-2"
          >
            <option value="alphabetical">A–Z</option>
            <option value="chapter">By Week</option>
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm whitespace-nowrap"
          >
            {showForm ? 'Cancel' : '+ Add Term'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-base card-body mb-5 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Term (e.g., Commodity Fetishism)"
              className="input-base text-sm"
              required
            />
            <input
              type="text"
              value={relatedTerms}
              onChange={(e) => setRelatedTerms(e.target.value)}
              placeholder="Related terms (comma-separated)"
              className="input-base text-sm"
            />
          </div>
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Definition — use Marx's own language where possible..."
            rows={4}
            className="input-base text-sm w-full"
            required
          />
          <div className="flex items-center gap-3">
            <select
              value={firstWeek}
              onChange={(e) => setFirstWeek(e.target.value)}
              className="input-base text-xs px-2 py-2"
            >
              <option value="">First appears: (select week)</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>Week {w.week_number}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Term'}
            </button>
          </div>
        </form>
      )}

      {/* Two-pane layout */}
      <div className="flex gap-6" style={{ minHeight: '50vh' }}>
        {/* Left pane — term list */}
        <div
          className={`${selectedEntry ? 'hidden lg:block' : 'w-full'} lg:w-72 xl:w-80 shrink-0 overflow-y-auto`}
          style={{ maxHeight: 'calc(100vh - 220px)' }}
        >
          {groupMode === 'alphabetical' && grouped.length > 3 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {grouped.map(([letter]) => (
                <button
                  key={letter}
                  onClick={() => document.getElementById(`glossary-group-${letter}`)?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent-red)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            {filtered.length} {filtered.length === 1 ? 'term' : 'terms'}
            {search && ` matching "${search}"`}
          </p>

          {grouped.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                    style={{ color: 'var(--accent-red)', borderColor: 'var(--border-default)' }}
                  >
                    {groupLabel}
                  </h3>
                  <div className="space-y-0.5">
                    {groupEntries.map((entry) => {
                      const entryCommentCount = comments.filter((c) => c.entry_id === entry.id).length
                      const entryVersionCount = versions.filter((v) => v.entry_id === entry.id).length
                      const activityCount = entryCommentCount + entryVersionCount

                      return (
                        <button
                          key={entry.id}
                          onClick={() => {
                            setSelectedId(entry.id)
                            setIsEditing(false)
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sm cursor-pointer"
                          style={{
                            backgroundColor: selectedId === entry.id ? 'var(--bg-soft)' : 'transparent',
                            color: 'var(--text-primary)',
                            borderLeft: selectedId === entry.id ? '3px solid var(--accent-purple)' : '3px solid transparent',
                            fontWeight: selectedId === entry.id ? 600 : 400,
                          }}
                        >
                          <span className="font-medium">{entry.term}</span>
                          <span className="flex items-center gap-1.5 mt-0.5">
                            {entry.first_appearance_week && weekNumberMap.get(entry.first_appearance_week) && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                              >
                                W{weekNumberMap.get(entry.first_appearance_week)}
                              </span>
                            )}
                            {activityCount > 0 && (
                              <span
                                className="text-[10px]"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {activityCount} {activityCount === 1 ? 'update' : 'updates'}
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right pane — detail view with thread-like timeline */}
        {selectedEntry ? (
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedId(null)}
              className="lg:hidden text-sm mb-4 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              ← Back to terms
            </button>

            <div
              className="card-base p-5"
            >
              {/* Term heading */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedEntry.term}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {selectedEntry.first_appearance_week && weekNumberMap.get(selectedEntry.first_appearance_week) && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                      >
                        Week {weekNumberMap.get(selectedEntry.first_appearance_week)}
                      </span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                    >
                      Added by {selectedEntry.creator?.display_name || 'Unknown'}
                    </span>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setEditingDef(selectedEntry.definition)
                    }}
                    className="btn-ghost text-xs shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Current definition */}
              {isEditing ? (
                <form onSubmit={handleEditSubmit} className="space-y-3 mb-6">
                  <textarea
                    value={editingDef}
                    onChange={(e) => setEditingDef(e.target.value)}
                    rows={6}
                    className="input-base text-sm w-full"
                    required
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save Definition'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setEditingDef('') }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-6">
                  <p
                    className="text-sm whitespace-pre-wrap"
                    style={{ color: 'var(--text-secondary)', lineHeight: '1.85' }}
                  >
                    {renderDefinitionWithLinks(selectedEntry.definition, selectedEntry.id)}
                  </p>
                </div>
              )}

              {/* Related terms */}
              {selectedEntry.related_terms && selectedEntry.related_terms.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold tracking-wide mb-2" style={{ color: 'var(--accent-purple)' }}>
                    Related Terms
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.related_terms.map((rt) => {
                      const relatedEntry = entries.find((e) => e.term.toLowerCase() === rt.toLowerCase())
                      return relatedEntry ? (
                        <button
                          key={rt}
                          onClick={() => setSelectedId(relatedEntry.id)}
                          className="text-xs px-2.5 py-1 rounded-full transition-colors"
                          style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--accent-purple)', cursor: 'pointer' }}
                        >
                          {rt}
                        </button>
                      ) : (
                        <span
                          key={rt}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                        >
                          {rt}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── History & Discussion timeline ── */}
              <div
                className="border-t pt-4"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <h4
                  className="text-xs font-bold tracking-wide mb-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  History & Discussion
                </h4>

                {/* Comment input */}
                <form onSubmit={handleCommentSubmit} className="mb-4">
                  <div
                    className="flex gap-2 items-start p-2 rounded-lg border"
                    style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-page)' }}
                  >
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Add a thought or question about this term..."
                      rows={2}
                      className="flex-1 bg-transparent text-sm outline-none resize-none min-w-0"
                      style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !commentInput.trim()}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
                      style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-inverse)' }}
                    >
                      {submittingComment ? '...' : 'Post'}
                    </button>
                  </div>
                </form>

                {/* Timeline */}
                {timeline.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                    No history yet. Edit the definition or post a comment to start the conversation.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((item, idx) => {
                      if (item.type === 'created') {
                        return (
                          <div
                            key={`created-${idx}`}
                            className="flex items-center gap-2 py-2"
                          >
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: 'var(--bg-soft)' }}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent-green)' }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              Definition created by <span className="font-medium">{item.createdBy}</span>
                              {' · '}
                              <TimeAgo date={item.createdAt} />
                            </p>
                          </div>
                        )
                      }

                      if (item.type === 'version') {
                        return (
                          <div
                            key={`v-${item.data.id}`}
                            className="rounded-lg p-3"
                            style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-default)' }}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: 'var(--bg-soft)' }}
                              >
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent-purple)' }}>
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                              </div>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-medium">{item.data.author?.display_name || 'Unknown'}</span>
                                {' updated the definition · '}
                                <TimeAgo date={item.data.created_at} />
                              </p>
                            </div>
                            <p
                              className="text-xs pl-7 whitespace-pre-wrap"
                              style={{ color: 'var(--text-secondary)', opacity: 0.7, lineHeight: '1.6' }}
                            >
                              Previous: &ldquo;{item.data.definition.length > 200
                                ? item.data.definition.slice(0, 200) + '…'
                                : item.data.definition}&rdquo;
                            </p>
                          </div>
                        )
                      }

                      if (item.type === 'comment') {
                        return (
                          <div
                            key={`c-${item.data.id}`}
                            className="rounded-lg p-3"
                            style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border-default)' }}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                                style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-inverse)' }}
                              >
                                {(item.data.author?.display_name || '?')[0].toUpperCase()}
                              </div>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {item.data.author?.display_name || 'Unknown'}
                                </span>
                                {' · '}
                                <TimeAgo date={item.data.created_at} />
                              </p>
                            </div>
                            <div className="pl-7 text-sm" style={{ color: 'var(--text-primary)', lineHeight: '1.7' }}>
                              <MarkdownBody content={item.data.body} />
                            </div>
                          </div>
                        )
                      }

                      return null
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                Select a term to see its definition
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                The glossary grows as the group learns
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
