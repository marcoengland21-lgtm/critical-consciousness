import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import RoleBadge from '@/components/roles/RoleBadge'
import ReadingCheckinButton from '@/components/dashboard/ReadingCheckinButton'
import MilestoneCard from '@/components/dashboard/MilestoneCard'
import GroupThinkingOverview from '@/components/dashboard/GroupThinkingOverview'
import PassageSpotlight from '@/components/dashboard/PassageSpotlight'
import QuickCaptureCard from '@/components/journal/QuickCaptureCard'
import BigStatTile from '@/components/dashboard/BigStatTile'
import { getTestingOverride } from '@/lib/testing-override'
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

export default async function DashboardPage({
  searchParams,
}: {
  // Next.js 15+ App Router types searchParams as a Promise.
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getSessionUser()
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

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

  // All 9 queries in a single parallel batch.
  // currentWeekData fetches ALL weeks (with their roles + prompts) and the
  // current week is selected client-side to MATCH the schedule page's logic:
  // first upcoming week, OR fall back to the last past week. Previous query
  // used `.gte('due_date', nowISO).limit(1)` which returned nothing when all
  // weeks were past, leaving the dashboard stuck in "JOURNEY NOT YET STARTED"
  // even when the schedule page correctly showed the last week as Current.
  const [
    { data: profile },
    { data: allWeeksData },
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
    `).order('week_number', { ascending: true }),
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

  // Pick currentWeek with the schedule-page fallback logic: first upcoming
  // week (due_date >= now), OR fall back to the last past week if none
  // upcoming. journeyStarted = there's a schedule at all AND we have a
  // current week. Pre-journey state is when the schedule is empty.
  type WeekRowFull = { id: string; week_number: number; title: string; due_date: string; session_date: string | null; session_location: string | null; chapter_ref: string | null; page_start: number | null; page_end: number | null }
  const allWeeks = (allWeeksData || []) as unknown as (WeekRowFull & { weekly_roles?: WeeklyRoleRow[]; discussion_prompts?: DiscussionPrompt[] })[]
  const detectedCurrentWeek =
    allWeeks.find((w) => new Date(w.due_date) >= now) ||
    allWeeks[allWeeks.length - 1] ||
    null

  // Apply admin testing-mode override (chunk 2 part 1) to journey state.
  // The override only takes effect for admin users; for everyone else the
  // detected state is used. ?journey=not_started forces the empty-state
  // condensation; ?journey=started reveals the big-stat row even if no
  // schedule has been set up yet (uses detectedCurrentWeek if available,
  // otherwise the row tiles fall back to '—' / 0).
  const isAdmin = profile?.role === 'admin'
  const override = getTestingOverride(resolvedSearchParams, isAdmin)
  let currentWeek: typeof detectedCurrentWeek | null = detectedCurrentWeek
  let journeyStarted = currentWeek !== null
  if (override?.journey === 'not_started') {
    journeyStarted = false
    currentWeek = null
  } else if (override?.journey === 'started') {
    journeyStarted = true
    // currentWeek stays as detectedCurrentWeek; if there's no schedule at
    // all, the tiles will render with '—' / 0 fallbacks gracefully.
  }

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

  // Pre-compute the big-stat row values (per IMPROVEMENTS_PLAN §5.1.3,
  // refined per pre-launch chunk 1 §3).
  // When the journey IS started, real zeros render as '0' (zero is information:
  // 'the group hasn't annotated yet this week'). Em-dash means 'we don't know'
  // and is wrong when we do. When the journey ISN'T started we condense the
  // whole row into a single eyebrow line in the JSX below.
  const sectionTile = currentWeek ? `Wk ${currentWeek.week_number}` : '—'
  const annotationsTile = String(weekAnnotationCount ?? 0)
  const threadsTile = String(weekThreadCount ?? 0)
  let sessionTile = '—'
  if (currentWeek?.session_date) {
    const d = new Date(currentWeek.session_date)
    const day = d.toLocaleString('en-NZ', { weekday: 'short', timeZone: 'Pacific/Auckland' })
    const time = d.toLocaleString('en-NZ', { hour: 'numeric', hour12: true, timeZone: 'Pacific/Auckland' }).replace(/\s/g, '').toLowerCase()
    sessionTile = `${day} ${time}`
  }

  return (
    <div className="stagger-children">
      {/* Greeting — single Lora italic line, no card box (§5.1.2).
          Trailing period dropped per chunk 1 §5.1: a period reads as
          terminal, like the platform finished talking. The dashboard is
          a place the user is entering, not a notice they're reading. */}
      <div className="mb-8">
        <p className="text-display-md" style={{ color: 'var(--text-primary)' }}>
          {user ? `${greeting}, ${displayName}` : 'Welcome to Capital Study Group'}
        </p>
      </div>

      {/* Big-stat row (§5.1.3 + chunk 1 §3) — when the journey IS started,
          four hairline-divided tiles across the top. When the journey is NOT
          started, condensed to a single quiet eyebrow line so we don't show
          four broken-looking em-dash tiles. */}
      {journeyStarted ? (
        <div
          className="grid grid-cols-2 md:grid-cols-4 mb-10"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="md:border-r md:px-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <BigStatTile
              value={sectionTile}
              caption="Current Week"
              href={currentWeek ? `/reading/capital-vol-1/${currentWeek.week_number}` : undefined}
            />
          </div>
          <div className="md:border-r md:px-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <BigStatTile
              value={annotationsTile}
              caption="Annotations This Week"
            />
          </div>
          <div className="md:border-r md:px-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <BigStatTile
              value={threadsTile}
              caption="Threads This Week"
              href="/threads"
            />
          </div>
          <div className="md:px-4">
            <BigStatTile
              value={sessionTile}
              caption="Next Session"
              href="/schedule"
            />
          </div>
        </div>
      ) : (
        <p className="text-eyebrow mb-10">
          Reading journey not yet started · once the schedule is set up, key stats will appear here
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
        {/* Left column — chunk 1 §4 reorder:
            1. Callout (most alive — single curated quote with clear next step)
            2. Heatmap (attention by section)
            3. Recent Discussions (active threads)
            4. Themes (kept, but moved down — these are static observations,
               and Themes Being Explored lives inside GroupThinkingOverview
               so 'reorder themes below recent' is achieved by ordering the
               whole heatmap component below the callout while keeping
               recent threads after the heatmap... NO: the brief explicitly
               wants Recent above Themes, but Themes is bundled with the
               heatmap. The pragmatic split: split the heatmap component
               into 'sections only' here, then render Themes separately
               at the bottom. Done via two passes of GroupThinkingOverview
               with the showThemes / showSections flags below.) */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Group-thinking callout (the amber 'group is thinking about')
              — moved up per chunk 1 §4. This is the most alive element on
              the dashboard: a real quote from a real annotation with a
              direct 'Join the conversation' next step. */}
          <PassageSpotlight passage={spotlightPassage} />

          {/* 2. Group attention heatmap — sections only. Themes are split
              out and rendered below Recent Discussions. */}
          <GroupThinkingOverview annotations={annotations} threads={threads} showThemes={false} />

          {/* 3. Recent Discussions — moved up per chunk 1 §4. Active threads
              are more alive than static themes. Cap at 3, render as
              compact single-line hairline rows per §5.4. */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-eyebrow">Recent Discussions</p>
              <Link href="/threads" className="text-xs font-medium" style={{ color: 'var(--accent-red)' }}>
                All threads →
              </Link>
            </div>
            {typedRecentThreads.length > 0 ? (
              <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                {typedRecentThreads.slice(0, 3).map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/threads/${thread.id}`}
                    className="flex items-center gap-3 px-2 py-2.5 transition-colors hover-bg-themed"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <ThreadTypeBadge type={thread.thread_type as ThreadType} />
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
                      {thread.title}
                    </h3>
                    <span className="text-xs shrink-0 hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
                      {thread.author?.display_name}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      <TimeAgo date={thread.created_at} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4" style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  The conversation starts here
                </p>
                <p className="text-xs mb-3 mx-auto" style={{ color: 'var(--text-secondary)', maxWidth: '40ch' }}>
                  What&apos;s on your mind after this week&apos;s reading?
                </p>
                <Link href="/threads/new" className="btn-primary text-sm">
                  Start a thread
                </Link>
              </div>
            )}
          </section>

          {/* 4. Themes Being Explored — moved down per chunk 1 §4. These are
              good (quoted annotations from across the group) but less alive
              than active threads, so they sit below. Rendered via a second
              GroupThinkingOverview pass with showSections={false}. */}
          <GroupThinkingOverview annotations={annotations} threads={threads} showSections={false} showThemes />

          {/* Milestone (only renders when applicable) */}
          {milestone && <MilestoneCard milestone={milestone} />}

          {/* This week's reading — hairline structure, no thick purple-border card */}
          {currentWeek && (
            <section>
              <p className="text-eyebrow mb-3">This Week&apos;s Reading</p>
              <div
                className="px-2 py-4"
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <p className="text-eyebrow mb-1">Week {currentWeek.week_number}</p>
                <h3
                  className="mb-2"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: '1.5rem',
                  }}
                >
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
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/reading/capital-vol-1/${currentWeek.week_number}`}
                    className="btn-primary text-sm"
                  >
                    Read &amp; annotate →
                  </Link>
                  <ReadingCheckinButton weekId={currentWeek.id} currentStatus={currentReadingStatus} />
                </div>
              </div>
            </section>
          )}

          {/* Discussion prompts — same hanging-indent question format as Schedule (§8.1) */}
          {discussionPrompts.length > 0 && (
            <section>
              <p className="text-eyebrow mb-3">Discussion Prompts</p>
              <div className="space-y-3">
                {[...discussionPrompts]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((prompt) => (
                    <div
                      key={prompt.id}
                      className="text-sm leading-relaxed flex gap-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="shrink-0 select-none"
                        style={{
                          color: 'var(--accent-purple)',
                          fontFamily: "'Lora', Georgia, serif",
                          fontStyle: 'italic',
                          fontSize: '1.1em',
                          lineHeight: 1.4,
                        }}
                      >
                        ?
                      </span>
                      <p className="flex-1">{prompt.prompt_text}</p>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column — your roles (when assigned) + reflection journal (§5.1.7).
            'Your Roles' hides entirely when myRoles is empty — no empty-state
            message. 'All Roles This Week' widget removed (information lives
            on the Schedule page already). */}
        <div className="space-y-8">
          {myRoles.length > 0 && (
            <section>
              <p className="text-eyebrow mb-3">Your Role This Week</p>
              <div className="space-y-3">
                {myRoles.map((role: WeeklyRoleRow) => (
                  <div
                    key={role.id}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-card-alt)' }}
                  >
                    <RoleBadge type={role.role_type as WeeklyRoleType} />
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {role.role_type === 'summarizer' && 'Prepare a brief summary of the key arguments.'}
                      {role.role_type === 'discussion_starter' && 'Come prepared with 2-3 questions to spark discussion.'}
                      {role.role_type === 'connector' && 'Find connections to current events or other readings.'}
                      {role.role_type === 'passage_picker' && 'Select 1-2 key passages for close reading.'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Journal quick-capture (chunk 2 part 2) — replaces the previous
              'Your Reflection' stub. Sized substantially larger than the
              stub (roughly two big-stat tiles tall), full width of right rail.
              Renders for any logged-in user, regardless of journey state. */}
          {user && <QuickCaptureCard userId={user.id} />}
        </div>
      </div>
    </div>
  )
}
