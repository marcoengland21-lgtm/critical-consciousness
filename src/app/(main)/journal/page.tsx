import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import JournalSearchableList from '@/components/journal/JournalSearchableList'
import type { PrivateNote } from '@/types/database'

export const metadata = {
  title: 'Journal | Capital Study Group',
}

interface JournalPageProps {
  searchParams?: Promise<{ q?: string }>
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const params = searchParams ? await searchParams : {}
  const query = params.q?.trim() || ''

  const supabase = await createClient()

  // Build the entries query. RLS already restricts to user's own rows;
  // .eq('user_id', user.id) is a defence-in-depth duplicate.
  let q = supabase
    .from('private_notes')
    .select('id, title, body_text, word_count, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  // Full-text search via the tsv generated column (see private-notes-schema.sql).
  // textSearch translates to `tsv @@ plainto_tsquery('english', ...)` server-side.
  if (query) {
    q = q.textSearch('tsv', query, { type: 'plain', config: 'english' })
  }

  const { data: entries, error } = await q

  if (error) {
    console.error('[CCP] Journal page query error:', error)
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-eyebrow mb-2">Private — only you can see this</p>
          <h1 className="text-display-lg" style={{ color: 'var(--text-primary)' }}>
            Journal
          </h1>
        </div>
        <Link href="/journal/new" className="btn-primary text-sm shrink-0">
          + New entry
        </Link>
      </div>

      <JournalSearchableList
        initialEntries={(entries || []) as PrivateNote[]}
        initialQuery={query}
      />
    </div>
  )
}
