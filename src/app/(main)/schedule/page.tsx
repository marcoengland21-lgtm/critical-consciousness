import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import ScheduleClient from '@/components/schedule/ScheduleClient'

export const metadata = {
  title: 'Reading Schedule | Capital Study Group',
}

/**
 * Schedule page — recurring mode.
 *
 * Per the Schedule modes (recurring v1) brief, this page replaces the
 * previous date-based weekly schedule UI with a recurring-mode shape:
 *
 *   - Current state at top: which chapter is current, when current
 *     chapter started, how many weeks the group has spent on it
 *   - Host controls (host only): single dropdown to set/change current
 *     chapter, date input to set group start date, schedule mode
 *     dropdown (recurring enabled, bounded/specific disabled)
 *   - Completed chapters timeline: reverse-chronological list of past
 *     chapter stays from group_chapter_history
 *   - Member view (non-host): same content, host controls hidden
 *   - Pre-seed empty state: when started_at is NULL, host sees a setup
 *     prompt + controls; member sees "your host will set things up"
 *
 * Drops from the previous version: per-week cards, session-notes
 * textarea, weekly_roles assignment UI, discussion_prompts list. Those
 * tables stay in the schema (per CLAUDE.md decision log entry, retained
 * as legacy data), but recurring mode doesn't surface them. Per-session
 * role rotation is the proper recurring-mode replacement, queued as
 * future work behind a `sessions` table that doesn't exist yet.
 */

interface ChapterRow {
  id: string
  chapter_number: number
  title: string
  sort_order: number
}

interface HistoryRow {
  id: string
  chapter_id: string
  started_at: string
  ended_at: string
}

export default async function SchedulePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id)
  if (!group) redirect('/login')

  // Fetch all chapters (shared text, not group-scoped) and the group's
  // chapter history in parallel. The chapter list drives the host's
  // current-chapter dropdown; the history list drives the completed-
  // chapters timeline.
  const [chaptersResult, historyResult] = await Promise.all([
    supabase
      .from('text_chapters')
      .select('id, chapter_number, title, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('group_chapter_history')
      .select('id, chapter_id, started_at, ended_at')
      .eq('group_id', group.groupId)
      .order('ended_at', { ascending: false }),
  ])

  if (chaptersResult.error) {
    console.error('[CCP] Schedule page — text_chapters query error:', chaptersResult.error)
  }
  if (historyResult.error) {
    console.error('[CCP] Schedule page — group_chapter_history query error:', historyResult.error)
  }

  const chapters = (chaptersResult.data || []) as ChapterRow[]
  const history = (historyResult.data || []) as HistoryRow[]

  return (
    <div>
      <div className="mb-6">
        <p className="text-eyebrow mb-2">Reading Journey</p>
        <h1 className="text-display-lg" style={{ color: 'var(--text-primary)' }}>
          Reading Schedule
        </h1>
      </div>

      <ScheduleClient
        groupId={group.groupId}
        scheduleMode={group.scheduleMode}
        startedAt={group.startedAt}
        currentChapterId={group.currentChapterId}
        currentChapterStartedAt={group.currentChapterStartedAt}
        isHost={group.role === 'host'}
        chapters={chapters}
        history={history}
      />
    </div>
  )
}
