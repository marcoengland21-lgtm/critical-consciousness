import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import RoleBadge from '@/components/roles/RoleBadge'
import ReadingCheckinButton from '@/components/dashboard/ReadingCheckinButton'
import WeeklyActivitySummary from '@/components/dashboard/WeeklyActivitySummary'
import MilestoneCard from '@/components/dashboard/MilestoneCard'
import GroupThinkingOverview from '@/components/dashboard/GroupThinkingOverview'
import type { ThreadType, WeeklyRoleType } from '@/types/database'

const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'
const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user?.id || '')
    .single()

  const displayName = profile?.display_name || 'there'
  const isAdmin = profile?.role === 'admin'

  // Get current week (closest upcoming due_date)
  const now = new Date().toISOString()
  const { data: currentWeekData } = await supabase
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
    .gte('due_date', now)
    .order('due_date', { ascending: true })
    .limit(1)

  const currentWeek = currentWeekData?.[0] || null

  // Get user's reading checkin status for current week
  let currentReadingStatus: 'done' | 'partial' | 'behind' | null = null
  if (currentWeek) {
    const adminSupabase = createAdminClient()
    const { data: checkinData } = await adminSupabase
      .from('reading_checkins')
      .select('status')
      .eq('user_id', GUEST_ID)
      .eq('week_id', currentWeek.id)
      .eq('group_id', DEFAULT_GROUP_ID)
      .single()

    if (checkinData) {
      currentReadingStatus = checkinData.status as 'done' | 'partial' | 'behind'
    }
  }

  // Get user's roles for current week
  const myRoles = currentWeek?.weekly_roles?.filter(
    (r: any) => r.user?.id === user?.id
  ) || []

  // Get recent threads
  const { data: recentThreads } = await supabase
    .from('threads')
    .select(`
      id, title, thread_type, created_at, pinned,
      author:profiles!author_id(display_name),
      replies:replies(count)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get member count
  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Get total thread count
  const { count: threadCount } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true })

  // Get annotations for GroupThinking overview
  const adminSupabase = createAdminClient()
  const { data: annotationsData } = await adminSupabase
    .from('annotations')
    .select(`
      id, body, chapter_id,
      chapter:text_chapters!chapter_id(chapter_number, title)
    `)
    .order('created_at', { ascending: false })

  const annotations = annotationsData?.map((ann: any) => ({
    chapter_number: ann.chapter?.chapter_number || 0,
    chapter_title: ann.chapter?.title || 'Unknown',
    annotation_count: 1,
    body: ann.body,
  })) || []

  // Get thread counts by week
  const { data: threadsData } = await supabase
    .from('threads')
    .select('week_id')

  const threadsByWeek = new Map<string, number>()
  threadsData?.forEach((thread: any) => {
    if (thread.week_id) {
      threadsByWeek.set(thread.week_id, (threadsByWeek.get(thread.week_id) || 0) + 1)
    }
  })

  const threads = Array.from(threadsByWeek.entries()).map(([weekId, count], index) => ({
    week_number: index + 1,
    thread_count: count,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--color-deep-red)' }}>
          {user ? `Welcome back, ${displayName}` : 'Welcome to Critical Consciousness'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
          {user
            ? 'Christchurch Capital Reading Group'
            : 'A collaborative study of Marx\'s Capital — Christchurch, 2026'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Current Week + Roles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Milestone Card - if applicable */}
          {currentWeek && (
            <MilestoneCard weekId={currentWeek.id} weekNumber={currentWeek.week_number} />
          )}

          {/* This Week's Reading */}
          <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: 'var(--color-muted-gold)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: '#1a1625' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold" style={{ color: '#faf9fc' }}>
                  This Week&apos;s Reading
                </h2>
                <Link href="/schedule" className="text-xs font-medium" style={{ color: 'var(--color-muted-gold)' }}>
                  Full Schedule →
                </Link>
              </div>
            </div>
            <div className="p-5" style={{ backgroundColor: 'white' }}>
              {currentWeek ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted-gold)' }}>
                      Week {currentWeek.week_number}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                      Due {new Date(currentWeek.due_date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-dark-brown)' }}>
                    {currentWeek.title}
                  </h3>
                  {currentWeek.chapter_ref && (
                    <p className="text-sm mb-2" style={{ color: 'var(--color-warm-gray)' }}>
                      {currentWeek.chapter_ref}
                      {currentWeek.page_start && currentWeek.page_end && (
                        <span> (pp. {currentWeek.page_start}–{currentWeek.page_end})</span>
                      )}
                    </p>
                  )}
                  {currentWeek.description && (
                    <p className="text-sm mb-3" style={{ color: 'var(--color-warm-gray)' }}>
                      {currentWeek.description}
                    </p>
                  )}

                  {/* Session info */}
                  {currentWeek.session_date && (
                    <div className="text-sm p-3 rounded-lg mb-3" style={{ backgroundColor: '#faf9fc' }}>
                      <span className="font-medium" style={{ color: 'var(--color-dark-brown)' }}>
                        Next Session:{' '}
                        {new Date(currentWeek.session_date).toLocaleDateString('en-NZ', {
                          weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
                        })}
                      </span>
                      {currentWeek.session_location && (
                        <span style={{ color: 'var(--color-warm-gray)' }}> · {currentWeek.session_location}</span>
                      )}
                    </div>
                  )}

                  {/* Discussion prompts */}
                  {currentWeek.discussion_prompts?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-dark-brown)' }}>
                        Discussion Prompts
                      </h4>
                      <ol className="space-y-1 list-decimal list-inside">
                        {currentWeek.discussion_prompts
                          .sort((a: any, b: any) => a.sort_order - b.sort_order)
                          .map((prompt: any) => (
                            <li key={prompt.id} className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
                              {prompt.prompt_text}
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}

                  {/* Reading Checkin */}
                  <ReadingCheckinButton weekId={currentWeek.id} currentStatus={currentReadingStatus} />
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm mb-1" style={{ color: 'var(--color-dark-brown)' }}>
                    The reading journey hasn&apos;t started yet
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                    Once the schedule is set, you&apos;ll see this week&apos;s reading, discussion prompts, and session details here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Activity Summary */}
          {currentWeek && (
            <WeeklyActivitySummary weekId={currentWeek.id} />
          )}

          {/* What the Group is Thinking */}
          <GroupThinkingOverview annotations={annotations} threads={threads} />

          {/* Recent Threads */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2dfe8' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'white', borderBottom: '1px solid #e2dfe8' }}>
              <h2 className="font-bold" style={{ color: 'var(--color-dark-brown)' }}>
                Recent Discussions
              </h2>
              <Link href="/threads" className="text-xs font-medium" style={{ color: 'var(--color-deep-red)' }}>
                All Threads →
              </Link>
            </div>
            <div style={{ backgroundColor: 'white' }}>
              {recentThreads && recentThreads.length > 0 ? (
                <div className="divide-y" style={{ borderColor: '#e2dfe8' }}>
                  {recentThreads.map((thread: any) => {
                    const replyCount = thread.replies?.[0]?.count ?? 0
                    return (
                      <Link
                        key={thread.id}
                        href={`/threads/${thread.id}`}
                        className="block px-5 py-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <ThreadTypeBadge type={thread.thread_type as ThreadType} />
                          {thread.pinned && (
                            <span className="text-xs" style={{ color: 'var(--color-muted-gold)' }}>📌</span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--color-dark-brown)' }}>
                          {thread.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--color-warm-gray)' }}>
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
                  <p className="text-sm mb-1" style={{ color: 'var(--color-dark-brown)' }}>
                    The conversation starts here
                  </p>
                  <p className="text-xs mb-3" style={{ color: 'var(--color-warm-gray)' }}>
                    What&apos;s on your mind after this week&apos;s reading?
                  </p>
                  <Link
                    href="/threads/new"
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'var(--color-deep-red)', color: 'var(--color-warm-cream)' }}
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
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2dfe8' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e2dfe8' }}>
              <h2 className="font-bold" style={{ color: 'var(--color-dark-brown)' }}>
                Your Roles
              </h2>
            </div>
            <div className="p-5" style={{ backgroundColor: 'white' }}>
              {myRoles.length > 0 ? (
                <div className="space-y-3">
                  {myRoles.map((role: any) => (
                    <div key={role.id} className="p-3 rounded-lg" style={{ backgroundColor: '#faf9fc' }}>
                      <RoleBadge type={role.role_type as WeeklyRoleType} />
                      <p className="text-xs mt-1" style={{ color: 'var(--color-warm-gray)' }}>
                        {role.role_type === 'summarizer' && 'Prepare a brief summary of the key arguments.'}
                        {role.role_type === 'discussion_starter' && 'Come prepared with 2-3 questions to spark discussion.'}
                        {role.role_type === 'connector' && 'Find connections to current events or other readings.'}
                        {role.role_type === 'passage_picker' && 'Select 1-2 key passages for close reading.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-warm-gray)' }}>
                  {currentWeek ? 'No roles assigned to you this week — but you can still join the discussion.' : 'Roles rotate weekly once the schedule is set up.'}
                </p>
              )}
            </div>
          </div>

          {/* All Roles This Week */}
          {currentWeek?.weekly_roles && currentWeek.weekly_roles.length > 0 && (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2dfe8' }}>
              <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e2dfe8' }}>
                <h2 className="font-bold text-sm" style={{ color: 'var(--color-dark-brown)' }}>
                  All Roles This Week
                </h2>
              </div>
              <div className="p-5 space-y-2" style={{ backgroundColor: 'white' }}>
                {currentWeek.weekly_roles.map((role: any) => (
                  <div key={role.id} className="flex items-center justify-between text-sm">
                    <RoleBadge type={role.role_type as WeeklyRoleType} />
                    <span style={{ color: 'var(--color-dark-brown)' }}>
                      {role.user?.display_name}
                      {role.user?.id === user?.id && (
                        <span className="text-xs ml-1" style={{ color: 'var(--color-deep-red)' }}>(You)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start Reading CTA */}
          <Link
            href="/reading"
            className="block rounded-lg border-2 p-5 transition-all hover:shadow-md card-hover"
            style={{
              borderColor: 'var(--color-deep-red)',
              backgroundColor: 'white',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-deep-red)' }}>
              Annotate Together
            </p>
            <p className="font-bold" style={{ color: 'var(--color-dark-brown)', fontFamily: "'Lora', Georgia, serif" }}>
              Capital, Vol. I — Chapter 1
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-warm-gray)' }}>
              Read, highlight, and annotate Marx&apos;s text collaboratively
            </p>
          </Link>

          {/* Quick Links */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2dfe8' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e2dfe8' }}>
              <h2 className="font-bold text-sm" style={{ color: 'var(--color-dark-brown)' }}>
                Quick Links
              </h2>
            </div>
            <div style={{ backgroundColor: 'white' }}>
              <Link href="/threads/new" className="block px-5 py-3 text-sm transition-colors hover:bg-gray-50 border-b" style={{ borderColor: '#e2dfe8', color: 'var(--color-dark-brown)' }}>
                Share with the Group
              </Link>
              <Link href="/glossary" className="block px-5 py-3 text-sm transition-colors hover:bg-gray-50 border-b" style={{ borderColor: '#e2dfe8', color: 'var(--color-dark-brown)' }}>
                Browse Glossary
              </Link>
              <Link href="/resources" className="block px-5 py-3 text-sm transition-colors hover:bg-gray-50" style={{ color: 'var(--color-dark-brown)' }}>
                Resources
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
