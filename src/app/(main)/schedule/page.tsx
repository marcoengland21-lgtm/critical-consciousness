import { createClient, getSessionUser } from '@/lib/supabase/server'
import Link from 'next/link'
import RoleBadge from '@/components/roles/RoleBadge'
import SessionNotes from '@/components/schedule/SessionNotes'
import type { WeeklyRoleType } from '@/types/database'

// Query-specific join shapes for Supabase responses
interface WeeklyRoleRow {
  id: string
  role_type: string
  user: { id: string; display_name: string } | null
}

interface DiscussionPrompt {
  id: string
  prompt_text: string
  sort_order: number
}

interface ScheduleWeek {
  id: string
  week_number: number
  title: string
  due_date: string
  session_date: string | null
  session_location: string | null
  zoom_link: string | null
  chapter_ref: string | null
  page_start: number | null
  page_end: number | null
  description: string | null
  weekly_roles: WeeklyRoleRow[] | null
  discussion_prompts: DiscussionPrompt[] | null
}

export const metadata = {
  title: 'Reading Schedule | Capital Study Group',
}

export default async function SchedulePage() {
  const user = await getSessionUser()
  const supabase = await createClient()

  const { data: weeks, error: weeksError } = await supabase
    .from('reading_schedule')
    .select(`
      *,
      weekly_roles(
        id, role_type,
        user:profiles!user_id(id, display_name)
      ),
      discussion_prompts(
        id, prompt_text, sort_order
      )
    `)
    .order('week_number', { ascending: true })

  if (weeksError) {
    console.error('[CCP] Schedule page — query error:', weeksError)
  }

  // Determine current week (closest upcoming due_date)
  const now = new Date()
  const typedWeeks = (weeks || []) as unknown as ScheduleWeek[]
  const currentWeek = typedWeeks.find((w) => new Date(w.due_date) >= now) || typedWeeks[typedWeeks.length - 1]

  if (typedWeeks.length === 0) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
          Reading Schedule
        </h1>
        <div className="text-center py-16">
          <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            The schedule is on its way
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The reading schedule will appear here once your facilitator sets it up. In the meantime, explore the platform.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
        Reading Schedule
      </h1>

      <div className="relative">
        {/* Timeline vertical line — hidden on mobile */}
        <div
          className="absolute left-4 top-0 bottom-0 w-0.5 hidden sm:block"
          style={{ backgroundColor: 'var(--border-default)' }}
        />

        <div className="space-y-6 sm:pl-12">
        {typedWeeks.map((week) => {
          const isCurrent = currentWeek?.id === week.id
          const isPast = new Date(week.due_date) < now && !isCurrent
          const dueDate = new Date(week.due_date)
          const sessionDate = week.session_date ? new Date(week.session_date) : null
          const prompts = [...(week.discussion_prompts || [])].sort((a, b) => a.sort_order - b.sort_order)

          return (
            <div key={week.id} className="relative">
              {/* Timeline node — circular indicator */}
              <div
                className="absolute -left-12 top-6 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold hidden sm:flex z-10"
                style={{
                  backgroundColor: isCurrent
                    ? 'var(--accent-amber)'
                    : isPast
                      ? 'var(--accent-green)'
                      : 'var(--bg-card)',
                  color: isCurrent || isPast ? '#fff' : 'var(--text-secondary)',
                  border: isCurrent
                    ? '3px solid rgba(var(--accent-amber-rgb), 0.3)'
                    : isPast
                      ? 'none'
                      : '2px dashed var(--border-strong)',
                  boxShadow: isCurrent ? '0 0 12px rgba(var(--accent-amber-rgb), 0.3)' : 'none',
                }}
              >
                {isPast ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  week.week_number
                )}
              </div>

            <div
              className="card-base transition-all"
              style={{
                borderColor: isCurrent ? 'var(--accent-purple)' : isPast ? 'var(--border-strong)' : undefined,
                borderWidth: isCurrent ? '2px' : undefined,
                opacity: isPast ? 0.7 : 1,
              }}
            >
              {/* Week Header */}
              <div
                className="px-6 py-4"
                style={{
                  backgroundColor: isCurrent ? 'var(--bg-header)' : 'var(--bg-card)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className="text-xs font-bold tracking-wide"
                        style={{ color: isCurrent ? 'var(--accent-purple)' : 'var(--text-secondary)' }}
                      >
                        Week {week.week_number}
                      </span>
                      {isCurrent && (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-inverse)' }}
                        >
                          Current
                        </span>
                      )}
                      {isPast && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Completed
                        </span>
                      )}
                    </div>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: isCurrent ? 'var(--text-inverse)' : 'var(--text-primary)' }}
                    >
                      {week.title}
                    </h2>
                  </div>
                  <div className="text-right text-sm" style={{ color: isCurrent ? 'var(--text-inverse)' : 'var(--text-secondary)' }}>
                    <div>Due: {dueDate.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })}</div>
                    {sessionDate && (
                      <div className="mt-0.5">
                        Session: {sessionDate.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Week Details */}
              <div className="px-6 py-4 space-y-4" style={{ backgroundColor: isCurrent ? 'var(--bg-card-alt)' : 'var(--bg-card)' }}>
                {/* Reading info */}
                {(week.chapter_ref || week.description) && (
                  <div>
                    {week.chapter_ref && (
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        {week.chapter_ref}
                        {week.page_start && week.page_end && (
                          <span style={{ color: 'var(--text-secondary)' }}> (pp. {week.page_start}–{week.page_end})</span>
                        )}
                      </p>
                    )}
                    {week.description && (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {week.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Session Info */}
                {(week.session_location || week.zoom_link) && (
                  <div className="flex flex-wrap gap-3 text-sm">
                    {week.session_location && (
                      <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        {week.session_location}
                      </span>
                    )}
                    {week.zoom_link && (
                      <a
                        href={week.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 underline"
                        style={{ color: 'var(--accent-red)' }}
                      >
                        Join Online
                      </a>
                    )}
                  </div>
                )}

                {/* Roles */}
                {week.weekly_roles && week.weekly_roles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      Roles This Week
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(week.weekly_roles as unknown as WeeklyRoleRow[]).map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border"
                          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
                        >
                          <RoleBadge type={role.role_type as WeeklyRoleType} />
                          <span style={{ color: 'var(--text-primary)' }}>
                            {role.user?.display_name}
                          </span>
                          {role.user?.id === user?.id && (
                            <span className="text-xs font-medium" style={{ color: 'var(--accent-red)' }}>(You)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discussion Prompts */}
                {prompts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                      Discussion Prompts
                    </h3>
                    <ol className="space-y-2 list-decimal list-inside">
                      {prompts.map((prompt) => (
                        <li key={prompt.id} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {prompt.prompt_text}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Session Notes */}
                <SessionNotes weekId={week.id} hasSession={!!sessionDate} />

                {/* Get a head start — for upcoming weeks */}
                {!isCurrent && !isPast && (
                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--accent-purple)', backgroundColor: 'var(--bg-card-alt)' }}>
                    <p className="text-xs font-semibold tracking-wide mb-1" style={{ color: 'var(--accent-purple)' }}>
                      Get a head start
                    </p>
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Start reading early or browse the glossary to prepare for this week.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/reading/capital-vol-1/${week.week_number}`}
                        className="btn-primary text-sm px-3 py-1.5"
                      >
                        Start Reading
                      </Link>
                      <Link
                        href="/glossary"
                        className="btn-secondary text-sm px-3 py-1.5"
                      >
                        Browse Key Terms
                      </Link>
                    </div>
                  </div>
                )}

                {/* Read now — for current week */}
                {isCurrent && (
                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--accent-red)', backgroundColor: 'var(--bg-card-alt)' }}>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/reading/capital-vol-1/${week.week_number}`}
                        className="btn-primary text-sm"
                      >
                        Read and Annotate
                      </Link>
                      <Link
                        href={`/threads?week=${week.id}`}
                        className="btn-secondary text-sm"
                      >
                        View Discussions
                      </Link>
                    </div>
                  </div>
                )}

                {/* Thread links — for past weeks */}
                {isPast && (
                  <div className="pt-2">
                    <Link
                      href={`/threads?week=${week.id}`}
                      className="text-sm font-medium transition-colors"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      View Week {week.week_number} Threads
                    </Link>
                  </div>
                )}
              </div>
            </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
