import { createClient, getSessionUser } from '@/lib/supabase/server'
import NewThreadForm from '@/components/threads/NewThreadForm'

export const metadata = {
  title: 'New Thread | Capital Study Group',
}

export default async function NewThreadPage() {
  const user = await getSessionUser()
  const supabase = await createClient()

  // TODO: RE-ENABLE AUTH — Restore redirect when reviewer access is no longer needed
  // if (!user) redirect('/')

  const now = new Date().toISOString()

  // Fetch weeks + find current week (first upcoming based on due_date)
  const [{ data: weeks }, { data: currentWeekData }] = await Promise.all([
    supabase
      .from('reading_schedule')
      .select('id, week_number, title')
      .order('week_number', { ascending: true }),
    supabase
      .from('reading_schedule')
      .select('id, week_number, title')
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
      <NewThreadForm weeks={weeks || []} currentWeek={currentWeek} />
    </div>
  )
}