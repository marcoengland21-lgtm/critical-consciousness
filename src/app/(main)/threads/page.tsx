import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import type { ThreadType } from '@/types/database'

// Author badge component with color-coded initials
function AuthorBadge({ name }: { name: string }) {
  const colors = [
    '#a31545', '#2e7d6e', '#6b4c9a', '#7b6b3d',
    '#6B4C7D', '#2D7A8A', '#8A4B3D', '#4A7B4F',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = colors[Math.abs(hash) % colors.length]
  const initial = name.charAt(0).toUpperCase()

  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--color-dark-brown)' }}>
        {name}
      </span>
    </span>
  )
}

export const metadata = {
  title: 'Discussion Threads | Critical Consciousness',
}

// Strip markdown and plain text preview
function getTextPreview(text: string, maxLines: number = 3): string {
  // Remove markdown formatting
  let plain = text
    .replace(/^>\s+/gm, '') // Remove blockquotes
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/^#+\s+/gm, '') // Remove headers
    .split('\n')
    .filter(line => line.trim())
    .slice(0, maxLines)
    .join(' ')

  return plain.length > 200 ? plain.slice(0, 200) + '...' : plain
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
          <p className="text-lg mb-2" style={{ color: 'var(--color-dark-brown)' }}>
            The conversation starts here
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-warm-gray)' }}>
            What&apos;s on your mind after this week&apos;s reading?
          </p>
          <Link
            href="/threads/new"
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-deep-red)',
              color: 'var(--color-warm-cream)',
            }}
          >
            Start a Discussion
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread: any) => {
            const replyCount = thread.replies?.[0]?.count ?? 0
            const preview = getTextPreview(thread.body || '')
            return (
              <Link
                key={thread.id}
                href={`/threads/${thread.id}`}
                className="block p-5 rounded-lg border transition-all card-hover"
                style={{
                  backgroundColor: 'white',
                  borderColor: thread.pinned ? 'var(--color-muted-gold)' : '#e2dfe8',
                  borderWidth: thread.pinned ? '2px' : '1px',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {thread.pinned && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--color-muted-gold)', color: 'var(--color-dark-brown)' }}>
                          Pinned
                        </span>
                      )}
                      <ThreadTypeBadge type={thread.thread_type as ThreadType} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-dark-brown)' }}>
                      {thread.title}
                    </h3>
                    {preview && (
                      <p className="text-sm mb-3" style={{ color: 'var(--color-warm-gray)' }}>
                        {preview}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <AuthorBadge name={thread.author?.display_name || 'Guest'} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap" style={{ color: 'var(--color-warm-gray)' }}>
                        <TimeAgo date={thread.created_at} />
                        <span>·</span>
                        <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                      </div>
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