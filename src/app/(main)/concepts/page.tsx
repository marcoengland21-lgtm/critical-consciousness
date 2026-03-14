import { createClient } from '@/lib/supabase/server'
import ConceptMap from '@/components/concepts/ConceptMap'

export const revalidate = 3600 // Revalidate hourly — glossary entries change infrequently

export const metadata = {
  title: 'Concepts | Critical Consciousness',
}

export default async function ConceptsPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('glossary_entries')
    .select('id, term, definition, related_terms, chapter_first_appears, category, created_by, first_appearance_week, updated_by, created_at, updated_at')
    .order('term', { ascending: true })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>
            Concept Map
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Interactive visualization of how Marx's concepts relate across the text. Click a node to see details.
          </p>
        </div>
      </div>

      <ConceptMap entries={entries || []} />
    </div>
  )
}
