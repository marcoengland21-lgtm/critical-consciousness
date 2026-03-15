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
  const [{ data: entries }, { data: profile }, { data: weeks }, { data: versions }, { data: comments }] = await Promise.all([
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
    supabase
      .from('glossary_versions')
      .select('id, entry_id, definition, updated_by, created_at, author:profiles!updated_by(display_name)')
      .order('created_at', { ascending: true }),
    supabase
      .from('glossary_comments')
      .select('id, entry_id, author_id, body, created_at, updated_at, author:profiles!author_id(display_name)')
      .order('created_at', { ascending: true }),
  ])

  // Supabase hint joins (profiles!updated_by) return author as an array — flatten to single object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedVersions = (versions || []).map((v: any) => ({
    ...v,
    author: Array.isArray(v.author) ? v.author[0] : v.author,
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedComments = (comments || []).map((c: any) => ({
    ...c,
    author: Array.isArray(c.author) ? c.author[0] : c.author,
  }))

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
        versions={normalizedVersions}
        comments={normalizedComments}
      />
    </div>
  )
}
