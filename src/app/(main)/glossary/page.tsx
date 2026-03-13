import { createClient } from '@/lib/supabase/server'
import GlossaryList from '@/components/glossary/GlossaryList'

export const metadata = {
  title: 'Glossary | Critical Consciousness',
}

export default async function GlossaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entries } = await supabase
    .from('glossary_entries')
    .select('*, creator:profiles!created_by(display_name)')
    .order('term', { ascending: true })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-deep-red)' }}>
          Glossary
        </h1>
      </div>
      <GlossaryList
        entries={entries || []}
        currentUserId={user?.id || ''}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  )
}
