import { createClient, getSessionUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentGroup } from '@/lib/group-resolver'
import NewThreadForm from '@/components/threads/NewThreadForm'

export const metadata = {
  title: 'New Thread | Capital Study Group',
}

interface ChapterRow {
  id: string
  chapter_number: number
  title: string
  sort_order: number
}

export default async function NewThreadPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id)
  if (!group) redirect('/login')

  // Schedule modes (recurring v1): swap reading_schedule fetch for
  // text_chapters fetch. Threads anchor to chapters now (008), and the
  // current chapter (group.currentChapterId from the resolver) is the
  // default anchor for new threads — the auto-anchor surfaced as the
  // green banner pill at the top of the form.
  //
  // text_chapters is shared text (not group-scoped), so no group
  // filter on the chapters query.
  const { data: chapters, error } = await supabase
    .from('text_chapters')
    .select('id, chapter_number, title, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[CCP] /threads/new — text_chapters query error:', error)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
        Start a New Thread
      </h1>
      <NewThreadForm
        chapters={(chapters || []) as ChapterRow[]}
        currentChapterId={group.currentChapterId}
        groupId={group.groupId}
      />
    </div>
  )
}