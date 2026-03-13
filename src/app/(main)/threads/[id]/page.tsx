import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import ReplySection from '@/components/threads/ReplySection'
import ThreadActions from '@/components/threads/ThreadActions'
import MarkdownBody from '@/components/ui/MarkdownBody'
import type { ThreadType } from '@/types/database'

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch thread with author
  const { data: thread, error } = await supabase
    .from('threads')
    .select('*, author:profiles!author_id(id, display_name, role)')
    .eq('id', id)
    .single()

  if (error || !thread) {
    notFound()
  }

  // Fetch all replies for this thread with authors
  const { data: replies } = await supabase
    .from('replies')
    .select('*, author:profiles!author_id(id, display_name, role)')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })

  // Fetch user profile for checking admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()

  // Try to find chapter context from thread body (look for quote pattern from reading)
  let contextChapter = null
  let contextDocSlug = null
  const blockquoteMatch = thread.body.match(/> "(.+?)" — \*§(\d+), (.+?)\*/)
  if (blockquoteMatch) {
    const chapterNum = parseInt(blockquoteMatch[2])
    // Fetch chapter info to get document slug
    const { data: chapters } = await adminClient
      .from('text_chapters')
      .select('id, chapter_number, document_id')
      .eq('chapter_number', chapterNum)
      .limit(1)

    if (chapters && chapters.length > 0) {
      const chapterId = chapters[0].id
      const docId = chapters[0].document_id

      // Get document slug
      const { data: docs } = await adminClient
        .from('text_documents')
        .select('slug')
        .eq('id', docId)
        .single()

      if (docs) {
        contextChapter = chapterId
        contextDocSlug = docs.slug
      }
    }
  }

  const isAuthor = user?.id === thread.author_id
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="max-w-3xl mx-auto">
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
        <div className="flex items-center gap-2 mb-3">
          {thread.pinned && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}>
              Pinned
            </span>
          )}
          <ThreadTypeBadge type={thread.thread_type as ThreadType} />
        </div>

        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--accent-red)' }}>
          {thread.title}
        </h1>

        <div className="flex items-center gap-3 mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {thread.author?.display_name}
          </span>
          {thread.author?.role === 'admin' && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--bg-card)' }}>
              admin
            </span>
          )}
          <span>·</span>
          <TimeAgo date={thread.created_at} />
        </div>

        {/* Thread Body */}
        <MarkdownBody content={thread.body} className="thread-body" />

        {/* View in context link (if thread was created from a passage) */}
        {contextChapter && contextDocSlug && (
          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <Link
              href={`/reading/${contextDocSlug}/${thread.body.match(/§(\d+)/)?.[1] || '1'}`}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--accent-red)' }}
            >
              View in context ↗
            </Link>
          </div>
        )}

        {/* Thread Actions (edit/delete for author/admin) */}
        {(isAuthor || isAdmin) && (
          <ThreadActions threadId={thread.id} isAuthor={isAuthor} isAdmin={isAdmin} />
        )}
      </article>

      {/* Divider */}
      <hr className="mb-8" style={{ borderColor: 'var(--border-default)' }} />

      {/* Replies */}
      <ReplySection
        threadId={thread.id}
        replies={replies || []}
        currentUserId={user?.id || ''}
        isAdmin={isAdmin}
      />
    </div>
  )
}