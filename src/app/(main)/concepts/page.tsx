import { createClient } from '@/lib/supabase/server'
import ConceptMap from '@/components/concepts/ConceptMap'

export const metadata = {
  title: 'Concepts | Critical Consciousness',
}

export default async function ConceptsPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('glossary_entries')
    .select('*')
    .order('term', { ascending: true })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-deep-red)' }}>
            Concept Map
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
            Interactive visualization of how Marx's concepts relate across the text. Click a node to see details.
          </p>
        </div>
      </div>

      <ConceptMap entries={entries || []} />
    </div>
  )
}
