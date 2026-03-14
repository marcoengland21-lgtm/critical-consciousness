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
      <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
        Resources
      </h1>
      <ResourcesList
        resources={resources || []}
        weeks={weeks || []}
        currentUserId={user?.id || ''}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  )
}
