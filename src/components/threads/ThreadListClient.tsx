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
  /** Number of threads branched FROM this thread (per IMPROVEMENTS_PLAN §4.6).
      Surfaced alongside replyCount in the card footer. */
  branchCount: number
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
  /** Active group context (L1) — scopes the realtime subscription. */
  groupId: string
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

/**
 * ThreadCard — single thread row in the threads list.
 *
 * Per IMPROVEMENTS_PLAN §4.6 + §13.1, threads now render as hairline-divided
 * rows rather than bordered card boxes. Pinned/active state is communicated
 * via a left accent stripe and a small inline tag, not a full border.
 */
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

  // Left accent stripe — communicates pinned/active state without a full border
  const stripeColor = thread.pinned
    ? 'var(--accent-purple)'
    : activity === 'active'
      ? 'var(--accent-green)'
      : 'transparent'

  return (
    <Link
      href={`/threads/${thread.id}`}
      className="block px-5 py-4 transition-colors hover-bg-themed"
      style={{
        borderLeft: `3px solid ${stripeColor}`,
        opacity: activity === 'cooling' ? 0.7 : 1,
      }}
    >
      {/* Top row: type badge + small inline tags (pinned, active, week) */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <ThreadTypeBadge type={thread.thread_type} />
        {thread.pinned && (
          <span className="text-eyebrow" style={{ color: 'var(--accent-purple)' }}>
            Pinned
          </span>
        )}
        {activity === 'active' && (
          <span className="text-eyebrow" style={{ color: 'var(--accent-green)' }}>
            Active
          </span>
        )}
        {week && (
          <span className="text-eyebrow">
            Week {week.week_number}
          </span>
        )}
      </div>

      {/* Title — Lora italic per §4.6 */}
      <h3
        className="mb-1.5 leading-snug"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: '1.25rem',
          lineHeight: 1.3,
        }}
      >
        {thread.title}
      </h3>

      {/* Body preview — 2-3 lines */}
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

      {/* Footer: author + metadata + reply count */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AuthorAvatar name={thread.author?.display_name || 'Guest'} size={22} />
          <span
            className="text-xs font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {thread.author?.display_name || 'Guest'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>·</span>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
            <TimeAgo date={thread.created_at} />
          </span>
          {thread.lastReply && activity === 'recent' && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>·</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                last reply <TimeAgo date={thread.lastReply.created_at} />
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {thread.replyCount > 0 && (
            <span>
              {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
          {thread.branchCount > 0 && (
            <span>
              🌱 {thread.branchCount} {thread.branchCount === 1 ? 'branch' : 'branches'}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ThreadListClient({
  initialThreads,
  weeks,
  initialType,
  initialWeek,
  groupId,
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

  // Realtime subscription for new threads — L1: filter to active group so
  // we don't get firehose events from other groups (RLS would still block
  // the actual read, but cheaper to never receive the event in the first place).
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`threads-realtime:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'threads',
          filter: `group_id=eq.${groupId}`,
        },
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
              branchCount: 0, // freshly inserted thread can't have branches yet
              lastReply: null,
            }
            setThreads((prev) => [newThread, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'threads',
          // DELETE events don't carry NEW columns; this filter applies to
          // OLD row's group_id which Postgres ships in DELETE payloads.
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          setThreads((prev) => prev.filter((t) => t.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

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
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-eyebrow mb-2">Group Conversation</p>
          <h1
            className="text-display-lg"
            style={{ color: 'var(--text-primary)' }}
          >
            Discussion Threads
          </h1>
        </div>
        <Link href="/threads/new" className="btn-primary text-sm shrink-0">
          Start a thread
        </Link>
      </div>

      {/* Filter bar — compressed per §4.6.
          Filter pills become smaller ghost-style buttons. Sort + week selectors
          drop into a tighter right-aligned group. The whole row is a single
          right-aligned line above the thread list, not a header that eats
          vertical space. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 text-xs">
        {/* Type filters — small text-button style, not pills */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {threadTypes.map((t) => {
            const isActive = typeFilter === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className="transition-colors"
                style={{
                  color: isActive ? 'var(--accent-red)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Sort + Week filter */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input-base text-xs px-2 py-1"
          >
            <option value="newest">Newest</option>
            <option value="active">Most Active</option>
            <option value="replies">Most Replies</option>
          </select>

          {weeks.length > 0 && (
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="input-base text-xs px-2 py-1"
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

      {/* Thread list — single column, hairline-divided rows per §4.6 + §13.1.
          Replaces the 2-column card grid. Per Rule 25, the empty state is an
          invitation, not an error message. */}
      {displayThreads.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-display-sm mb-2" style={{ color: 'var(--text-primary)' }}>
            No threads yet
          </p>
          <p className="text-sm mb-6 mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}>
            Threads grow out of what people notice while reading — annotate a passage,
            then turn the most interesting questions into a thread.
          </p>
          <Link href="/threads/new" className="btn-primary text-sm">
            Start a thread
          </Link>
        </div>
      ) : (
        <div
          className="stagger-children"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {displayThreads.map((thread) => (
            <div
              key={thread.id}
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <ThreadCard thread={thread} weekMap={weekMap} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
