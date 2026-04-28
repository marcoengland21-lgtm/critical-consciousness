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
 * Composer (dashboard/page.tsx) returns null when started_at or
 * current_chapter_id is unset — header skips the line entirely. No
 * platform-generated structure for groups that haven't started.
 *
 * Session timing is intentionally absent in recurring v1 (no schema
 * field for it; queues for the future `sessions` table piece). When
 * sessions land, the orientation line gains a third part:
 * "Week 12 · Week 3 on Chapter 1, §4 · Next session Tuesday 7pm".
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
