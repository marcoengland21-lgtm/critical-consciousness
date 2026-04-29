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
 *
 * ── ARCHITECTURAL NOTE: inline-vs-shared trigger (Brief 1, sub-batch 2)
 *
 * Brief 1 introduced two new surfaces that consume similar
 * recurring-mode templating shapes:
 *
 *   1. The interim landing meta-row (`src/app/page.tsx`, sub-batch 4) —
 *      renders dual counter + chapter label + next-session sentence
 *      pulled from Watermelon's `groups` row by hardcoded UUID, with
 *      honest empty-state degradation per field.
 *
 *   2. The onboarding scroll section 2 (the welcome route, sub-batch 7) —
 *      consumes only the weekday from `next_session_at` to render
 *      "Read at your pace. Meet on Tuesdays." vs the unset fallback
 *      "Read at your pace. Meet weekly."
 *
 * SystemStatusStrip already inlines the dual-counter computation
 * (weeks-since-`started_at`, weeks-since-`current_chapter_started_at`
 * with `Math.max(1, …)` floors) directly in its render body. The
 * Brief 1 surfaces (1) and (2) above land their own inline copies
 * rather than extracting a shared helper here.
 *
 * Working pattern: inline-per-surface is fine at TWO surfaces; the
 * extraction trigger is THREE. When a third surface needs the same
 * shape — concrete candidates include Session 3's group-scoped
 * schedule/zoom view, R2's moderation views, or anything post-launch
 * that needs dual-counter or weekday-plural rendering — the right
 * move is to extend this file with the shared helpers
 * (`computeDualCounter`, `formatSessionWeekdayPlural`, etc.) and
 * migrate all existing inline copies to consume them. Until then,
 * the extra cognitive cost of "find where this lives" is smaller
 * than the speculative-abstraction cost of building one-consumer
 * helpers.
 *
 * Sourced from the inline-in-page-components decision in the Brief 1
 * investigation note (sign-off captured in CLAUDE.md Decision Log
 * when this piece ships clean).
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
