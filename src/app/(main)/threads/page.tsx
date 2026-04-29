import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import ThreadListClient from '@/components/threads/ThreadListClient'
import type { ThreadType } from '@/types/database'

// Query-specific join shapes for Supabase responses
interface ReplyAuthor {
  display_name: string
}

interface RawThread {
  id: string
  title: string
  body: string
  thread_type: string
  pinned: boolean
  created_at: string
  week_id: string | null
  /** 008: chapter anchor for recurring-mode. NULL for legacy threads
   *  written before 008; populated for new threads created via the
   *  recurring-v1 NewThreadForm. */
  chapter_id: string | null
  author: { id: string; display_name: string } | null
  replies: { count: number }[]
}

interface ChapterRow {
  id: string
  chapter_number: number
  title: string
  sort_order: number
}

export const metadata = {
  title: 'Discussion Threads | Capital Study Group',
}

export default async function ThreadsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; chapter?: string }>
}) {
  const params = await searchParams
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id, { searchParams: params })
  if (!group) redirect('/login')

  // Parallel fetch: queries scoped to the resolved group_id where
  // applicable. RLS additionally enforces membership at the DB layer
  // per L1. text_chapters is shared text (not group-scoped), so no
  // group filter needed for the chapters query.
  //
  // Schedule modes (recurring v1) drops three queries from the
  // pre-recurring shape:
  //   - reading_schedule weeks (week filter dropdown — replaced by
  //     chapter filter from text_chapters)
  //   - reading_schedule + discussion_prompts (sidebar widget — sidebar
  //     dropped per item 7b, returns when sessions piece adds session-
  //     scoped role / prompt assignment)
  //   - weekly_roles (sidebar "Your Role This Week" widget — same
  //     reasoning, scope-out tied to sessions table future work)
  const [threadsResult, chaptersResult, repliesResult, branchesResult] = await Promise.all([
    supabase
      .from('threads')
      .select('*, author:profiles!author_id(id, display_name), replies:replies(count)')
      .eq('group_id', group.groupId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('text_chapters')
      .select('id, chapter_number, title, sort_order')
      .order('sort_order', { ascending: true }),

    supabase
      .from('replies')
      .select('thread_id, created_at, author:profiles!author_id(display_name)')
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: false })
      .limit(200),

    supabase
      .from('thread_branches')
      .select('parent_thread_id')
      .eq('group_id', group.groupId),
  ])

  // Log all errors — nested joins can fail silently
  if (threadsResult.error) console.error('[CCP] Threads page — threads query error:', threadsResult.error)
  if (chaptersResult.error) console.error('[CCP] Threads page — chapters query error:', chaptersResult.error)
  if (repliesResult.error) console.error('[CCP] Threads page — replies query error:', repliesResult.error)

  const rawThreads = threadsResult.data
  const chapters = (chaptersResult.data || []) as ChapterRow[]
  const latestReplies = repliesResult.data

  // Build latest reply lookup: thread_id → { created_at, authorName }
  const lastReplyMap = new Map<string, { created_at: string; authorName: string }>()
  if (latestReplies) {
    for (const reply of latestReplies) {
      if (!lastReplyMap.has(reply.thread_id)) {
        const replyAuthor = reply.author as ReplyAuthor | ReplyAuthor[] | null
        const authorName = Array.isArray(replyAuthor) ? replyAuthor[0]?.display_name : replyAuthor?.display_name
        lastReplyMap.set(reply.thread_id, {
          created_at: reply.created_at,
          authorName: authorName || 'Someone',
        })
      }
    }
  }

  // Tally branch counts per parent thread for the §4.6 thread-card footer.
  const branchCountMap = new Map<string, number>()
  if (branchesResult.data) {
    for (const b of branchesResult.data as { parent_thread_id: string }[]) {
      branchCountMap.set(b.parent_thread_id, (branchCountMap.get(b.parent_thread_id) || 0) + 1)
    }
  }
  if (branchesResult.error) console.error('[CCP] Threads page — branches query error:', branchesResult.error)

  // Transform threads to client-ready shape. chapter_id is surfaced
  // on the row for the per-card chapter badge in ThreadListClient.
  const threads = ((rawThreads || []) as unknown as RawThread[]).map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,
    thread_type: t.thread_type as ThreadType,
    pinned: t.pinned,
    created_at: t.created_at,
    week_id: t.week_id,
    chapter_id: t.chapter_id,
    author: t.author || { id: '', display_name: 'Guest' },
    replyCount: t.replies?.[0]?.count ?? 0,
    branchCount: branchCountMap.get(t.id) || 0,
    lastReply: lastReplyMap.get(t.id) || null,
  }))

  // Schedule modes (recurring v1): single-column layout. Sidebar
  // ("This Week's Prompts" + "Your Role This Week") dropped per item
  // 7b — both surfaced scope-out data (discussion_prompts +
  // weekly_roles, retained as legacy data tied to sessions table
  // future work). Returns when sessions piece adds session-scoped
  // role + prompt assignment.
  //
  // max-w-3xl matches the constraint pattern on /threads/new — keeps
  // the threads UX coherent across list and create pages, gives the
  // hairline-divided rows a readable line length without stretching
  // to the layout's 7xl.
  return (
    <div className="max-w-3xl mx-auto">
      <ThreadListClient
        initialThreads={threads}
        chapters={chapters}
        initialType={params.type || null}
        initialChapter={params.chapter || null}
        groupId={group.groupId}
      />
    </div>
  )
}
