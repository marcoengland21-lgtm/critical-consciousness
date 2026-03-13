import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import ReplySection from '@/components/threads/ReplySection'
import ThreadActions from '@/components/threads/ThreadActions'
import type { ThreadType } from '@/types/database'

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
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

  const isAuthor = user?.id === thread.author_id
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/threads"
        className="inline-flex items-center text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-warm-gray)' }}
      >
        ← Back to Threads
      </Link>

      {/* Thread Header */}
      <article className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {thread.pinned && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--color-muted-gold)', color: 'var(--color-dark-brown)' }}>
              Pinned
            </span>
          )}
          <ThreadTypeBadge type={thread.thread_type as ThreadType} />
        </div>

        <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-deep-red)' }}>
          {thread.title}
        </h1>

        <div className="flex items-center gap-3 mb-6 text-sm" style={{ color: 'var(--color-warm-gray)' }}>
          <span className="font-medium" style={{ color: 'var(--color-dark-brown)' }}>
            {thread.author?.display_name}
          </span>
          {thread.author?.role === 'admin' && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-soft-sage)', color: 'white' }}>
              admin
            </span>
          )}
          <span>·</span>
          <TimeAgo date={thread.created_at} />
        </div>

        {/* Thread Body */}
        <div
          className="prose-content whitespace-pre-wrap"
          style={{ color: 'var(--color-dark-brown)' }}
        >
          {thread.body}
        </div>

        {/* Thread Actions (edit/delete for author/admin) */}
        {(isAuthor || isAdmin) && (
          <ThreadActions threadId={thread.id} isAuthor={isAuthor} isAdmin={isAdmin} />
        )}
      </article>

      {/* Divider */}
      <hr className="mb-8" style={{ borderColor: '#e5e1d8' }} />

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