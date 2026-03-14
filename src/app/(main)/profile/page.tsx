import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import type { ThreadType, WeeklyRoleType } from '@/types/database'
import RoleBadge from '@/components/roles/RoleBadge'

export const metadata = {
  title: 'Profile | Capital Study Group',
}

/** Map internal chapter_number to Marx's label */
function getChapterLabel(chapterNumber: number): string {
  if (chapterNumber <= 4) return `Chapter 1, Section ${chapterNumber}`
  return `Chapter ${chapterNumber - 3}`
}

export default async function ProfilePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // All queries in parallel — follows dashboard pattern
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
    `).eq('author_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('annotations').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase.from('threads').select(`
      id, title, thread_type, created_at,
      replies:replies(count)
    `).eq('author_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('threads').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase.from('replies').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase.from('glossary_entries').select('id, term, created_at').eq('created_by', user.id).order('term', { ascending: true }),
    supabase.from('resources').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
    supabase.from('reading_checkins').select(`
      id, status, created_at,
      week:reading_schedule!week_id(week_number, title)
    `).eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('weekly_roles').select(`
      id, role_type, created_at,
      week:reading_schedule!week_id(week_number, title)
    `).eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const displayName = profile?.display_name || 'User'
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-NZ', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Pacific/Auckland',
      })
    : null

  return (
    <div>
      {/* Profile Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--accent-red)' }}>
          {displayName}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {memberSince && `Member since ${memberSince}`}
          {memberSince && profile?.role && ' · '}
          {profile?.role && <span className="capitalize">{profile.role}</span>}
        </p>
      </div>

      {/* Contribution Summary */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8 text-sm">
        <span>
          <span style={{ color: 'var(--accent-purple)' }}>&#x25C6;</span>{' '}
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{annotationCount || 0}</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{annotationCount === 1 ? 'annotation' : 'annotations'}</span>
        </span>
        <span>
          <span style={{ color: 'var(--accent-red)' }}>&#x25C6;</span>{' '}
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{threadCount || 0}</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{threadCount === 1 ? 'thread' : 'threads'}</span>
        </span>
        <span>
          <span style={{ color: 'var(--accent-purple)' }}>&#x25C6;</span>{' '}
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{replyCount || 0}</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{replyCount === 1 ? 'reply' : 'replies'}</span>
        </span>
        <span>
          <span style={{ color: 'var(--accent-green)' }}>&#x25C6;</span>{' '}
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{glossaryEntries?.length || 0}</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{glossaryEntries?.length === 1 ? 'term' : 'terms'}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Annotations + Threads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Annotations */}
          <div className="rounded-xl border overflow-hidden card-elevated" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Recent Annotations
              </h2>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {annotationCount || 0} total
              </span>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)' }}>
              {recentAnnotations && recentAnnotations.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {recentAnnotations.map((ann: any) => (
                    <Link
                      key={ann.id}
                      href={`/reading/capital-vol-1/${ann.chapter?.chapter_number || 1}`}
                      className="block px-5 py-3 transition-colors hover-bg-themed"
                    >
                      <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        {ann.body.length > 140 ? ann.body.substring(0, 140).trim() + '...' : ann.body}
                      </p>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>on {getChapterLabel(ann.chapter?.chapter_number || 0)}</span>
                        <span>·</span>
                        <TimeAgo date={ann.created_at} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    No annotations yet
                  </p>
                  <Link
                    href="/reading"
                    className="text-sm font-medium"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    Start reading →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Threads */}
          <div className="rounded-xl border overflow-hidden card-elevated" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Your Threads
              </h2>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {threadCount || 0} total
              </span>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)' }}>
              {recentThreads && recentThreads.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {recentThreads.map((thread: any) => {
                    const replies = thread.replies?.[0]?.count ?? 0
                    return (
                      <Link
                        key={thread.id}
                        href={`/threads/${thread.id}`}
                        className="block px-5 py-3 transition-colors hover-bg-themed"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <ThreadTypeBadge type={thread.thread_type as ThreadType} />
                          {replies > 0 && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {replies} {replies === 1 ? 'reply' : 'replies'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {thread.title}
                        </h3>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          <TimeAgo date={thread.created_at} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="p-5 text-center">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    No threads yet
                  </p>
                  <Link
                    href="/threads/new"
                    className="text-sm font-medium"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    Start a thread →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Glossary + Reading Journey + Role History */}
        <div className="space-y-6">
          {/* Glossary Contributions */}
          <div className="rounded-xl border overflow-hidden card-elevated" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Glossary Contributions
              </h2>
            </div>
            <div className="p-5" style={{ backgroundColor: 'var(--bg-card)' }}>
              {glossaryEntries && glossaryEntries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {glossaryEntries.map((entry: any) => (
                    <Link
                      key={entry.id}
                      href="/glossary"
                      className="text-xs font-medium px-2.5 py-1 rounded-full btn-transition"
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
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  No terms defined yet
                </p>
              )}
            </div>
          </div>

          {/* Reading Journey */}
          <div className="rounded-xl border overflow-hidden card-elevated" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Reading Journey
              </h2>
            </div>
            <div className="p-5" style={{ backgroundColor: 'var(--bg-card)' }}>
              {checkins && checkins.length > 0 ? (
                <div className="space-y-2">
                  {checkins.map((checkin: any) => (
                    <div key={checkin.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--text-primary)' }}>
                        Week {checkin.week?.week_number}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: checkin.status === 'done'
                            ? 'var(--accent-green)'
                            : checkin.status === 'partial'
                            ? 'var(--accent-purple)'
                            : 'var(--accent-red)',
                          color: 'var(--text-inverse)',
                        }}
                      >
                        {checkin.status === 'done' ? 'Complete' : checkin.status === 'partial' ? 'Partial' : 'Behind'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  No reading check-ins yet
                </p>
              )}
            </div>
          </div>

          {/* Role History */}
          <div className="rounded-xl border overflow-hidden card-elevated" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Role History
              </h2>
            </div>
            <div className="p-5" style={{ backgroundColor: 'var(--bg-card)' }}>
              {roleHistory && roleHistory.length > 0 ? (
                <div className="space-y-3">
                  {roleHistory.map((role: any) => (
                    <div key={role.id} className="flex items-center justify-between">
                      <RoleBadge type={role.role_type as WeeklyRoleType} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Week {role.week?.week_number}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  No roles assigned yet
                </p>
              )}
            </div>
          </div>

          {/* Resources shared count */}
          {(resourceCount || 0) > 0 && (
            <div className="rounded-xl border p-5 card-elevated" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{resourceCount}</span>{' '}
                {resourceCount === 1 ? 'resource' : 'resources'} shared with the group
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
