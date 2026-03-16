import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import ThreadListClient from '@/components/threads/ThreadListClient'
import type { ThreadType } from '@/types/database'

// Query-specific join shapes for Supabase responses
interface ReplyAuthor {
  display_name: string
}

interface ReplyRow {
  thread_id: string
  created_at: string
  author: ReplyAuthor | null
}

interface RawThread {
  id: string
  title: string
  body: string
  thread_type: string
  pinned: boolean
  created_at: string
  week_id: string | null
  author: { id: string; display_name: string } | null
  replies: { count: number }[]
}

interface WeekRow {
  id: string
  week_number: number
  title: string
  due_date: string
  session_date: string | null
}

interface DiscussionPrompt {
  id: string
  prompt_text: string
  sort_order: number
}

interface CurrentWeekWithPrompts {
  id: string
  week_number: number
  title: string
  discussion_prompts: DiscussionPrompt[] | null
}

interface UserRoleRow {
  role_type: string
  week: { id: string; week_number: number; title: string; due_date: string } | null
}

export const metadata = {
  title: 'Discussion Threads | Capital Study Group',
}

export default async function ThreadsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; week?: string }>
}) {
  const params = await searchParams
  const user = await getSessionUser()
  const supabase = await createClient()

  const now = new Date().toISOString()

  // Parallel fetch: threads, weeks, latest replies, prompts, user role
  const [
    { data: rawThreads },
    { data: weeks },
    { data: latestReplies },
    { data: currentWeekData },
    { data: userRoles },
  ] = await Promise.all([
    // All threads with author + reply count
    supabase
      .from('threads')
      .select('*, author:profiles!author_id(id, display_name), replies:replies(count)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),

    // All weeks for labels + filter
    supabase
      .from('reading_schedule')
      .select('id, week_number, title, due_date, session_date')
      .order('week_number', { ascending: true }),

    // Latest reply per thread (fetch recent replies, dedup client-side)
    supabase
      .from('replies')
      .select('thread_id, created_at, author:profiles!author_id(display_name)')
      .order('created_at', { ascending: false })
      .limit(200),

    // Current week with prompts (first upcoming or most recent)
    supabase
      .from('reading_schedule')
      .select('id, week_number, title, discussion_prompts(id, prompt_text, sort_order)')
      .gte('due_date', now)
      .order('due_date', { ascending: true })
      .limit(1),

    // Current user's weekly roles
    user
      ? supabase
          .from('weekly_roles')
          .select('role_type, week:reading_schedule!week_id(id, week_number, title, due_date)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: null }),
  ])

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

  // Transform threads to client-ready shape
  const threads = ((rawThreads || []) as unknown as RawThread[]).map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,
    thread_type: t.thread_type as ThreadType,
    pinned: t.pinned,
    created_at: t.created_at,
    week_id: t.week_id,
    author: t.author || { id: '', display_name: 'Guest' },
    replyCount: t.replies?.[0]?.count ?? 0,
    lastReply: lastReplyMap.get(t.id) || null,
  }))

  // Current week info for sidebar
  const currentWeek = currentWeekData?.[0] || null
  const prompts = (currentWeek?.discussion_prompts || []) as unknown as DiscussionPrompt[]
  // Sort prompts by sort_order
  const sortedPrompts = [...prompts].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  )

  // Find user's role for the current week
  const currentRole = ((userRoles || []) as unknown as UserRoleRow[]).find(
    (r) => r.week?.id === currentWeek?.id
  )

  const roleLabels: Record<string, string> = {
    summarizer: 'Summarizer',
    discussion_starter: 'Discussion Starter',
    connector: 'Connector',
    passage_picker: 'Passage Picker',
  }

  const roleNudges: Record<string, string> = {
    summarizer: 'Post a summary of the key points from the session.',
    discussion_starter: 'Post your opening questions to get the conversation going.',
    connector: 'Share how this week\u2019s reading connects to other ideas or current events.',
    passage_picker: 'Highlight a key passage for the group to discuss closely.',
  }

  return (
    <div className="flex gap-8">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <ThreadListClient
          initialThreads={threads}
          weeks={((weeks || []) as unknown as WeekRow[]).map((w) => ({
            id: w.id,
            week_number: w.week_number,
            title: w.title,
          }))}
          initialType={params.type || null}
          initialWeek={params.week || null}
        />
      </div>

      {/* Contextual sidebar — desktop only */}
      <aside
        className="hidden xl:block w-64 shrink-0 space-y-5"
        style={{ position: 'sticky', top: '2rem', alignSelf: 'flex-start' }}
      >
        {/* This Week's Prompts */}
        {currentWeek && sortedPrompts.length > 0 && (
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3
              className="text-xs font-bold tracking-wide uppercase mb-3"
              style={{ color: 'var(--accent-purple)' }}
            >
              Week {currentWeek.week_number} Prompts
            </h3>
            <ul className="space-y-2.5">
              {sortedPrompts.map((p) => (
                <li
                  key={p.id}
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {p.prompt_text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Your Role This Week */}
        {currentRole && (
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3
              className="text-xs font-bold tracking-wide uppercase mb-2"
              style={{ color: 'var(--accent-purple)' }}
            >
              Your Role This Week
            </h3>
            <p
              className="text-sm font-semibold mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              {roleLabels[currentRole.role_type] || currentRole.role_type}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {roleNudges[currentRole.role_type] || 'Share your thoughts with the group.'}
            </p>
            <Link
              href="/threads/new"
              className="inline-block mt-3 text-xs font-medium"
              style={{ color: 'var(--accent-red)' }}
            >
              Post now →
            </Link>
          </div>
        )}

        {/* Quick Links */}
        <div
          className="rounded-xl border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-default)',
          }}
        >
          <h3
            className="text-xs font-bold tracking-wide uppercase mb-3"
            style={{ color: 'var(--accent-purple)' }}
          >
            Quick Links
          </h3>
          <div className="space-y-2">
            <Link
              href="/reading"
              className="flex items-center gap-2 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              📖 Continue Reading
            </Link>
            <Link
              href="/glossary"
              className="flex items-center gap-2 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              📚 Glossary
            </Link>
            <Link
              href="/schedule"
              className="flex items-center gap-2 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              📅 Schedule
            </Link>
          </div>
        </div>
      </aside>
    </div>
  )
}
