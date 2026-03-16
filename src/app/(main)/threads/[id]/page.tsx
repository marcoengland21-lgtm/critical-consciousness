import { createClient, getSessionUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import ReplySection from '@/components/threads/ReplySection'
import ThreadActions from '@/components/threads/ThreadActions'
import MarkdownBody from '@/components/ui/MarkdownBody'
import type { ThreadType } from '@/types/database'

import { hashColor } from '@/lib/author-colors'

// Query-specific join shapes for Supabase responses
interface ChapterDocSlug {
  id: string
  chapter_number: number
  document: { slug: string } | null
}

interface SidebarThread {
  id: string
  title: string
  thread_type: string
  created_at: string
  week_id?: string | null
}

interface ThreadWeek {
  id: string
  week_number: number
  title: string
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getSessionUser()
  const supabase = await createClient()

  // ALL queries in parallel
  const [
    { data: thread, error },
    { data: replies },
    { data: profile },
    { data: weekThreads },
  ] = await Promise.all([
    supabase
      .from('threads')
      .select('*, author:profiles!author_id(id, display_name), week:reading_schedule!week_id(id, week_number, title)')
      .eq('id', id)
      .single(),
    supabase
      .from('replies')
      .select('*, author:profiles!author_id(id, display_name, role)')
      .eq('thread_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id || '')
      .single(),
    // Fetch other threads from same week (for sidebar) — will filter to same week below
    supabase
      .from('threads')
      .select('id, title, thread_type, created_at')
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (error || !thread) {
    notFound()
  }

  // Context chapter lookup — only if thread body contains a passage reference
  let contextChapter = null
  let contextDocSlug = null
  let contextChapterNum: number | null = null
  const blockquoteMatch = thread.body.match(/> "(.+?)" — \*(?:§|Section )(\d+), (.+?)\*/)
  if (blockquoteMatch) {
    const chapterNum = parseInt(blockquoteMatch[2])
    contextChapterNum = chapterNum

    const { data: chapters } = await supabase
      .from('text_chapters')
      .select('id, chapter_number, document:text_documents!document_id(slug)')
      .eq('chapter_number', chapterNum)
      .limit(1)

    if (chapters && chapters.length > 0) {
      contextChapter = chapters[0].id
      contextDocSlug = (chapters[0].document as unknown as ChapterDocSlug['document'])?.slug || null
    }
  }

  const isAuthor = user?.id === thread.author_id
  const isAdmin = profile?.role === 'admin'
  const authorName = thread.author?.display_name || 'Guest'
  const authorColor = hashColor(authorName)
  const authorInitial = authorName.charAt(0).toUpperCase()

  // Week info
  const threadWeek = (thread as { week?: ThreadWeek }).week || null

  // Other threads from same week (for sidebar)
  const sameWeekThreads = thread.week_id
    ? ((weekThreads || []) as unknown as SidebarThread[]).filter((t) => t.week_id === thread.week_id).slice(0, 5)
    : []

  return (
    <div className="flex gap-8">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Back link */}
        <Link
          href="/threads"
          className="inline-flex items-center text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Back to Threads
        </Link>

        {/* Thread Header */}
        <article className="mb-8">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {thread.pinned && (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                style={{
                  backgroundColor: 'var(--accent-purple)',
                  color: 'var(--text-inverse)',
                }}
              >
                <span className="text-[10px]">📌</span> Pinned
              </span>
            )}
            <ThreadTypeBadge type={thread.thread_type as ThreadType} />
            {threadWeek && (
              <Link
                href={`/threads?week=${threadWeek.id}`}
                className="text-xs font-medium px-2.5 py-1 rounded-full leading-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-badge)',
                  color: 'var(--text-secondary)',
                }}
              >
                Week {threadWeek.week_number}: {threadWeek.title}
              </Link>
            )}
          </div>

          {/* Title */}
          <h1
            className="text-2xl sm:text-3xl font-bold mb-5"
            style={{ color: 'var(--accent-red)' }}
          >
            {thread.title}
          </h1>

          {/* Author row with avatar */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ backgroundColor: authorColor }}
            >
              {authorInitial}
            </span>
            <div>
              <span
                className="text-sm font-medium block"
                style={{ color: 'var(--text-primary)' }}
              >
                {authorName}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <TimeAgo date={thread.created_at} />
              </span>
            </div>
          </div>

          {/* Thread Body */}
          <MarkdownBody content={thread.body} className="thread-body" />

          {/* View in context link (if thread was created from a passage) */}
          {contextChapter && contextDocSlug && (
            <div
              className="mt-6 pt-4 border-t"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <Link
                href={`/reading/${contextDocSlug}/${contextChapterNum || '1'}`}
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: 'var(--accent-red)' }}
              >
                📖 View in context →
              </Link>
            </div>
          )}

          {/* Thread Actions (edit/delete for author/admin) */}
          {(isAuthor || isAdmin) && (
            <ThreadActions
              threadId={thread.id}
              isAuthor={isAuthor}
              isAdmin={isAdmin}
            />
          )}
        </article>

        {/* Divider */}
        <hr className="mb-6" style={{ borderColor: 'var(--border-default)' }} />

        {/* Replies */}
        <ReplySection
          threadId={thread.id}
          threadTitle={thread.title}
          replies={replies || []}
          currentUserId={user?.id || ''}
          isAdmin={isAdmin}
        />
      </div>

      {/* Contextual sidebar — desktop only */}
      <aside
        className="hidden xl:block w-64 shrink-0 space-y-5"
        style={{ position: 'sticky', top: '2rem', alignSelf: 'flex-start' }}
      >
        {/* Reading context */}
        {contextDocSlug && contextChapterNum && (
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
              From the Reading
            </h3>
            <Link
              href={`/reading/${contextDocSlug}/${contextChapterNum}`}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--accent-red)' }}
            >
              View passage in context →
            </Link>
          </div>
        )}

        {/* Other threads from this week */}
        {sameWeekThreads.length > 0 && threadWeek && (
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
              Week {threadWeek.week_number} Threads
            </h3>
            <ul className="space-y-2">
              {sameWeekThreads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/threads/${t.id}`}
                    className="text-xs leading-snug transition-colors hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
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
              href="/threads"
              className="flex items-center gap-2 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              💬 All Threads
            </Link>
          </div>
        </div>
      </aside>
    </div>
  )
}
