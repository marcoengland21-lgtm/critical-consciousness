import { createClient } from '@/lib/supabase/server'
import { getChapterLabel } from '@/lib/chapter-utils'

/**
 * SystemStatusStrip — ambient context line at the top of every authenticated page.
 *
 * Per IMPROVEMENTS_PLAN §2.6 + §5.1.1. Implements the calm-technology
 * principle: tells you where you are in the journey without notification
 * anxiety, urgency signals, or unread counters.
 *
 * Format examples:
 *   CAPITAL STUDY GROUP · WEEK 4 OF 32 · CHAPTER 1, §4 · NEXT SESSION TUE 7PM
 *   CAPITAL STUDY GROUP · READING JOURNEY NOT YET STARTED
 *
 * Renders as a single right-aligned eyebrow line at the top of the main
 * content area. Degrades gracefully when the schedule isn't set up yet.
 */
export default async function SystemStatusStrip() {
  const supabase = await createClient()
  const now = new Date()
  const nowISO = now.toISOString()

  // Two cheap parallel queries — total weeks + the next upcoming week.
  // Both go through the same reading_schedule table, which is small and
  // already cached by other pages (Next.js will dedupe within a request).
  const [{ count: totalWeeks }, { data: nextWeekRows }] = await Promise.all([
    supabase
      .from('reading_schedule')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('reading_schedule')
      .select('week_number, session_date, session_location, title')
      .gte('due_date', nowISO)
      .order('due_date', { ascending: true })
      .limit(1),
  ])

  const nextWeek = nextWeekRows?.[0] || null

  // Look up the chapter label for this week's reading. Reading schedule
  // doesn't directly join to text_chapters — we approximate by mapping
  // week_number to the chapter_number that lives that week. (For Capital,
  // the first 4 weeks map to Ch 1 §1-§4, etc — see chapter-utils.)
  let chapterLabel: string | null = null
  if (nextWeek?.week_number) {
    chapterLabel = getChapterLabel(nextWeek.week_number).label
  }

  // Format next-session as "TUE 7PM" style — per the plan example.
  // Always Pacific/Auckland (Christchurch group) per Rule 14.
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

  // Compose the strip parts.
  const parts: string[] = ['Capital Study Group']

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
