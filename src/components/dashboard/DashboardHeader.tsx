/**
 * DashboardHeader — chunk 3b piece 4.
 *
 * The integrated top header for the 13D dashboard. Replaces the
 * SystemStatusStrip eyebrow + the simple greeting line that the
 * previous dashboard rendered.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Good evening, Marco                       [GROUP NAME]   │
 *   │ Week 4 of 32 · Reading Commodities & …                   │
 *   │ … · 38 annotations across 6 sections · 6 active threads  │
 *   │ · Next session Tuesday 7pm, in 4 days                    │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Group name eyebrow on the right is the GROUP NAME (e.g. "Watermelon"
 * for the seed group), not the platform brand "Capital Study Group" —
 * per Mars's naming addendum.
 *
 * The orientation line is a single prose line with middle-dot
 * separators. Renders only the parts that have data; degrades
 * gracefully when the schedule isn't set up yet.
 */

interface DashboardHeaderProps {
  greeting: string  // "Good evening, Marco" or "Welcome to Capital Study Group"
  groupName: string  // "Watermelon"
  /** Pre-composed orientation line, or null for the empty state. */
  orientation: string | null
}

export default function DashboardHeader({
  greeting,
  groupName,
  orientation,
}: DashboardHeaderProps) {
  return (
    <header className="mb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <p
          className="text-display-md"
          style={{ color: 'var(--text-primary)' }}
        >
          {greeting}
        </p>
        <p
          className="text-eyebrow shrink-0 mt-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {groupName}
        </p>
      </div>
      {orientation && (
        <p
          className="text-sm"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          {orientation}
        </p>
      )}
    </header>
  )
}
