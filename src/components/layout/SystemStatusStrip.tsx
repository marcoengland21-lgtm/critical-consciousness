import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getChapterLabel } from '@/lib/chapter-utils'
import { getCurrentGroup } from '@/lib/group-resolver'
import { formatNextSessionSentence } from '@/lib/session-timing-format'

/**
 * SystemStatusStrip — ambient context line at the top of every
 * authenticated page (suppressed on /dashboard, which has its own
 * integrated header carrying the same info).
 *
 * Implements the calm-technology principle: tells you where you are in
 * the journey without notification anxiety, urgency signals, or unread
 * counters.
 *
 * Recurring-v1 dual-counter format:
 *   WATERMELON · WEEK 12 · WEEK 3 ON CHAPTER 1, §4
 *   WATERMELON · READING JOURNEY NOT YET STARTED
 *
 *   - Group name (e.g. "Watermelon") — from groups.name via the
 *     resolver, not the platform brand.
 *   - Total counter (Week N) — weeks since groups.started_at.
 *   - Chapter counter + section reference (Week M on Chapter X, §Y) —
 *     weeks since groups.current_chapter_started_at, plus the current
 *     chapter label.
 *
 * With session timing (010 — TRANSITIONAL, when host has set
 * groups.next_session_at), strip gains a fourth piece:
 *   WATERMELON · WEEK 12 · WEEK 3 ON CHAPTER 1, §4 · NEXT SESSION TUESDAY 7PM
 *
 * Small-caps eyebrow throughout (matches strip's existing visual
 * register). Compact time format ("7PM" not "7:00 PM"). Recurrence
 * text (groups.session_recurrence) is NOT consumed by the strip —
 * it's display-only on the schedule page. Two fields, two surfaces,
 * no parsing.
 *
 * Empty state:
 *   - When started_at OR current_chapter_id is unset, render
 *     "READING JOURNEY NOT YET STARTED" — the host hasn't begun seeding
 *     and the group hasn't earned the structure of a counter. Session
 *     timing piece is also omitted in this state (no counter, no
 *     session anchor).
 *
 * The session-timing piece (and the underlying 010 columns) get
 * dropped when the dedicated `sessions` table piece ships.
 */
export default async function SystemStatusStrip() {
  const supabase = await createClient()
  const user = await getSessionUser()
  const now = new Date()

  // Resolve current group via membership. When the user isn't
  // authenticated or has no memberships, render nothing — the strip
  // is meaningful only inside a group context.
  const group = user ? await getCurrentGroup(supabase, user.id) : null
  if (!group) return null

  const groupName: string = group.name

  // Compose the strip parts. First part is GROUP name.
  const parts: string[] = [groupName]

  if (!group.startedAt || !group.currentChapterId || !group.currentChapterStartedAt) {
    // Empty state: group hasn't started, or host hasn't picked a
    // current chapter. Don't fabricate counters from incomplete data.
    parts.push('Reading journey not yet started')
  } else {
    // Compute the dual counter from group state alone — no
    // reading_schedule queries (recurring mode doesn't use that table).
    const startedAtMs = new Date(group.startedAt).getTime()
    const chapterStartedMs = new Date(group.currentChapterStartedAt).getTime()
    const nowMs = now.getTime()
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
    const totalWeeks = Math.max(1, Math.floor((nowMs - startedAtMs) / MS_PER_WEEK) + 1)
    const chapterWeeks = Math.max(1, Math.floor((nowMs - chapterStartedMs) / MS_PER_WEEK) + 1)

    // Look up the current chapter for its section/chapter label.
    // Single-row fetch by id; cheap. text_chapters is shared text
    // (not group-scoped), so no group filter needed.
    const { data: chapterRow } = await supabase
      .from('text_chapters')
      .select('chapter_number')
      .eq('id', group.currentChapterId)
      .maybeSingle()

    parts.push(`Week ${totalWeeks}`)
    if (chapterRow) {
      const { label } = getChapterLabel((chapterRow as { chapter_number: number }).chapter_number)
      parts.push(`Week ${chapterWeeks} on ${label}`)
    } else {
      // Defensive: if the FK target was deleted (very unlikely),
      // render the chapter counter without the label rather than
      // silently dropping it.
      parts.push(`Week ${chapterWeeks} on current chapter`)
    }

    // Session timing piece (010 — TRANSITIONAL). Append only when
    // host has set groups.next_session_at — omits cleanly otherwise
    // and pre-seed groups never reach this branch. The piece slots in
    // after the dual counter so the existing parts stay stable when
    // session timing is absent. Sentence-case here; the strip's
    // `.text-eyebrow` wrapper applies the uppercase transform via CSS,
    // matching how the other parts ("Watermelon", "Week 12") are
    // pushed. Single source of truth on case.
    const nextSession = formatNextSessionSentence(group.nextSessionAt)
    if (nextSession) {
      parts.push(`Next session ${nextSession}`)
    }
  }

  return (
    <div
      className="flex justify-end pt-2 pb-4"
      aria-label="Study group status"
    >
      <p className="text-eyebrow">
        {parts.join(' · ')}
      </p>
    </div>
  )
}
