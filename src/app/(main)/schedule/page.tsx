import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import RoleBadge from '@/components/roles/RoleBadge'
import SessionNotes from '@/components/schedule/SessionNotes'
import type { WeeklyRoleType } from '@/types/database'

export const metadata = {
  title: 'Reading Schedule | Critical Consciousness',
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: weeks } = await supabase
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

  // Determine current week (closest upcoming due_date)
  const now = new Date()
  const currentWeek = weeks?.find((w: any) => new Date(w.due_date) >= now) || weeks?.[weeks.length - 1]

  if (!weeks || weeks.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
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
      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
        Reading Schedule
      </h1>

      <div className="space-y-6">
        {weeks.map((week: any) => {
          const isCurrent = currentWeek?.id === week.id
          const isPast = new Date(week.due_date) < now && !isCurrent
          const dueDate = new Date(week.due_date)
          const sessionDate = week.session_date ? new Date(week.session_date) : null
          const prompts = week.discussion_prompts?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

          return (
            <div
              key={week.id}
              className="rounded-lg border-2 overflow-hidden transition-all"
              style={{
                borderColor: isCurrent ? 'var(--accent-purple)' : isPast ? 'var(--border-strong)' : 'var(--border-default)',
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
                        className="text-xs font-bold uppercase tracking-wide"
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
                    <div>Due: {dueDate.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</div>
                    {sessionDate && (
                      <div className="mt-0.5">
                        Session: {sessionDate.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}
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
                      {week.weekly_roles.map((role: any) => (
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
                      {prompts.map((prompt: any) => (
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
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--accent-purple)' }}>
                      Get a head start
                    </p>
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      Start reading early or browse the glossary to prepare for this week.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/reading/capital-vol-1/${week.week_number}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
                      >
                        Start Reading
                      </Link>
                      <Link
                        href="/glossary"
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
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
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
                      >
                        Read and Annotate
                      </Link>
                      <Link
                        href={`/threads?week=${week.id}`}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
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
          )
        })}
      </div>
    </div>
  )
}
