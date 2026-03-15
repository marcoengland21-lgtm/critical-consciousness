import { createClient, getSessionUser } from '@/lib/supabase/server'
import GlossaryList from '@/components/glossary/GlossaryList'

export const revalidate = 3600

export const metadata = {
  title: 'Glossary | Capital Study Group',
}

export default async function GlossaryPage() {
  const user = await getSessionUser()
  const supabase = await createClient()

  // All queries in parallel
  const [{ data: entries }, { data: profile }, { data: weeks }] = await Promise.all([
    supabase
      .from('glossary_entries')
      .select('*, creator:profiles!created_by(display_name)')
      .order('term', { ascending: true }),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id || '')
      .single(),
    supabase
      .from('reading_schedule')
      .select('id, week_number')
      .order('week_number', { ascending: true }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>
          Glossary
        </h1>
      </div>
      <GlossaryList
        entries={entries || []}
        currentUserId={user?.id || ''}
        isAdmin={profile?.role === 'admin'}
        weeks={weeks || []}
      />
    </div>
  )
}
