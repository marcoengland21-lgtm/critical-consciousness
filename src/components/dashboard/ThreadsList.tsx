/**
 * ThreadsList — chunk 3b piece 4.
 *
 * "What the group is talking about" widget per frame 13D. Single-
 * column hairline-divided list of recent threads with type chip,
 * Lora-italic title, reply count, author, and time.
 *
 *   What the group is talking about                    All threads →
 *
 *   ─────────────────────────────────────────────────────────────────
 *   DISCUSSION  Marx says "queer thing" …    4↩       Liz       2h
 *   PASSAGE     The labour-time equation …    2↩    Daniel     5h
 *   …
 *   ─────────────────────────────────────────────────────────────────
 */

import Link from 'next/link'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import type { ThreadType } from '@/types/database'

export interface ThreadRow {
  id: string
  title: string
  thread_type: ThreadType
  created_at: string
  pinned: boolean
  author: { display_name: string } | null
  reply_count: number
}

interface ThreadsListProps {
  threads: ThreadRow[]
}

export default function ThreadsList({ threads }: ThreadsListProps) {
  return (
    <section aria-label="Recent threads">
      <div className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
        <h2
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '1.5rem',
            lineHeight: 1.2,
          }}
        >
          What the group is talking about
        </h2>
        <Link
          href="/threads"
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: 'var(--accent-red)' }}
        >
          All threads →
        </Link>
      </div>

      {threads.length === 0 ? (
        <div
          className="text-center py-8 px-4"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <p
            className="text-sm mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            The conversation starts here
          </p>
          <p
            className="text-xs mb-3 mx-auto"
            style={{ color: 'var(--text-secondary)', maxWidth: '40ch' }}
          >
            What&apos;s on your mind after this week&apos;s reading?
          </p>
          <Link href="/threads/new" className="btn-primary text-sm">
            Start a thread
          </Link>
        </div>
      ) : (
        <ul style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {threads.map((t) => (
            <li
              key={t.id}
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Link
                href={`/threads/${t.id}`}
                className="flex items-center gap-3 px-2 py-2.5 transition-colors hover-bg-themed"
              >
                <ThreadTypeBadge type={t.thread_type} />
                <h3
                  className="flex-1 min-w-0 truncate"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: '0.9375rem',
                  }}
                >
                  {t.title}
                </h3>
                {t.reply_count > 0 && (
                  <span
                    className="text-xs shrink-0 flex items-center gap-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t.reply_count}
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="9 17 4 12 9 7" />
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                    </svg>
                  </span>
                )}
                <span
                  className="text-xs shrink-0 hidden sm:inline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t.author?.display_name ?? 'Guest'}
                </span>
                <span
                  className="text-xs shrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <TimeAgo date={t.created_at} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
