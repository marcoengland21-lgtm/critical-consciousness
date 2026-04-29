import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import NewJournalEntryClient from './NewJournalEntryClient'

/**
 * /journal/new — fresh entry editor.
 *
 * Server shell: resolves user + active group, then mounts the client editor
 * wrapper that owns the onCreatedRedirect / URL-replace dance.
 *
 * Chunk 3b piece 2c-ii: accepts a `?chapter_id=...` URL param. When
 * present, the new note inherits that chapter context (the
 * `private_notes.chapter_id` column reserved at chunk 2 specifically
 * for chunk 3 work). Used by the ConceptsNotesModal's "+ Start a note
 * on this chapter" CTA so the note shows up in that chapter's notes
 * list, not just the global /journal index.
 */
export default async function NewJournalEntryPage({
  searchParams,
}: {
  // Recurring v1 ship-clean follow-up: searchParams broadened to
  // Record<string,...> so the resolver's admin URL override
  // (?group=<slug|uuid>) works on this page. The narrow chapter_id
  // type from chunk 3b is preserved by extracting it explicitly.
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const chapterParam = resolvedSearchParams?.['chapter_id']
  const chapterId = typeof chapterParam === 'string' ? chapterParam : null

  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  // Pass searchParams to enable admin URL override.
  const group = await getCurrentGroup(supabase, user.id, {
    searchParams: resolvedSearchParams,
  })
  if (!group) redirect('/login')

  return (
    <div>
      <Link
        href="/journal"
        className="inline-flex items-center text-sm mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        ← Back to journal
      </Link>

      <div className="mb-4">
        <p className="text-eyebrow">New entry · Private</p>
      </div>

      <NewJournalEntryClient
        userId={user.id}
        groupId={group.groupId}
        chapterId={chapterId}
      />
    </div>
  )
}
