import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import RoleBadge from '@/components/roles/RoleBadge'
import ReadingCheckinButton from '@/components/dashboard/ReadingCheckinButton'
import WeeklyActivitySummary from '@/components/dashboard/WeeklyActivitySummary'
import MilestoneCard from '@/components/dashboard/MilestoneCard'
import GroupThinkingOverview from '@/components/dashboard/GroupThinkingOverview'
import PassageSpotlight from '@/components/dashboard/PassageSpotlight'
import ReflectionJournal from '@/components/dashboard/ReflectionJournal'
import type { ThreadType, WeeklyRoleType } from '@/types/database'

// Query-specific join shapes for Supabase responses
interface MilestoneRow {
  id: string
  week_number: number
  title: string
  description: string
  reflection_prompt: string
}

interface WeeklyRoleRow {
  id: string
  role_type: string
  user: { id: string; display_name: string } | null
}

interface AnnotationWithChapter {
  id: string
  body: string
  chapter_id: string
  chapter: { chapter_number: number; title: string } | null
}

interface ThreadWithAuthor {
  id: string
  title: string
  thread_type: string
  created_at: string
  pinned: boolean
  author: { display_name: string } | null
  replies: { count: number }[]
}

interface DiscussionPrompt {
  id: string
  prompt_text: string
  sort_order: number
}

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const user = await getSessionUser()
  const supabase = await createClient()

  const now = new Date()
  const nowISO = now.toISOString()

  // Calculate this week's date range for activity counts
  const currentDay = now.getDay()
  const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
  const weekStart = new Date(now)
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const weekStartISO = weekStart.toISOString()
  const weekEndISO = weekEnd.toISOString()

  // All 9 queries in a single parallel batch
  const [
    { data: profile },
    { data: currentWeekData },
    { data: recentThreads },
    { data: recentAnnotations },
    { data: milestoneData },
    { count: weekAnnotationCount },
    { count: weekThreadCount },
    { count: weekGlossaryCount },
    { count: totalWeeks },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, role').eq('id', user?.id || '').single(),
    supabase.from('reading_schedule').select(`
      *,
      weekly_roles(id, role_type, user:profiles!user_id(id, display_name)),
      discussion_prompts(id, prompt_text, sort_order)
    `).gte('due_date', nowISO).order('due_date', { ascending: true }).limit(1),
    supabase.from('threads').select(`
      id, title, thread_type, created_at, pinned,
      author:profiles!author_id(display_name),
      replies:replies(count)
    `).order('created_at', { ascending: false }).limit(5),
    supabase.from('annotations').select(`
      id, body, chapter_id,
      chapter:text_chapters!chapter_id(chapter_number, title)
    `).order('created_at', { ascending: false }).limit(20),
    supabase.from('reading_milestones').select('id, week_number, title, description, reflection_prompt').order('week_number', { ascending: false }).limit(10),
    supabase.from('annotations').select('*', { count: 'exact', head: true }).gte('created_at', weekStartISO).lte('created_at', weekEndISO),
    supabase.from('threads').select('*', { count: 'exact', head: true }).gte('created_at', weekStartISO).lte('created_at', weekEndISO),
    supabase.from('glossary_entries').select('*', { count: 'exact', head: true }).gte('created_at', weekStartISO).lte('created_at', weekEndISO),
    supabase.from('reading_schedule').select('*', { count: 'exact', head: true }),
  ])

  const displayName = profile?.display_name || 'there'
  const currentWeek = currentWeekData?.[0] || null

  // Time-of-day greeting (NZ timezone for Christchurch group)
  const nzHourStr = now.toLocaleString('en-NZ', { hour: 'numeric', hour12: false, timeZone: 'Pacific/Auckland' })
  const nzHour = parseInt(nzHourStr, 10)
  const greeting = nzHour < 12 ? 'Good morning' : nzHour < 17 ? 'Good afternoon' : 'Good evening'

  // Find milestone for current week (if any)
  const milestone = currentWeek
    ? (milestoneData as MilestoneRow[] | null)?.find((m) => m.week_number === currentWeek.week_number) || null
    : null

  // Checkin depends on currentWeek, so runs after the parallel batch
  let currentReadingStatus: 'done' | 'partial' | 'behind' | null = null
  if (currentWeek && user) {
    const { data: checkinData } = await supabase
      .from('reading_checkins')
      .select('status')
      .eq('user_id', user.id)
      .eq('week_id', currentWeek.id)
      .eq('group_id', DEFAULT_GROUP_ID)
      .single()

    if (checkinData) {
      currentReadingStatus = checkinData.status as 'done' | 'partial' | 'behind'
    }
  }

  const weeklyRoles = (currentWeek?.weekly_roles || []) as unknown as WeeklyRoleRow[]
  const myRoles = weeklyRoles.filter((r) => r.user?.id === user?.id)
  const discussionPrompts = (currentWeek?.discussion_prompts || []) as unknown as DiscussionPrompt[]
  const typedRecentThreads = (recentThreads || []) as unknown as ThreadWithAuthor[]

  const annotations = (recentAnnotations as unknown as AnnotationWithChapter[] | null)?.map((ann) => ({
    chapter_number: ann.chapter?.chapter_number || 0,
    chapter_title: ann.chapter?.title || 'Unknown',
    annotation_count: 1,
    body: ann.body,
  })) || []

  const threads = weekThreadCount ? [{ week_number: 1, thread_count: weekThreadCount }] : []

  // Find the most-annotated passage for the Passage Spotlight
  // Group recent annotations by their quote to find the most-discussed passage
  const passageGroups = new Map<string, { quote: string; count: number; chapterNumber: number; chapterTitle: string }>()
  for (const ann of annotations) {
    // Use first 100 chars of body as a rough passage grouping
    const key = `${ann.chapter_number}`
    const existing = passageGroups.get(key)
    if (existing) {
      existing.count++
    } else {
      passageGroups.set(key, {
        quote: ann.body || '',
        count: 1,
        chapterNumber: ann.chapter_number,
        chapterTitle: ann.chapter_title,
      })
    }
  }
  // Find chapter with most annotations
  let spotlightPassage: { quote: string; chapterTitle: string; chapterNumber: number; documentSlug: string; annotationCount: number } | null = null
  if (passageGroups.size > 0) {
    const topPassage = Array.from(passageGroups.values()).sort((a, b) => b.count - a.count)[0]
    if (topPassage && topPassage.count >= 2) {
      spotlightPassage = {
        quote: topPassage.quote,
        chapterTitle: topPassage.chapterTitle,
        chapterNumber: topPassage.chapterNumber,
        documentSlug: 'capital-vol-1',
        annotationCount: topPassage.count,
      }
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* Left column: Current Week + Activity + Group Thinking + Threads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome card — contextual hub with journey progress, role, and session info */}
          <div className="card-base overflow-hidden">
            {/* Top accent bar — warm gradient */}
            <div className="h-1" style={{ background: 'linear-gradient(to right, var(--accent-amber), var(--accent-purple))' }} />

            <div className="card-body">
              {/* Greeting row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    {user ? `${greeting}, ${displayName}` : 'Welcome to Capital Study Group'}
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Christchurch Capital Reading Group
                  </p>
                </div>

                {/* Session countdown chip — only if session_date exists */}
                {currentWeek?.session_date && (() => {
                  const sessionDate = new Date(currentWeek.session_date)
                  const diffMs = sessionDate.getTime() - now.getTime()
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                  const countdownText = diffDays < 0 ? 'Session was recently' : diffDays === 0 ? 'Session today' : diffDays === 1 ? 'Session tomorrow' : `Session in ${diffDays} days`
                  const sessionTime = sessionDate.toLocaleString('en-NZ', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' })
                  return (
                    <div
                      className="flex-shrink-0 text-right px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-card-alt)' }}
                    >
                      <p className="text-xs font-semibold" style={{ color: diffDays <= 1 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                        {countdownText}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {sessionTime}
                        {currentWeek.session_location && ` · ${currentWeek.session_location}`}
                      </p>
                    </div>
                  )
                })()}
              </div>

              {/* Journey progress section */}
              {currentWeek && totalWeeks && totalWeeks > 0 && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
                  {/* Week label + percentage */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--accent-purple)' }}>
                        Week {currentWeek.week_number}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        of {totalWeeks}
                      </span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--accent-purple)' }}>
                      {Math.round((currentWeek.week_number / totalWeeks) * 100)}%
                    </span>
                  </div>

                  {/* Progress bar — segmented style */}
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-soft)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        background: 'linear-gradient(to right, var(--accent-green), var(--accent-purple))',
                        width: `${Math.round((currentWeek.week_number / totalWeeks) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Current reading title */}
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                    Currently reading: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{currentWeek.title}</span>
                  </p>
                </div>
              )}

              {/* Context chips — role + reading status + group activity */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Your role this week */}
                {myRoles.length > 0 && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ backgroundColor: 'rgba(var(--accent-purple-rgb), 0.08)', color: 'var(--accent-purple)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span className="font-medium capitalize">
                      {myRoles.map((r) => r.role_type.replace('_', ' ')).join(' & ')}
                    </span>
                  </div>
                )}

                {/* Reading status */}
                {currentReadingStatus && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: currentReadingStatus === 'done'
                        ? 'rgba(var(--accent-green-rgb), 0.1)'
                        : currentReadingStatus === 'partial'
                          ? 'rgba(var(--accent-purple-rgb), 0.08)'
                          : 'var(--bg-soft)',
                      color: currentReadingStatus === 'done'
                        ? 'var(--accent-green)'
                        : currentReadingStatus === 'partial'
                          ? 'var(--accent-purple)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {currentReadingStatus === 'done' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {currentReadingStatus === 'done' ? 'Reading complete' : currentReadingStatus === 'partial' ? 'Partially read' : 'Not started'}
                  </div>
                )}

                {/* Group activity pulse */}
                {((weekAnnotationCount || 0) + (weekThreadCount || 0) + (weekGlossaryCount || 0)) > 0 && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ backgroundColor: 'rgba(var(--accent-amber-rgb), 0.08)', color: 'var(--accent-amber)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    <span>
                      {weekAnnotationCount || 0} annotations · {weekThreadCount || 0} threads this week
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Milestone Card - if applicable */}
          {milestone && (
            <MilestoneCard milestone={milestone} />
          )}

          {/* Card 1: Reading Assignment */}
          <div className="card-base" style={{ borderColor: 'var(--accent-purple)', borderWidth: '2px' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-header)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold" style={{ color: 'var(--text-inverse)' }}>
                  This Week&apos;s Reading
                </h2>
                <Link href="/schedule" className="text-xs font-medium" style={{ color: 'var(--accent-purple)' }}>
                  Full Schedule →
                </Link>
              </div>
            </div>
            <div className="card-body">
              {currentWeek ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--accent-purple)' }}>
                      Week {currentWeek.week_number}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Due {new Date(currentWeek.due_date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {currentWeek.title}
                  </h3>
                  {currentWeek.chapter_ref && (
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {currentWeek.chapter_ref}
                      {currentWeek.page_start && currentWeek.page_end && (
                        <span> (pp. {currentWeek.page_start}–{currentWeek.page_end})</span>
                      )}
                    </p>
                  )}
                  <Link
                    href={`/reading/capital-vol-1/${currentWeek.week_number}`}
                    className="btn-primary text-base px-6 py-2.5 inline-flex items-center gap-2 mb-2 font-semibold"
                  >
                    Read Now →
                  </Link>
                  <ReadingCheckinButton weekId={currentWeek.id} currentStatus={currentReadingStatus} />
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    The reading journey hasn&apos;t started yet
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Once the schedule is set, you&apos;ll see this week&apos;s reading and session details here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Next Session — only if session date exists */}
          {currentWeek?.session_date && (
            <div className="card-base">
              <div className="card-header">
                <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  Next Session
                </h2>
              </div>
              <div className="card-body">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {new Date(currentWeek.session_date).toLocaleDateString('en-NZ', {
                    weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                    timeZone: 'Pacific/Auckland',
                  })}
                </p>
                {currentWeek.session_location && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {currentWeek.session_location}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Card 3: Discussion Prompts — only if prompts exist */}
          {discussionPrompts.length > 0 && (
            <div className="card-base">
              <div className="card-header">
                <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  Discussion Prompts
                </h2>
              </div>
              <div className="card-body">
                <ol className="space-y-2 list-decimal list-inside">
                  {[...discussionPrompts]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((prompt) => (
                      <li key={prompt.id} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {prompt.prompt_text}
                      </li>
                    ))}
                </ol>
              </div>
            </div>
          )}

          {/* Passage Spotlight — what the group is annotating most */}
          <PassageSpotlight passage={spotlightPassage} />

          {/* Weekly Activity Summary */}
          {currentWeek && (
            <WeeklyActivitySummary
              annotationCount={weekAnnotationCount || 0}
              threadCount={weekThreadCount || 0}
              glossaryCount={weekGlossaryCount || 0}
            />
          )}

          {/* What the Group is Thinking */}
          <GroupThinkingOverview annotations={annotations} threads={threads} />

          {/* Recent Threads */}
          <div className="card-base">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Recent Discussions
              </h2>
              <Link href="/threads" className="text-xs font-medium" style={{ color: 'var(--accent-red)' }}>
                All Threads →
              </Link>
            </div>
            <div>
              {typedRecentThreads.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {typedRecentThreads.map((thread) => {
                    const replyCount = thread.replies?.[0]?.count ?? 0
                    return (
                      <Link
                        key={thread.id}
                        href={`/threads/${thread.id}`}
                        className="block px-5 py-3 transition-colors hover-bg-themed"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <ThreadTypeBadge type={thread.thread_type as ThreadType} />
                          {thread.pinned && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-inverse)' }}>Pinned</span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {thread.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span>{thread.author?.display_name}</span>
                          <span>·</span>
                          <TimeAgo date={thread.created_at} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    The conversation starts here
                  </p>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                    What&apos;s on your mind after this week&apos;s reading?
                  </p>
                  <Link
                    href="/threads/new"
                    className="btn-primary text-sm"
                  >
                    Share with the Group
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Roles + Quick Links */}
        <div className="space-y-6">
          {/* Your Roles This Week */}
          <div className="card-base">
            <div className="card-header">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Your Roles
              </h2>
            </div>
            <div className="card-body">
              {myRoles.length > 0 ? (
                <div className="space-y-3">
                  {myRoles.map((role: WeeklyRoleRow) => (
                    <div key={role.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
                      <RoleBadge type={role.role_type as WeeklyRoleType} />
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {role.role_type === 'summarizer' && 'Prepare a brief summary of the key arguments.'}
                        {role.role_type === 'discussion_starter' && 'Come prepared with 2-3 questions to spark discussion.'}
                        {role.role_type === 'connector' && 'Find connections to current events or other readings.'}
                        {role.role_type === 'passage_picker' && 'Select 1-2 key passages for close reading.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                  {currentWeek ? 'No roles assigned to you this week — but you can still join the discussion.' : 'Roles rotate weekly once the schedule is set up.'}
                </p>
              )}
            </div>
          </div>

          {/* All Roles This Week */}
          {weeklyRoles.length > 0 && (
            <div className="card-base">
              <div className="card-header">
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  All Roles This Week
                </h2>
              </div>
              <div className="card-body space-y-2">
                {weeklyRoles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between text-sm">
                    <RoleBadge type={role.role_type as WeeklyRoleType} />
                    <span style={{ color: 'var(--text-primary)' }}>
                      {role.user?.display_name}
                      {role.user?.id === user?.id && (
                        <span className="text-xs ml-1" style={{ color: 'var(--accent-red)' }}>(You)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Annotate Together + Quick Links removed — duplicated nav and Read Now CTA */}

          {/* Reflection Journal — private weekly notes */}
          {currentWeek && user && (
            <ReflectionJournal
              weekTitle={currentWeek.title}
              weekNumber={currentWeek.week_number}
            />
          )}
        </div>
      </div>
    </div>
  )
}
