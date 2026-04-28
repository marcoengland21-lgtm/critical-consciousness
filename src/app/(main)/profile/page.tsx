import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import type { ThreadType, WeeklyRoleType } from '@/types/database'
import RoleBadge from '@/components/roles/RoleBadge'
import { getChapterLabel } from '@/lib/chapter-utils'

// Query-specific join shapes for Supabase responses
interface AnnotationWithChapter {
  id: string
  body: string
  created_at: string
  chapter: { chapter_number: number; title: string } | null
}

interface ThreadWithReplies {
  id: string
  title: string
  thread_type: string
  created_at: string
  replies: { count: number }[]
}

interface GlossaryEntryBasic {
  id: string
  term: string
  created_at: string
}

interface CheckinWithWeek {
  id: string
  status: string
  created_at: string
  week: { week_number: number; title: string } | null
}

interface RoleWithWeek {
  id: string
  role_type: string
  created_at: string
  week: { week_number: number; title: string } | null
}

export const metadata = {
  title: 'Profile | Capital Study Group',
}

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id)
  if (!group) redirect('/login')

  // All queries in parallel — follows dashboard pattern.
  // L1: profile page shows the user's contributions in their *active* group.
  // L4 will add a cross-group toggle ("show contributions across all my groups").
  // Until then, every group-scoped table is filtered by group.groupId.
  // RLS additionally enforces.
  const [
    { data: profile },
    { data: recentAnnotations },
    { count: annotationCount },
    { data: recentThreads },
    { count: threadCount },
    { count: replyCount },
    { data: glossaryEntries },
    { count: resourceCount },
    { data: checkins },
    { data: roleHistory },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, role, created_at').eq('id', user.id).single(),
    supabase.from('annotations').select(`
      id, body, created_at,
      chapter:text_chapters!chapter_id(chapter_number, title)
    `).eq('author_id', user.id).eq('group_id', group.groupId).order('created_at', { ascending: false }).limit(5),
    supabase.from('annotations').select('*', { count: 'exact', head: true }).eq('author_id', user.id).eq('group_id', group.groupId),
    supabase.from('threads').select(`
      id, title, thread_type, created_at,
      replies:replies(count)
    `).eq('author_id', user.id).eq('group_id', group.groupId).order('created_at', { ascending: false }).limit(5),
    supabase.from('threads').select('*', { count: 'exact', head: true }).eq('author_id', user.id).eq('group_id', group.groupId),
    supabase.from('replies').select('*', { count: 'exact', head: true }).eq('author_id', user.id).eq('group_id', group.groupId),
    supabase.from('glossary_entries').select('id, term, created_at').eq('created_by', user.id).eq('group_id', group.groupId).order('term', { ascending: true }),
    supabase.from('resources').select('*', { count: 'exact', head: true }).eq('created_by', user.id).eq('group_id', group.groupId),
    supabase.from('reading_checkins').select(`
      id, status, created_at,
      week:reading_schedule!week_id(week_number, title)
    `).eq('user_id', user.id).eq('group_id', group.groupId).order('created_at', { ascending: false }),
    supabase.from('weekly_roles').select(`
      id, role_type, created_at,
      week:reading_schedule!week_id(week_number, title)
    `).eq('user_id', user.id).eq('group_id', group.groupId).order('created_at', { ascending: false }),
  ])

  const displayName = profile?.display_name || 'User'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-NZ', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Pacific/Auckland',
      })
    : null

  // Compute totals for the stat cards
  const totalAnnotations = annotationCount || 0
  const totalThreads = threadCount || 0
  const totalReplies = replyCount || 0
  const totalTerms = glossaryEntries?.length || 0
  const totalResources = resourceCount || 0
  const totalContributions = totalAnnotations + totalThreads + totalReplies + totalTerms + totalResources

  // Reading journey stats
  const typedCheckins = (checkins as unknown as CheckinWithWeek[]) || []
  const completedWeeks = typedCheckins.filter(c => c.status === 'done').length
  const partialWeeks = typedCheckins.filter(c => c.status === 'partial').length

  // First letter for avatar
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div className="stagger-children">
      {/* Profile Header — identity card */}
      <div
        className="card-base overflow-hidden mb-8"
      >
        {/* Gradient accent bar */}
        <div
          className="h-1.5"
          style={{
            background: 'linear-gradient(90deg, var(--accent-red), var(--accent-purple), var(--accent-amber))',
          }}
        />
        <div className="px-6 py-6 sm:flex sm:items-center sm:gap-6">
          {/* Avatar circle */}
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold shrink-0 mb-4 sm:mb-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-red))',
              color: 'var(--text-inverse)',
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-1 truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {memberSince && (
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ color: 'var(--accent-purple)' }}>◆</span>
                  Member since {memberSince}
                </span>
              )}
              {profile?.role && (
                <span
                  className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full leading-none capitalize"
                  style={{
                    backgroundColor: profile.role === 'admin' ? 'var(--accent-purple)' : 'var(--bg-badge)',
                    color: profile.role === 'admin' ? 'var(--text-inverse)' : 'var(--text-badge)',
                  }}
                >
                  {profile.role}
                </span>
              )}
            </div>
          </div>
          {/* Quick stats in header */}
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--accent-purple)' }}>
                {totalContributions}
              </div>
              <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                contributions
              </div>
            </div>
            <div
              className="w-px h-10"
              style={{ backgroundColor: 'var(--border-default)' }}
            />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>
                {completedWeeks}
              </div>
              <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                weeks done
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Stats Grid — visual cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon="✏️"
          value={totalAnnotations}
          label="Annotations"
          color="var(--accent-purple)"
          bgColor="rgba(var(--accent-purple-rgb), 0.08)"
        />
        <StatCard
          icon="💬"
          value={totalThreads}
          label="Threads"
          color="var(--accent-red)"
          bgColor="rgba(var(--accent-red-rgb), 0.08)"
        />
        <StatCard
          icon="↩️"
          value={totalReplies}
          label="Replies"
          color="var(--accent-amber)"
          bgColor="rgba(var(--accent-amber-rgb), 0.08)"
        />
        <StatCard
          icon="📖"
          value={totalTerms + totalResources}
          label="Terms & Resources"
          color="var(--accent-green)"
          bgColor="rgba(var(--accent-green-rgb), 0.08)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Annotations + Threads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Annotations */}
          <div className="card-base">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Recent Annotations
              </h2>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                style={{ backgroundColor: 'rgba(var(--accent-purple-rgb), 0.1)', color: 'var(--accent-purple)' }}
              >
                {totalAnnotations} total
              </span>
            </div>
            <div>
              {recentAnnotations && recentAnnotations.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {(recentAnnotations as unknown as AnnotationWithChapter[]).map((ann) => (
                    <Link
                      key={ann.id}
                      href={`/reading/capital-vol-1/${ann.chapter?.chapter_number || 1}`}
                      className="block px-5 py-4 transition-colors hover-bg-themed group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-1 shrink-0 rounded-full self-stretch mt-0.5"
                          style={{ backgroundColor: 'var(--accent-purple)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm mb-1.5 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {ann.body.length > 160 ? ann.body.substring(0, 160).trim() + '...' : ann.body}
                          </p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium">{getChapterLabel(ann.chapter?.chapter_number || 0).label}</span>
                            <span>·</span>
                            <TimeAgo date={ann.created_at} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-3xl mb-3">✏️</div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    No annotations yet — highlight a passage while reading to leave your first note
                  </p>
                  <Link
                    href="/reading"
                    className="inline-flex items-center gap-1 text-sm font-medium btn-transition"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    Start reading →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Threads */}
          <div className="card-base">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Your Threads
              </h2>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                style={{ backgroundColor: 'rgba(var(--accent-red-rgb), 0.1)', color: 'var(--accent-red)' }}
              >
                {totalThreads} total
              </span>
            </div>
            <div>
              {recentThreads && recentThreads.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {(recentThreads as unknown as ThreadWithReplies[]).map((thread) => {
                    const replies = thread.replies?.[0]?.count ?? 0
                    return (
                      <Link
                        key={thread.id}
                        href={`/threads/${thread.id}`}
                        className="block px-5 py-4 transition-colors hover-bg-themed group"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-1 shrink-0 rounded-full self-stretch mt-0.5"
                            style={{ backgroundColor: 'var(--accent-red)' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <ThreadTypeBadge type={thread.thread_type as ThreadType} />
                              {replies > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  <span className="text-[10px]">💬</span> {replies} {replies === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-semibold truncate group-hover:underline" style={{ color: 'var(--text-primary)' }}>
                              {thread.title}
                            </h3>
                            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                              <TimeAgo date={thread.created_at} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-3xl mb-3">💬</div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    No threads yet — share a reflection or start a discussion
                  </p>
                  <Link
                    href="/threads/new"
                    className="inline-flex items-center gap-1 text-sm font-medium btn-transition"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    Start a thread →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Reading Journey + Glossary + Role History */}
        <div className="space-y-6">
          {/* Reading Journey */}
          <div className="card-base">
            <div className="card-header">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Reading Journey
              </h2>
            </div>
            <div className="card-body">
              {typedCheckins.length > 0 ? (
                <div>
                  {/* Visual progress summary */}
                  <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{
                        background: `conic-gradient(var(--accent-green) ${(completedWeeks / Math.max(typedCheckins.length, 1)) * 360}deg, var(--bg-soft) 0deg)`,
                        color: 'var(--accent-green)',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: 'var(--bg-card)' }}
                      >
                        {completedWeeks}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {completedWeeks} of {typedCheckins.length} weeks complete
                      </div>
                      {partialWeeks > 0 && (
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {partialWeeks} partially read
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Week list */}
                  <div className="space-y-2">
                    {typedCheckins.map((checkin) => (
                      <div key={checkin.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: checkin.status === 'done'
                                ? 'var(--accent-green)'
                                : checkin.status === 'partial'
                                ? 'var(--accent-purple)'
                                : 'var(--text-secondary)',
                            }}
                          />
                          Week {checkin.week?.week_number}
                        </span>
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                          style={{
                            backgroundColor: checkin.status === 'done'
                              ? 'rgba(var(--accent-green-rgb), 0.1)'
                              : checkin.status === 'partial'
                              ? 'rgba(var(--accent-purple-rgb), 0.1)'
                              : 'var(--bg-badge)',
                            color: checkin.status === 'done'
                              ? 'var(--accent-green)'
                              : checkin.status === 'partial'
                              ? 'var(--accent-purple)'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {checkin.status === 'done' ? 'Complete' : checkin.status === 'partial' ? 'Partial' : 'Behind'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">📚</div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No reading check-ins yet — check in from the dashboard each week
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Glossary Contributions */}
          <div className="card-base">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Glossary Contributions
              </h2>
              {totalTerms > 0 && (
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                  style={{ backgroundColor: 'rgba(var(--accent-green-rgb), 0.1)', color: 'var(--accent-green)' }}
                >
                  {totalTerms}
                </span>
              )}
            </div>
            <div className="card-body">
              {glossaryEntries && glossaryEntries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(glossaryEntries as unknown as GlossaryEntryBasic[]).map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/glossary?term=${encodeURIComponent(entry.term)}`}
                      className="text-xs font-medium px-2.5 py-1 rounded-full leading-none btn-transition"
                      style={{
                        backgroundColor: 'var(--bg-badge)',
                        color: 'var(--text-badge)',
                      }}
                    >
                      {entry.term}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No terms defined yet — add one from the <Link href="/glossary" className="font-medium" style={{ color: 'var(--accent-purple)' }}>glossary</Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Role History */}
          <div className="card-base">
            <div className="card-header">
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Role History
              </h2>
            </div>
            <div className="card-body">
              {roleHistory && roleHistory.length > 0 ? (
                <div className="space-y-3">
                  {(roleHistory as unknown as RoleWithWeek[]).map((role) => (
                    <div key={role.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RoleBadge type={role.role_type as WeeklyRoleType} />
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                        style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-badge)' }}
                      >
                        Week {role.week?.week_number}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No roles assigned yet — roles rotate weekly so everyone contributes
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resources shared count */}
          {totalResources > 0 && (
            <Link
              href="/resources"
              className="card-base card-body block transition-colors hover-bg-themed"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: 'rgba(var(--accent-amber-rgb), 0.1)' }}
                >
                  📎
                </div>
                <div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {totalResources} {totalResources === 1 ? 'resource' : 'resources'}
                  </span>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    shared with the group
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/** Visual stat card for the contribution grid */
function StatCard({
  icon,
  value,
  label,
  color,
  bgColor,
}: {
  icon: string
  value: number
  label: string
  color: string
  bgColor: string
}) {
  return (
    <div
      className="card-base p-4 flex flex-col items-center text-center"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2"
        style={{ backgroundColor: bgColor }}
      >
        {icon}
      </div>
      <div
        className="text-2xl font-bold mb-0.5"
        style={{ color }}
      >
        {value}
      </div>
      <div
        className="text-[11px] font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </div>
    </div>
  )
}
