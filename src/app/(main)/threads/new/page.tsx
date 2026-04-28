import { createClient, getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentGroup } from '@/lib/group-resolver'
import NewThreadForm from '@/components/threads/NewThreadForm'

export const metadata = {
  title: 'New Thread | Capital Study Group',
}

export default async function NewThreadPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id)
  if (!group) redirect('/login')

  const now = new Date().toISOString()

  // Fetch weeks + current week, scoped to the active group.
  const [{ data: weeks }, { data: currentWeekData }] = await Promise.all([
    supabase
      .from('reading_schedule')
      .select('id, week_number, title')
      .eq('group_id', group.groupId)
      .order('week_number', { ascending: true }),
    supabase
      .from('reading_schedule')
      .select('id, week_number, title')
      .eq('group_id', group.groupId)
      .gte('due_date', now)
      .order('due_date', { ascending: true })
      .limit(1),
  ])

  const currentWeek = currentWeekData?.[0] || null

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
        Start a New Thread
      </h1>
      <NewThreadForm weeks={weeks || []} currentWeek={currentWeek} groupId={group.groupId} />
    </div>
  )
}