import { createClient, getSessionUser } from '@/lib/supabase/server'
import ResourcesList from '@/components/resources/ResourcesList'

export const metadata = {
  title: 'Resources | Capital Study Group',
}

export default async function ResourcesPage() {
  const user = await getSessionUser()
  const supabase = await createClient()

  // All 3 queries in parallel (was 3 sequential)
  const [{ data: resources }, { data: profile }, { data: weeks }] = await Promise.all([
    supabase
      .from('resources')
      .select('*, creator:profiles!created_by(display_name), week:reading_schedule!week_id(week_number, title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id || '')
      .single(),
    supabase
      .from('reading_schedule')
      .select('id, week_number, title')
      .order('week_number', { ascending: true }),
  ])

  return (
    <div>
      <div className="mb-8">
        <p className="text-eyebrow mb-2">Companions &amp; Tools</p>
        <h1 className="text-display-lg mb-2" style={{ color: 'var(--text-primary)' }}>
          Resources
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
          Companion texts, lectures, and tools to help with the reading. Anyone can add a resource.
        </p>
      </div>
      <ResourcesList
        resources={resources || []}
        weeks={weeks || []}
        currentUserId={user?.id || ''}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  )
}
