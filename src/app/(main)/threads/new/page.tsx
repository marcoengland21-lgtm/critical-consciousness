import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewThreadForm from '@/components/threads/NewThreadForm'

export const metadata = {
  title: 'New Thread | Critical Consciousness',
}

export default async function NewThreadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Fetch weeks for optional week association
  const { data: weeks } = await supabase
    .from('reading_schedule')
    .select('id, week_number, title')
    .order('week_number', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-deep-red)' }}>
        Start a New Thread
      </h1>
      <NewThreadForm weeks={weeks || []} />
    </div>
  )
}