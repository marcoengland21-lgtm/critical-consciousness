import { createClient, getSessionUser } from '@/lib/supabase/server'
import NewThreadForm from '@/components/threads/NewThreadForm'

export const metadata = {
  title: 'New Thread | Critical Consciousness',
}

export default async function NewThreadPage() {
  const user = await getSessionUser()
  const supabase = await createClient()

  // TODO: RE-ENABLE AUTH — Restore redirect when reviewer access is no longer needed
  // if (!user) redirect('/')

  // Fetch weeks for optional week association
  const { data: weeks } = await supabase
    .from('reading_schedule')
    .select('id, week_number, title')
    .order('week_number', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
        Start a New Thread
      </h1>
      <NewThreadForm weeks={weeks || []} />
    </div>
  )
}