import { createClient } from '@/lib/supabase/server'
import ResourcesList from '@/components/resources/ResourcesList'

export const metadata = {
  title: 'Resources | Critical Consciousness',
}

export default async function ResourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: resources } = await supabase
    .from('resources')
    .select('*, creator:profiles!created_by(display_name), week:reading_schedule!week_id(week_number, title)')
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()

  const { data: weeks } = await supabase
    .from('reading_schedule')
    .select('id, week_number, title')
    .order('week_number', { ascending: true })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-deep-red)' }}>
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
