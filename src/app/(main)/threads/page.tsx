import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import type { ThreadType } from '@/types/database'

export const metadata = {
  title: 'Discussion Threads | Critical Consciousness',
}

export default async function ThreadsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; week?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('threads')
    .select(`
      *,
      author:profiles!author_id(id, display_name, role),
      replies:replies(count)
    `)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (params.type) {
    query = query.eq('thread_type', params.type)
  }
  if (params.week) {
    query = query.eq('week_id', params.week)
  }

  const { data: threads, error } = await query

  const threadTypes: { value: string; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'discussion', label: 'Discussion' },
    { value: 'reflection', label: 'Reflection' },
    { value: 'summary', label: 'Summary' },
    { value: 'passage_pick', label: 'Passage Pick' },
    { value: 'connection', label: 'Connection' },
    { value: 'general', label: 'General' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-deep-red)' }}>
          Discussion Threads
        </h1>
        <Link
          href="/threads/new"
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-deep-red)',
            color: 'var(--color-warm-cream)',
          }}
        >
          New Thread
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {threadTypes.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/threads?type=${t.value}` : '/threads'}
            className="px-3 py-1 rounded-full text-sm font-medium transition-colors border"
            style={{
              backgroundColor: params.type === t.value || (!params.type && !t.value)
                ? 'var(--color-dark-brown)' : 'white',
              color: params.type === t.value || (!params.type && !t.value)
                ? 'var(--color-warm-cream)' : 'var(--color-dark-brown)',
              borderColor: 'var(--color-warm-gray)',
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Thread List */}
      {!threads || threads.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg mb-2" style={{ color: 'var(--color-warm-gray)' }}>
            No threads yet
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-warm-gray)' }}>
            Start a discussion to get the conversation going.
          </p>
          <Link
            href="/threads/new"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-deep-red)',
              color: 'var(--color-warm-cream)',
            }}
          >
            Create the First Thread
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread: any) => {
            const replyCount = thread.replies?.[0]?.count ?? 0
            return (
              <Link
                key={thread.id}
                href={`/threads/${thread.id}`}
                className="block p-5 rounded-lg border transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'white',
                  borderColor: thread.pinned ? 'var(--color-muted-gold)' : '#e5e1d8',
                  borderWidth: thread.pinned ? '2px' : '1px',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {thread.pinned && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--color-muted-gold)', color: 'var(--color-dark-brown)' }}>
                          Pinned
                        </span>
                      )}
                      <ThreadTypeBadge type={thread.thread_type as ThreadType} />
                    </div>
                    <h3 className="text-lg font-semibold mb-1 truncate" style={{ color: 'var(--color-dark-brown)' }}>
                      {thread.title}
                    </h3>
                    <p className="text-sm line-clamp-2 mb-2" style={{ color: 'var(--color-warm-gray)' }}>
                      {thread.body}
                    </p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                      <span className="font-medium">{thread.author?.display_name}</span>
                      <span>·</span>
                      <TimeAgo date={thread.created_at} />
                      <span>·</span>
                      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}