import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import JournalEditor from '@/components/journal/JournalEditor'
import JournalEntryActions from '@/components/journal/JournalEntryActions'

export const metadata = {
  title: 'Entry | Journal | Capital Study Group',
}

interface JournalEntryPageProps {
  params: Promise<{ id: string }>
}

export default async function JournalEntryPage({ params }: JournalEntryPageProps) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  // RLS restricts to user's own entries; if someone tries to load another
  // user's entry by id, this returns null and we 404.
  const { data: entry, error } = await supabase
    .from('private_notes')
    .select('id, title, body_json, created_at, updated_at, user_id')
    .eq('id', id)
    .single()

  if (error || !entry) notFound()
  // Defence-in-depth: even if RLS were misconfigured, refuse to render
  // someone else's entry from this server component.
  if (entry.user_id !== user.id) notFound()

  const createdLabel = new Date(entry.created_at).toLocaleDateString('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Pacific/Auckland',
  })

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/journal"
          className="inline-flex items-center text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Back to journal
        </Link>
        <JournalEntryActions entryId={entry.id} />
      </div>

      <div className="mb-4">
        <p className="text-eyebrow">Private · written {createdLabel}</p>
      </div>

      <JournalEditor
        initialId={entry.id}
        initialTitle={entry.title || ''}
        initialBodyJson={(entry.body_json as object) || { type: 'doc', content: [] }}
        userId={user.id}
        showTitle
        bodyPlaceholder="…"
        minHeight={500}
      />
    </div>
  )
}
