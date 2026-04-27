import { createClient } from '@/lib/supabase/server'
import { getChapterLabel } from '@/lib/chapter-utils'

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

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
  const now = new Date()

  // Fetch group name + ALL weeks in parallel.
  const [
    { data: groupRow },
    { data: allWeeksData },
  ] = await Promise.all([
    supabase
      .from('groups')
      .select('name')
      .eq('id', DEFAULT_GROUP_ID)
      .maybeSingle(),
    supabase
      .from('reading_schedule')
      .select('week_number, session_date, session_location, title, due_date')
      .order('week_number', { ascending: true }),
  ])

  // Group name fallback chain: groups.name → "Capital Study Group" as
  // a last resort if the row hasn't been seeded. The platform brand
  // string is acceptable as a fallback (the worst case is a less-
  // identifying eyebrow, not broken UI).
  const groupName: string =
    (groupRow as { name?: string } | null)?.name || 'Capital Study Group'

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
