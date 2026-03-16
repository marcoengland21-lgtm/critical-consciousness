'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ThreadTypeBadge, { threadTypeConfig } from './ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import type { ThreadType } from '@/types/database'

// ── Types ───────────────────────────────────────────────────────────────────

interface ThreadData {
  id: string
  title: string
  body: string
  thread_type: ThreadType
  pinned: boolean
  created_at: string
  week_id: string | null
  author: { id: string; display_name: string }
  replyCount: number
  lastReply: { created_at: string; authorName: string } | null
}

interface WeekData {
  id: string
  week_number: number
  title: string
}

interface ThreadListClientProps {
  initialThreads: ThreadData[]
  weeks: WeekData[]
  initialType: string | null
  initialWeek: string | null
}

type SortOption = 'newest' | 'active' | 'replies'

// ── Author Badge ────────────────────────────────────────────────────────────

import { hashColor } from '@/lib/author-colors'

function AuthorAvatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: hashColor(name),
        fontSize: size < 28 ? '10px' : '12px',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// ── Text Preview ────────────────────────────────────────────────────────────

function getTextPreview(text: string): string {
  let plain = text
    .replace(/^>\s+".*?".*$/gm, '') // Remove blockquote lines
    .replace(/^>\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 3)
    .join(' ')

  return plain.length > 200 ? plain.slice(0, 200) + '…' : plain
}

// Extract blockquote for passage_pick threads
function getPassageQuote(body: string): string | null {
  const match = body.match(/>\s+"(.+?)"/)
  if (match) {
    const quote = match[1]
    return quote.length > 120 ? quote.slice(0, 120) + '…' : quote
  }
  return null
}

// ── Activity Helpers ────────────────────────────────────────────────────────

function getActivityStatus(thread: ThreadData): 'active' | 'recent' | 'cooling' | 'normal' {
  const lastActivity = thread.lastReply?.created_at || thread.created_at
  const hoursAgo = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)

  if (hoursAgo < 1) return 'active'
  if (hoursAgo < 24) return 'recent'
  if (hoursAgo > 72) return 'cooling'
  return 'normal'
}

// ── Thread Card ─────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  weekMap,
}: {
  thread: ThreadData
  weekMap: Map<string, WeekData>
}) {
  const activity = getActivityStatus(thread)
  const preview = getTextPreview(thread.body || '')
  const passageQuote =
    thread.thread_type === 'passage_pick' ? getPassageQuote(thread.body || '') : null
  const week = thread.week_id ? weekMap.get(thread.week_id) : null

  return (
    <Link
      href={`/threads/${thread.id}`}
      className={`block p-5 rounded-xl border transition-all card-hover ${
        thread.pinned ? 'lg:col-span-2' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: thread.pinned
          ? 'var(--accent-purple)'
          : activity === 'active'
            ? 'var(--accent-green)'
            : 'var(--border-default)',
        borderWidth: thread.pinned || activity === 'active' ? '2px' : '1px',
        opacity: activity === 'cooling' ? 0.7 : 1,
      }}
    >
      {/* Top: badges */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        {thread.pinned && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--accent-purple)',
              color: 'var(--text-inverse)',
            }}
          >
            📌 Pinned
          </span>
        )}
        <ThreadTypeBadge type={thread.thread_type} />
        {week && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--bg-badge)',
              color: 'var(--text-secondary)',
            }}
          >
            Week {week.week_number}
          </span>
        )}
        {activity === 'active' && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'rgba(74, 103, 65, 0.15)',
              color: 'var(--accent-green)',
            }}
          >
            Active now
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        className="text-base font-semibold mb-1.5 leading-snug"
        style={{ color: 'var(--text-primary)' }}
      >
        {thread.title}
      </h3>

      {/* Body preview */}
      {preview && (
        <p
          className="text-sm mb-3 leading-relaxed"
          style={{
            color: 'var(--text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {preview}
        </p>
      )}

      {/* Passage pick quote preview */}
      {passageQuote && (
        <div
          className="text-xs italic mb-3 px-3 py-2 rounded-lg"
          style={{
            borderLeft: '3px solid var(--accent-purple)',
            backgroundColor: 'rgba(107, 76, 154, 0.06)',
            color: 'var(--text-secondary)',
          }}
        >
          &ldquo;{passageQuote}&rdquo;
        </div>
      )}

      {/* Footer: author + metadata */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AuthorAvatar name={thread.author?.display_name || 'Guest'} size={22} />
          <span
            className="text-xs font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {thread.author?.display_name || 'Guest'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            ·
          </span>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
            <TimeAgo date={thread.created_at} />
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Reply count */}
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {thread.replyCount > 0
              ? `💬 ${thread.replyCount} ${thread.replyCount === 1 ? 'reply' : 'replies'}`
              : 'No replies yet'}
          </span>
        </div>
      </div>

      {/* Last reply info for recent threads */}
      {thread.lastReply && activity === 'recent' && (
        <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Last reply by {thread.lastReply.authorName},{' '}
          <TimeAgo date={thread.lastReply.created_at} />
        </div>
      )}
    </Link>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ThreadListClient({
  initialThreads,
  weeks,
  initialType,
  initialWeek,
}: ThreadListClientProps) {
  const [threads, setThreads] = useState<ThreadData[]>(initialThreads)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [typeFilter, setTypeFilter] = useState(initialType || '')
  const [weekFilter, setWeekFilter] = useState(initialWeek || '')

  // Week lookup map
  const weekMap = useMemo(
    () => new Map(weeks.map((w) => [w.id, w])),
    [weeks]
  )

  // Realtime subscription for new threads
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('threads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'threads' },
        async (payload) => {
          // Fetch the new thread with author info
          const { data } = await supabase
            .from('threads')
            .select('*, author:profiles!author_id(id, display_name), replies:replies(count)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            const newThread: ThreadData = {
              id: data.id,
              title: data.title,
              body: data.body,
              thread_type: data.thread_type as ThreadType,
              pinned: data.pinned,
              created_at: data.created_at,
              week_id: data.week_id,
              author: data.author || { id: '', display_name: 'Guest' },
              replyCount: data.replies?.[0]?.count ?? 0,
              lastReply: null,
            }
            setThreads((prev) => [newThread, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'threads' },
        (payload) => {
          setThreads((prev) => prev.filter((t) => t.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter + sort
  const displayThreads = useMemo(() => {
    let filtered = threads

    if (typeFilter) {
      filtered = filtered.filter((t) => t.thread_type === typeFilter)
    }
    if (weekFilter) {
      filtered = filtered.filter((t) => t.week_id === weekFilter)
    }

    // Sort pinned to top, then by selected sort
    const pinned = filtered.filter((t) => t.pinned)
    const unpinned = filtered.filter((t) => !t.pinned)

    const sorted = [...unpinned].sort((a, b) => {
      switch (sortBy) {
        case 'active': {
          const aLast = a.lastReply?.created_at || a.created_at
          const bLast = b.lastReply?.created_at || b.created_at
          return new Date(bLast).getTime() - new Date(aLast).getTime()
        }
        case 'replies':
          return b.replyCount - a.replyCount
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return [...pinned, ...sorted]
  }, [threads, typeFilter, weekFilter, sortBy])

  const threadTypes: { value: string; label: string; color: string }[] = [
    { value: '', label: 'All Types', color: 'var(--text-primary)' },
    ...Object.entries(threadTypeConfig).map(([value, config]) => ({
      value,
      label: config.label,
      color: config.color,
    })),
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ color: 'var(--accent-red)' }}
        >
          Discussion Threads
        </h1>
        <Link href="/threads/new" className="btn-primary text-sm">
          New Thread
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Type filters */}
        <div className="flex flex-wrap gap-1.5">
          {threadTypes.map((t) => {
            const isActive = typeFilter === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className="px-3 py-1 rounded-full text-xs font-medium btn-transition border"
                style={{
                  backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isActive ? 'var(--bg-page)' : t.color,
                  borderColor: isActive ? 'var(--text-primary)' : 'var(--border-default)',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort + Week filter */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2 py-1 rounded-lg text-xs border"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <option value="newest">Newest</option>
            <option value="active">Most Active</option>
            <option value="replies">Most Replies</option>
          </select>

          {weeks.length > 0 && (
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="px-2 py-1 rounded-lg text-xs border"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <option value="">All Weeks</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Week {w.week_number}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Thread grid */}
      {displayThreads.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            The conversation starts here
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            What&apos;s on your mind after this week&apos;s reading?
          </p>
          <Link href="/threads/new" className="btn-primary text-sm">
            Start a Discussion
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          {displayThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} weekMap={weekMap} />
          ))}
        </div>
      )}
    </div>
  )
}
