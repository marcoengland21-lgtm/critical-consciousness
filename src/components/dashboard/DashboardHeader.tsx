/**
 * DashboardHeader — chunk 3b piece 4 + Schedule modes (recurring v1)
 * orientation refresh.
 *
 * The integrated top header for the dashboard. Replaces the
 * SystemStatusStrip eyebrow + the simple greeting line that the
 * previous dashboard rendered.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Good evening, Marco                       [GROUP NAME]   │
 *   │ Week 12 · Week 3 on Chapter 1, §4                        │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Group name eyebrow on the right is the GROUP NAME (e.g. "Watermelon"
 * for the seed group), not the platform brand "Capital Study Group".
 *
 * Orientation line — recurring-v1 dual counter format:
 *   "Week N · Week M on Chapter X, §Y"
 *   - Total counter (Week N): weeks since groups.started_at.
 *   - Chapter counter (Week M): weeks since groups.current_chapter_started_at.
 *   - Chapter + section: getChapterLabel(currentChapter.chapter_number).
 *
 * With session timing (010 — TRANSITIONAL, when host has set
 * groups.next_session_at), orientation gains a third piece:
 *   "Week N · Week M on Chapter X, §Y · Next session Tuesday 7pm"
 *
 * Sentence-case prose throughout including the weekday (matches the
 * dashboard's conversational voice). Compact time format ("7pm" not
 * "7:00 PM"). Recurrence text (groups.session_recurrence) is NOT
 * consumed by this line — it's display-only metadata, lives on the
 * schedule page where it has space to be human-readable. Two fields,
 * two surfaces, no parsing.
 *
 * Composer (dashboard/page.tsx) returns null when started_at or
 * current_chapter_id is unset — header skips the line entirely. No
 * platform-generated structure for groups that haven't started.
 *
 * Session timing piece (and the underlying 010 columns) get dropped
 * when the dedicated `sessions` table piece ships and the next-
 * session timestamp is computed from the next future session row.
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
