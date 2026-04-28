'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ConceptEdgeType } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConceptEdgeWithCreator {
  id: string
  from_term_id: string
  to_term_id: string
  edge_type: ConceptEdgeType
  note: string | null
  created_by: string
  created_at: string
  creator?: { display_name: string } | null
}

interface TermLite {
  id: string
  term: string
}

interface ConceptConnectionsProps {
  /** The currently selected glossary term. */
  termId: string
  /** All entries — used to look up display names and to populate the 'add connection' picker. */
  entries: TermLite[]
  /** All edges in the database — filtered client-side to those touching termId. */
  allEdges: ConceptEdgeWithCreator[]
  /** Currently logged-in user — controls 'remove' affordance (only own edges). */
  currentUserId: string
  /** Callback when a term link is clicked (so the parent glossary list can re-select). */
  onSelectTerm: (id: string) => void
  /** Active group context (L1) — required for new edge inserts. */
  groupId: string
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * "Concept connections" panel — per IMPROVEMENTS_PLAN §11.6.
 *
 * Shows two derived lists for the selected term:
 *   1. This concept builds on:        outgoing edges (from = term)
 *   2. Concepts that build on this:   incoming edges (to = term)
 *
 * Both lists are inferred from the same set of concept_edges rows. The
 * inverse list isn't a separate edge type — it's just edges in the other
 * direction, computed from the same data.
 *
 * Add connection: small inline form (term picker + optional note) that
 * inserts a 'builds_on' edge from the current term to the picked term.
 *
 * Remove: only the original creator can remove an edge (matches RLS in
 * concept-edges-schema.sql).
 *
 * v1 only renders the 'builds_on' edge type. The schema accommodates other
 * types but the UI doesn't expose them yet.
 */
export default function ConceptConnections({
  termId,
  entries,
  allEdges,
  currentUserId,
  onSelectTerm,
  groupId,
}: ConceptConnectionsProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [pickedTermId, setPickedTermId] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Lookup: term id → term name for fast rendering
  const termNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of entries) m.set(e.id, e.term)
    return m
  }, [entries])

  // Outgoing edges — this term builds on these (from = termId)
  const buildsOn = useMemo(
    () => allEdges.filter((e) => e.from_term_id === termId && e.edge_type === 'builds_on'),
    [allEdges, termId]
  )

  // Incoming edges — these terms build on this (to = termId)
  const builtOnBy = useMemo(
    () => allEdges.filter((e) => e.to_term_id === termId && e.edge_type === 'builds_on'),
    [allEdges, termId]
  )

  // Already-connected term ids — exclude from the add picker so users can't
  // try to create duplicates (the UNIQUE constraint would block it anyway).
  const alreadyConnectedIds = useMemo(() => {
    const s = new Set<string>([termId]) // self too — the CHECK constraint blocks self-edges
    for (const e of buildsOn) s.add(e.to_term_id)
    return s
  }, [buildsOn, termId])

  const pickableTerms = useMemo(
    () =>
      entries
        .filter((e) => !alreadyConnectedIds.has(e.id))
        .sort((a, b) => a.term.localeCompare(b.term)),
    [entries, alreadyConnectedIds]
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!pickedTermId) {
      setError('Pick a term to connect.')
      return
    }
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { error: insertError } = await supabase.from('concept_edges').insert({
      from_term_id: termId,
      to_term_id: pickedTermId,
      edge_type: 'builds_on',
      note: note.trim() || null,
      created_by: currentUserId,
      // L1: scope edge to active group; trigger also enforces parity
      // between from_term and to_term group_ids.
      group_id: groupId,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // Reset and refresh — server will re-fetch edges and pass them back through props.
    setPickedTermId('')
    setNote('')
    setAdding(false)
    setSubmitting(false)
    router.refresh()
  }

  async function handleRemove(edgeId: string) {
    if (!confirm('Remove this connection?')) return

    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from('concept_edges')
      .delete()
      .eq('id', edgeId)

    if (deleteError) {
      alert('Failed to remove connection: ' + deleteError.message)
      return
    }
    router.refresh()
  }

  // If no connections at all and user can't add (no other terms exist), hide section.
  if (buildsOn.length === 0 && builtOnBy.length === 0 && pickableTerms.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h4 className="text-eyebrow mb-3" style={{ color: 'var(--accent-purple)' }}>
        Concept Connections
      </h4>

      {/* This concept builds on: */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            This concept builds on
          </p>
          {!adding && pickableTerms.length > 0 && (
            <button
              onClick={() => setAdding(true)}
              className="text-xs font-medium"
              style={{ color: 'var(--accent-red)' }}
            >
              + Add connection
            </button>
          )}
        </div>

        {buildsOn.length === 0 && !adding && (
          <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
            No connections yet.
          </p>
        )}

        {buildsOn.length > 0 && (
          <ul className="space-y-1.5">
            {buildsOn.map((edge) => {
              const targetName = termNameById.get(edge.to_term_id) || 'Unknown'
              const canRemove = edge.created_by === currentUserId
              return (
                <li
                  key={edge.id}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onSelectTerm(edge.to_term_id)}
                      className="font-medium hover:underline"
                      style={{ color: 'var(--accent-purple)' }}
                    >
                      → {targetName}
                    </button>
                    {edge.note && (
                      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {edge.note}
                      </p>
                    )}
                    {edge.creator?.display_name && (
                      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                        added by {edge.creator.display_name}
                      </p>
                    )}
                  </div>
                  {canRemove && (
                    <button
                      onClick={() => handleRemove(edge.id)}
                      className="text-[11px] shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Remove this connection (only the creator can)"
                    >
                      remove
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {/* Add form */}
        {adding && (
          <form
            onSubmit={handleAdd}
            className="mt-3 p-3 rounded-lg space-y-2"
            style={{
              backgroundColor: 'var(--bg-card-alt)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <label htmlFor="cc-term" className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Connect to
              </label>
              <select
                id="cc-term"
                value={pickedTermId}
                onChange={(e) => setPickedTermId(e.target.value)}
                className="input-base w-full text-xs"
              >
                <option value="">— Pick a term —</option>
                {pickableTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.term}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cc-note" className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Note (optional)
              </label>
              <input
                id="cc-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="One sentence on why this connection matters"
                className="input-base w-full text-xs"
                maxLength={300}
              />
            </div>
            {error && <div className="alert-error text-[11px]">{error}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setAdding(false)
                  setPickedTermId('')
                  setNote('')
                  setError('')
                }}
                className="btn-ghost text-[11px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !pickedTermId}
                className="btn-primary text-[11px]"
              >
                {submitting ? 'Saving…' : 'Save connection'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Concepts that build on this — inverse list, computed not stored */}
      {builtOnBy.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Concepts that build on this
          </p>
          <ul className="space-y-1.5">
            {builtOnBy.map((edge) => {
              const sourceName = termNameById.get(edge.from_term_id) || 'Unknown'
              return (
                <li key={edge.id} className="text-xs">
                  <button
                    onClick={() => onSelectTerm(edge.from_term_id)}
                    className="font-medium hover:underline"
                    style={{ color: 'var(--accent-purple)' }}
                  >
                    ← {sourceName}
                  </button>
                  {edge.note && (
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {edge.note}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
