import { createClient } from '@/lib/supabase/server'
import ConceptMap from '@/components/concepts/ConceptMap'
import type { ConceptEdgeType } from '@/types/database'

export const revalidate = 3600 // Glossary changes infrequently

export const metadata = {
  title: 'Concept Map | Capital Study Group',
}

interface ConceptEdgeRow {
  id: string
  from_term_id: string
  to_term_id: string
  edge_type: ConceptEdgeType
  note: string | null
}

export default async function ConceptsPage() {
  const supabase = await createClient()

  // Parallel fetch — entries (nodes) + concept_edges (links).
  // Per IMPROVEMENTS_PLAN §11.2, concept_edges is the source of truth for the
  // map. The legacy related_terms[] array is no longer consulted here.
  const [{ data: entries }, { data: edges }] = await Promise.all([
    supabase
      .from('glossary_entries')
      .select('id, term, definition, first_appearance_week')
      .order('term', { ascending: true }),
    supabase
      .from('concept_edges')
      .select('id, from_term_id, to_term_id, edge_type, note')
      .order('created_at', { ascending: true }),
  ])

  return (
    <div>
      <div className="mb-8">
        <p className="text-eyebrow mb-2">Group Vocabulary</p>
        <h1 className="text-display-lg mb-2" style={{ color: 'var(--text-primary)' }}>
          Concept Map
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
          How the group&apos;s concepts connect. Each connection is added by a
          member while building the glossary — the map grows as our reading does.
        </p>
      </div>

      <ConceptMap
        entries={(entries || []).map((e) => ({
          id: e.id,
          term: e.term,
          definition: e.definition,
        }))}
        edges={((edges || []) as ConceptEdgeRow[]).map((e) => ({
          id: e.id,
          from: e.from_term_id,
          to: e.to_term_id,
          note: e.note,
        }))}
      />
    </div>
  )
}
