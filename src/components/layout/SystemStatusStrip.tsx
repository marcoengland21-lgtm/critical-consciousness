import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getChapterLabel } from '@/lib/chapter-utils'
import { getCurrentGroup } from '@/lib/group-resolver'

/**
 * SystemStatusStrip — ambient context line at the top of every authenticated page.
 *
 * Per IMPROVEMENTS_PLAN §2.6 + §5.1.1. Implements the calm-technology
 * principle: tells you where you are in the journey without notification
 * anxiety, urgency signals, or unread counters.
 *
 * Format examples:
 *   WATERMELON · WEEK 4 OF 32 · CHAPTER 1, §4 · NEXT SESSION TUE 7PM
 *   WATERMELON · READING JOURNEY NOT YET STARTED
 *
 * Chunk 3b piece 4 (naming addendum): the FIRST PART of the strip is
 * the GROUP name, fetched from `groups.name` — not the platform brand
 * "Capital Study Group". Mars's note: "Where the design pack PDF
 * shows 'CAPITAL STUDY GROUP' in eyebrow text on dashboard frames,
 * that's implementation-time copy that should be the actual group
 * name from the database. For the launch group: 'Watermelon.'"
 *
 * The strip is suppressed on `/dashboard` because the dashboard's own
 * header carries the same information (group-name eyebrow + greeting
 * + orientation line) — rendering both would be redundant.
 *
 * Renders as a single right-aligned eyebrow line at the top of the main
 * content area. Degrades gracefully when the schedule isn't set up yet.
 */
export default async function SystemStatusStrip() {
  const supabase = await createClient()
  const user = await getSessionUser()
  const now = new Date()

  // Resolve current group via membership (chunk 3b L1). When the user
  // isn't authenticated or has no memberships, render nothing — the
  // strip is meaningful only inside a group context.
  const group = user ? await getCurrentGroup(supabase, user.id) : null
  if (!group) return null

  const { data: allWeeksData } = await supabase
    .from('reading_schedule')
    .select('week_number, session_date, session_location, title, due_date')
    .eq('group_id', group.groupId)
    .order('week_number', { ascending: true })

  const groupName: string = group.name

  const allWeeks = (allWeeksData || []) as { week_number: number; session_date: string | null; session_location: string | null; title: string; due_date: string }[]
  const totalWeeks = allWeeks.length
  const nextWeek =
    allWeeks.find((w) => new Date(w.due_date) >= now) ||
    allWeeks[allWeeks.length - 1] ||
    null

  let chapterLabel: string | null = null
  if (nextWeek?.week_number) {
    chapterLabel = getChapterLabel(nextWeek.week_number).label
  }

  let sessionLabel: string | null = null
  if (nextWeek?.session_date) {
    const d = new Date(nextWeek.session_date)
    const day = d.toLocaleString('en-NZ', {
      weekday: 'short',
      timeZone: 'Pacific/Auckland',
    }).toUpperCase()
    const time = d.toLocaleString('en-NZ', {
      hour: 'numeric',
      hour12: true,
      timeZone: 'Pacific/Auckland',
    }).replace(/\s/g, '').toUpperCase()
    sessionLabel = `${day} ${time}`
  }

  // Compose the strip parts. First part is GROUP name (per addendum).
  const parts: string[] = [groupName]

  if (!totalWeeks || totalWeeks === 0 || !nextWeek) {
    parts.push('Reading journey not yet started')
  } else {
    parts.push(`Week ${nextWeek.week_number} of ${totalWeeks}`)
    if (chapterLabel) parts.push(chapterLabel)
    if (sessionLabel) parts.push(`Next session ${sessionLabel}`)
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
