'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import RoleBadge from '@/components/roles/RoleBadge'
import SessionNotes from '@/components/schedule/SessionNotes'
import type { WeeklyRoleType } from '@/types/database'

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

interface ScheduleClientProps {
  weeks: ScheduleWeek[]
  currentWeekId: string | null
  userId: string | null
}

/**
 * Interactive schedule client component.
 *
 * Handles:
 * - Auto-scroll to current week on mount
 * - Past/future weeks collapsed by default (click to expand)
 * - Current week always expanded
 * - Sticky "Jump to This Week" pill when current week is off-screen
 * - Expand All / Collapse All toggle
 */
export default function ScheduleClient({ weeks, currentWeekId, userId }: ScheduleClientProps) {
  const now = new Date()

  // Current week starts expanded, everything else collapsed
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (currentWeekId) initial.add(currentWeekId)
    return initial
  })
  const [showJumpButton, setShowJumpButton] = useState(false)
  const currentWeekRef = useRef<HTMLDivElement>(null)

  const toggleWeek = useCallback((weekId: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekId)) {
        next.delete(weekId)
      } else {
        next.add(weekId)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedWeeks(new Set(weeks.map((w) => w.id)))
  }, [weeks])

  const collapseAll = useCallback(() => {
    // Always keep current week expanded
    const next = new Set<string>()
    if (currentWeekId) next.add(currentWeekId)
    setExpandedWeeks(next)
  }, [currentWeekId])

  const allExpanded = expandedWeeks.size === weeks.length

  // Auto-scroll to current week on mount
  useEffect(() => {
    if (!currentWeekRef.current) return
    // Delay to let layout settle after hydration
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Intersection Observer for sticky "Jump to This Week" pill
  useEffect(() => {
    if (!currentWeekRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowJumpButton(!entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(currentWeekRef.current)
    return () => observer.disconnect()
  }, [])

  const scrollToCurrent = useCallback(() => {
    currentWeekRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {weeks.length} week{weeks.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs font-medium transition-colors btn-transition px-3 py-1.5 rounded-lg"
          style={{
            color: 'var(--accent-purple)',
            backgroundColor: 'var(--bg-card-alt)',
          }}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <div className="relative">
        {/* Timeline vertical line — hidden on mobile */}
        <div
          className="absolute left-4 top-0 bottom-0 w-0.5 hidden sm:block"
          style={{ backgroundColor: 'var(--border-default)' }}
        />

        <div className="space-y-3 sm:pl-12">
          {weeks.map((week) => {
            const isCurrent = currentWeekId === week.id
            const isPast = new Date(week.due_date) < now && !isCurrent
            const isExpanded = expandedWeeks.has(week.id)
            const dueDate = new Date(week.due_date)
            const sessionDate = week.session_date ? new Date(week.session_date) : null
            const prompts = [...(week.discussion_prompts || [])].sort(
              (a, b) => a.sort_order - b.sort_order
            )

            return (
              <div
                key={week.id}
                className="relative"
                ref={isCurrent ? currentWeekRef : undefined}
              >
                {/* Timeline node */}
                <div
                  className="absolute -left-12 top-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold hidden sm:flex z-10"
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
                    boxShadow: isCurrent
                      ? '0 0 12px rgba(var(--accent-amber-rgb), 0.3)'
                      : 'none',
                  }}
                >
                  {isPast ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    week.week_number
                  )}
                </div>

                {/* Week card */}
                <div
                  className="card-base transition-all"
                  style={{
                    borderColor: isCurrent
                      ? 'var(--accent-purple)'
                      : isPast
                        ? 'var(--border-strong)'
                        : undefined,
                    borderWidth: isCurrent ? '2px' : undefined,
                    opacity: isPast && !isExpanded ? 0.7 : 1,
                  }}
                >
                  {/* Compact header row — always visible, clickable to expand/collapse */}
                  <button
                    onClick={() => !isCurrent && toggleWeek(week.id)}
                    className={`w-full text-left px-5 py-3 flex items-center justify-between transition-colors ${
                      !isCurrent ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    style={{
                      backgroundColor: isCurrent
                        ? 'var(--bg-header)'
                        : isExpanded
                          ? 'var(--bg-card-alt)'
                          : 'var(--bg-card)',
                    }}
                    aria-expanded={isExpanded}
                    aria-label={`Week ${week.week_number}: ${week.title}${isCurrent ? ' (current week)' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-xs font-bold tracking-wide shrink-0"
                        style={{
                          color: isCurrent
                            ? 'var(--accent-purple)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        Week {week.week_number}
                      </span>
                      <span
                        className="text-sm font-semibold truncate"
                        style={{
                          color: isCurrent
                            ? 'var(--text-inverse)'
                            : 'var(--text-primary)',
                        }}
                      >
                        {week.title}
                      </span>
                      {isCurrent && (
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full leading-none shrink-0"
                          style={{
                            backgroundColor: 'var(--accent-purple)',
                            color: 'var(--text-inverse)',
                          }}
                        >
                          Current
                        </span>
                      )}
                      {isPast && !isExpanded && (
                        <span
                          className="text-xs shrink-0"
                          style={{ color: 'var(--accent-green)' }}
                        >
                          Completed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span
                        className="text-xs hidden sm:inline"
                        style={{
                          color: isCurrent
                            ? 'var(--text-inverse)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        {dueDate.toLocaleDateString('en-NZ', {
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'Pacific/Auckland',
                        })}
                      </span>
                      {!isCurrent && (
                        <span
                          style={{
                            display: 'inline-block',
                            transform: isExpanded
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                            transition:
                              'transform var(--duration-normal) var(--ease-out-expo)',
                            color: isCurrent
                              ? 'var(--text-inverse)'
                              : 'var(--text-secondary)',
                            fontSize: '10px',
                          }}
                        >
                          ▼
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expandable detail section */}
                  <div
                    className={isCurrent ? '' : 'collapsible-content'}
                    data-open={isCurrent ? undefined : isExpanded || undefined}
                    style={isCurrent ? {} : undefined}
                  >
                    <div className={isCurrent ? '' : 'collapsible-inner'}>
                      <div
                        className="px-5 py-4 space-y-4"
                        style={{
                          backgroundColor: isCurrent
                            ? 'var(--bg-card-alt)'
                            : 'var(--bg-card)',
                        }}
                      >
                        {/* Date info for current week */}
                        {isCurrent && (
                          <div
                            className="text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <span>
                              Due:{' '}
                              {dueDate.toLocaleDateString('en-NZ', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                timeZone: 'Pacific/Auckland',
                              })}
                            </span>
                            {sessionDate && (
                              <span className="ml-4">
                                Session:{' '}
                                {sessionDate.toLocaleDateString('en-NZ', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  timeZone: 'Pacific/Auckland',
                                })}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Date info for expanded non-current weeks */}
                        {!isCurrent && sessionDate && (
                          <div
                            className="text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Session:{' '}
                            {sessionDate.toLocaleDateString('en-NZ', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              timeZone: 'Pacific/Auckland',
                            })}
                          </div>
                        )}

                        {/* Reading info */}
                        {(week.chapter_ref || week.description) && (
                          <div>
                            {week.chapter_ref && (
                              <p
                                className="text-sm font-medium mb-1"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {week.chapter_ref}
                                {week.page_start && week.page_end && (
                                  <span
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {' '}
                                    (pp. {week.page_start}–{week.page_end})
                                  </span>
                                )}
                              </p>
                            )}
                            {week.description && (
                              <p
                                className="text-sm"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {week.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Session Info */}
                        {(week.session_location || week.zoom_link) && (
                          <div className="flex flex-wrap gap-3 text-sm">
                            {week.session_location && (
                              <span
                                className="flex items-center gap-1"
                                style={{ color: 'var(--text-secondary)' }}
                              >
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
                            <h3
                              className="text-sm font-semibold mb-2"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Roles This Week
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {(
                                week.weekly_roles as unknown as WeeklyRoleRow[]
                              ).map((role) => (
                                <div
                                  key={role.id}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border"
                                  style={{
                                    borderColor: 'var(--border-default)',
                                    backgroundColor: 'var(--bg-card)',
                                  }}
                                >
                                  <RoleBadge
                                    type={role.role_type as WeeklyRoleType}
                                  />
                                  <span
                                    style={{ color: 'var(--text-primary)' }}
                                  >
                                    {role.user?.display_name}
                                  </span>
                                  {role.user?.id === userId && (
                                    <span
                                      className="text-xs font-medium"
                                      style={{ color: 'var(--accent-red)' }}
                                    >
                                      (You)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Discussion Prompts */}
                        {prompts.length > 0 && (
                          <div>
                            <h3
                              className="text-sm font-semibold mb-2"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Discussion Prompts
                            </h3>
                            <ol className="space-y-2 list-decimal list-inside">
                              {prompts.map((prompt) => (
                                <li
                                  key={prompt.id}
                                  className="text-sm"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  {prompt.prompt_text}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Session Notes */}
                        <SessionNotes
                          weekId={week.id}
                          hasSession={!!sessionDate}
                        />

                        {/* Action buttons — context dependent */}
                        {isCurrent && (
                          <div
                            className="p-4 rounded-lg border"
                            style={{
                              borderColor: 'var(--accent-red)',
                              backgroundColor: 'var(--bg-card-alt)',
                            }}
                          >
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

                        {!isCurrent && !isPast && (
                          <div
                            className="p-4 rounded-lg border"
                            style={{
                              borderColor: 'var(--accent-purple)',
                              backgroundColor: 'var(--bg-card-alt)',
                            }}
                          >
                            <p
                              className="text-xs font-semibold tracking-wide mb-1"
                              style={{ color: 'var(--accent-purple)' }}
                            >
                              Get a head start
                            </p>
                            <p
                              className="text-sm mb-3"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              Start reading early or browse the glossary to
                              prepare for this week.
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
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky "Jump to This Week" pill */}
      {showJumpButton && currentWeekId && (
        <button
          onClick={scrollToCurrent}
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-full text-sm font-medium animate-fade-in btn-transition"
          style={{
            backgroundColor: 'var(--accent-purple)',
            color: 'var(--text-inverse)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          ↕ Jump to This Week
        </button>
      )}
    </div>
  )
}
