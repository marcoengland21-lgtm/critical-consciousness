import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import ResourcesList from '@/components/resources/ResourcesList'

export const metadata = {
  title: 'Resources | Capital Study Group',
}

export default async function ResourcesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id)
  if (!group) redirect('/login')

  // L1: resources and reading_schedule are group-scoped via group_id;
  // RLS additionally enforces. Profile read is user-scoped.
  const [{ data: resources }, { data: profile }, { data: weeks }] = await Promise.all([
    supabase
      .from('resources')
      .select('*, creator:profiles!created_by(display_name), week:reading_schedule!week_id(week_number, title)')
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('reading_schedule')
      .select('id, week_number, title')
      .eq('group_id', group.groupId)
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
        currentUserId={user.id}
        isAdmin={profile?.role === 'admin'}
        groupId={group.groupId}
      />
    </div>
  )
}
