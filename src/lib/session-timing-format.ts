/**
 * Session-timing format helper for orientation lines (010 — group
 * session timing, transitional).
 *
 * Returns sentence-case "[weekday] [time]" — the two consumer surfaces
 * (DashboardHeader, SystemStatusStrip) handle case via CSS:
 *   - DashboardHeader renders sentence-case prose directly
 *     → "Tuesday 7pm"
 *   - SystemStatusStrip wraps the parts in `.text-eyebrow` which
 *     applies `text-transform: uppercase`
 *     → "TUESDAY 7PM"
 *
 * One source of truth, no double-uppercasing. Time format compresses
 * to "Hpm" when minutes are :00, "H:MMpm" otherwise — matches the
 * platform's quiet/conversational voice ("7pm" rather than
 * "7:00 PM"). Always Pacific/Auckland per CLAUDE.md rule 14.
 *
 * `session_recurrence` (free text) is intentionally NOT consumed by
 * orientation lines — it lives only on the schedule page where it has
 * space to be human-readable. Two fields, two surfaces, no parsing.
 */

const TIMEZONE = 'Pacific/Auckland'

/** Format an ISO timestamp as "[weekday] [time]" in sentence case.
 *  Example: "2026-04-28T19:00:00Z" → "Tuesday 7pm"
 *  Returns null if the input is null (caller can splice ?? null cleanly). */
export function formatNextSessionSentence(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const weekday = d.toLocaleDateString('en-NZ', {
    weekday: 'long',
    timeZone: TIMEZONE,
  })
  return `${weekday} ${formatTimeCompact(d)}`
}

/** Compact time string. ":00" minutes drop; otherwise H:MMam/pm.
 *  Pacific/Auckland always. Uses Intl.DateTimeFormat#formatToParts so
 *  we can pull hour / minute / dayPeriod independently and assemble
 *  without locale-string fragility. */
function formatTimeCompact(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE,
  }).formatToParts(d)
  let hour = '12'
  let minute = '00'
  let period = 'am'
  for (const p of parts) {
    if (p.type === 'hour') hour = p.value
    else if (p.type === 'minute') minute = p.value
    else if (p.type === 'dayPeriod') period = p.value.toLowerCase()
  }
  return minute === '00' ? `${hour}${period}` : `${hour}:${minute}${period}`
}
