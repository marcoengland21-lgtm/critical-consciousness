import { createClient, getSessionUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import ReplySection from '@/components/threads/ReplySection'
import ThreadActions from '@/components/threads/ThreadActions'
import OpBranchButton from '@/components/threads/OpBranchButton'
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
  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }
  const supabase = await createClient()

  // ALL queries in parallel
  const [
    { data: thread, error },
    { data: replies },
    { data: profile },
    { data: weekThreads },
    // §4.4 / §4.5: branch metadata.
    // 'parentBranch'  — does THIS thread descend from another? (one row max)
    // 'childBranches' — what threads have spawned FROM this one? (any number)
    { data: parentBranch },
    { data: childBranches },
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
    // Parent branch — only one (UNIQUE on child_thread_id). Joins parent thread + reply.
    supabase
      .from('thread_branches')
      .select(`
        id, parent_reply_id,
        parent_thread:threads!parent_thread_id(id, title, author:profiles!author_id(display_name)),
        parent_reply:replies!parent_reply_id(id, body, author:profiles!author_id(display_name))
      `)
      .eq('child_thread_id', id)
      .maybeSingle(),
    // Child branches — many. Just need title + parent_reply_id for indicators.
    supabase
      .from('thread_branches')
      .select(`
        id, parent_reply_id,
        child_thread:threads!child_thread_id(id, title, thread_type)
      `)
      .eq('parent_thread_id', id)
      .order('branched_at', { ascending: true }),
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

  // Normalise branch metadata. Supabase hint joins can return arrays —
  // these joins are 1:1 so flatten to a single object or null.
  type ParentBranchShape = {
    id: string
    parent_reply_id: string | null
    parent_thread: { id: string; title: string; author: { display_name: string } | null } | null
    parent_reply: { id: string; body: string; author: { display_name: string } | null } | null
  }
  type ChildBranchShape = {
    id: string
    parent_reply_id: string | null
    child_thread: { id: string; title: string; thread_type: string } | null
  }
  function flatten<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null
    if (Array.isArray(value)) return value[0] ?? null
    return value
  }
  const parent = parentBranch
    ? (() => {
        const p = parentBranch as unknown as ParentBranchShape
        const pt = flatten(p.parent_thread) as ParentBranchShape['parent_thread']
        const pr = flatten(p.parent_reply) as ParentBranchShape['parent_reply']
        if (!pt) return null
        return {
          parentReplyId: p.parent_reply_id,
          parentThreadId: pt.id,
          parentThreadTitle: pt.title,
          parentAuthorName: flatten(pt.author)?.display_name || 'Someone',
          parentReplyExcerpt: pr
            ? {
                body: pr.body,
                authorName: flatten(pr.author)?.display_name || 'Someone',
              }
            : null,
        }
      })()
    : null

  const branches = ((childBranches || []) as unknown as ChildBranchShape[]).flatMap((b) => {
    const ct = flatten(b.child_thread)
    if (!ct) return []
    return [{
      id: b.id,
      parentReplyId: b.parent_reply_id,
      childThreadId: ct.id,
      childThreadTitle: ct.title,
      childThreadType: ct.thread_type,
    }]
  })

  // Branches grouped by their source — those that branched from the OP (parent_reply_id IS NULL)
  // and those that branched from a specific reply.
  const opBranches = branches.filter((b) => b.parentReplyId === null)
  const replyBranches = branches.filter((b) => b.parentReplyId !== null)

  // Passage reference (§4.7) — when a passage_pick thread leads with a markdown
  // blockquote, lift it out and render it as a structured element above the
  // body. Strip it from the rendered body so it doesn't appear twice.
  // Pattern: '> "..." — *§N, ...*' OR a generic leading '> ...' line.
  let passageReference: { quote: string; attribution: string | null } | null = null
  let displayBody = thread.body
  if (thread.thread_type === 'passage_pick') {
    const fancy = thread.body.match(/^>\s*"(.+?)"\s*(?:—\s*\*(.+?)\*)?\s*\n+/m)
    if (fancy) {
      passageReference = { quote: fancy[1], attribution: fancy[2] || null }
      displayBody = thread.body.slice(fancy[0].length)
    } else {
      // Fallback: any leading blockquote line(s)
      const generic = thread.body.match(/^((?:>\s+.*(?:\n|$))+)/)
      if (generic) {
        const quote = generic[1].replace(/^>\s+/gm, '').trim()
        if (quote) {
          passageReference = { quote, attribution: null }
          displayBody = thread.body.slice(generic[0].length).trimStart()
        }
      }
    }
  }

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

        {/* Branched-from breadcrumb (§4.5) — appears at the top of any thread
            that descends from another. Shows the parent thread + a short
            excerpt of the originating reply (if any). */}
        {parent && (
          <div
            className="mb-6 px-4 py-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(var(--accent-purple-rgb), 0.06)',
              borderLeft: '3px solid var(--accent-purple)',
            }}
          >
            <p className="text-eyebrow mb-1" style={{ color: 'var(--accent-purple)' }}>
              Branched from
            </p>
            <Link
              href={`/threads/${parent.parentThreadId}${
                parent.parentReplyId ? `#reply-${parent.parentReplyId}` : ''
              }`}
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {parent.parentThreadTitle}
            </Link>
            {parent.parentReplyExcerpt && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                <em>{parent.parentReplyExcerpt.authorName}</em>
                {' — '}
                &ldquo;
                {parent.parentReplyExcerpt.body.length > 100
                  ? parent.parentReplyExcerpt.body.slice(0, 100) + '…'
                  : parent.parentReplyExcerpt.body}
                &rdquo;
              </p>
            )}
          </div>
        )}

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

          {/* Source passage (§4.7) — when a passage_pick thread leads with a
              markdown blockquote, render it as a structured element above the
              body. Was previously buried in the body as raw markdown. */}
          {passageReference && (
            <div
              className="mb-6 px-5 py-4 rounded-lg"
              style={{
                borderLeft: '3px solid var(--accent-purple)',
                backgroundColor: 'rgba(var(--accent-purple-rgb), 0.06)',
              }}
            >
              <p className="text-eyebrow mb-2" style={{ color: 'var(--accent-purple)' }}>
                Passage from the reading
              </p>
              <p
                className="text-base italic mb-2"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: "'Lora', Georgia, serif",
                  lineHeight: 1.6,
                }}
              >
                &ldquo;{passageReference.quote}&rdquo;
              </p>
              {passageReference.attribution && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  — {passageReference.attribution}
                </p>
              )}
              {contextDocSlug && contextChapterNum && (
                <Link
                  href={`/reading/${contextDocSlug}/${contextChapterNum}`}
                  className="inline-block mt-2 text-xs font-medium"
                  style={{ color: 'var(--accent-red)' }}
                >
                  Open in chapter →
                </Link>
              )}
            </div>
          )}

          {/* Thread Body */}
          <MarkdownBody content={displayBody} className="thread-body" />

          {/* Branched-into indicators (§4.4) — show child threads that
              spawned from this OP. Replies have their own indicators
              rendered inside ReplySection. */}
          {opBranches.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              {opBranches.map((b) => (
                <Link
                  key={b.id}
                  href={`/threads/${b.childThreadId}`}
                  className="text-xs flex items-center gap-1.5 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span aria-hidden>🌱</span>
                  <span>
                    branched into{' '}
                    <span style={{ color: 'var(--accent-purple)' }}>{b.childThreadTitle}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}

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

          {/* Action row — Branch (any user) + Edit/Delete (author/admin) */}
          <div
            className="mt-6 pt-4 flex items-center gap-3 flex-wrap"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            {user && (
              <OpBranchButton
                parentThreadId={thread.id}
                parentThreadTitle={thread.title}
                parentAuthor={authorName}
                parentBody={thread.body}
                groupId={thread.group_id}
              />
            )}
            {(isAuthor || isAdmin) && (
              <ThreadActions
                threadId={thread.id}
                isAuthor={isAuthor}
                isAdmin={isAdmin}
              />
            )}
          </div>
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
          replyBranches={replyBranches.map((b) => ({
            id: b.id,
            parentReplyId: b.parentReplyId as string,
            childThreadId: b.childThreadId,
            childThreadTitle: b.childThreadTitle,
          }))}
          groupId={thread.group_id}
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

        {/* Branches sidebar block (§4.7) — show parent + children when relevant. */}
        {(parent || branches.length > 0) && (
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3 className="text-eyebrow mb-3" style={{ color: 'var(--accent-purple)' }}>
              Conversation graph
            </h3>
            {parent && (
              <div className="mb-3">
                <p className="text-[11px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Parent thread
                </p>
                <Link
                  href={`/threads/${parent.parentThreadId}`}
                  className="text-xs leading-snug hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ← {parent.parentThreadTitle}
                </Link>
              </div>
            )}
            {branches.length > 0 && (
              <div>
                <p className="text-[11px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {branches.length} {branches.length === 1 ? 'branch' : 'branches'} from this thread
                </p>
                <ul className="space-y-1">
                  {branches.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/threads/${b.childThreadId}`}
                        className="text-xs leading-snug hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        🌱 {b.childThreadTitle}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
