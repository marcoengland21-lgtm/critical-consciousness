'use client'

/**
 * RhythmWidget — chunk 3b piece 4.
 *
 * Top of the dashboard's right rail per frame 13D. Tells the reader
 * where they are in the weekly rhythm — days until next session,
 * their role, the rest of the group's roles, and a M-T-W-T-F-S-S
 * day strip with today highlighted.
 *
 *   RHYTHM
 *   4 days until session
 *
 *   YOUR ROLE
 *   Discussion starter
 *
 *   Bring 2-3 questions for Tuesday. Daniel is summarising;
 *   Pita is on closing.
 *
 *   M  T  W  T  F  S  S
 *      ─  ●  ─  ─  ─  ─
 *
 * The widget receives pre-computed data from the dashboard server
 * component (no client-side data fetching here). Client-side because
 * "today" is locale-dependent.
 */

import type { WeeklyRoleType } from '@/types/database'
import RoleBadge from '@/components/roles/RoleBadge'

interface OtherRole {
  authorName: string
  roleType: WeeklyRoleType
}

interface RhythmWidgetProps {
  /** Days until the next session. null when no session scheduled. */
  daysUntilSession: number | null
  /** The user's role this week, if any. */
  myRole: WeeklyRoleType | null
  /** Other group members' roles for the week — used for the
      "Daniel is summarising; Pita is on closing" gloss. */
  otherRoles: OtherRole[]
}

/** Map a role type to a verb-phrase used in the gloss line. */
function roleVerbPhrase(role: WeeklyRoleType): string {
  switch (role) {
    case 'summarizer': return 'summarising'
    case 'discussion_starter': return 'starting discussion'
    case 'connector': return 'connecting'
    case 'passage_picker': return 'picking passages'
  }
}

/** Map the user's role to the action prompt. */
function rolePrompt(role: WeeklyRoleType): string {
  switch (role) {
    case 'summarizer':
      return 'Bring a brief summary of the key arguments for Tuesday.'
    case 'discussion_starter':
      return 'Bring 2-3 questions for Tuesday.'
    case 'connector':
      return 'Find connections to current events or earlier reading for Tuesday.'
    case 'passage_picker':
      return 'Pick 1-2 key passages for close reading on Tuesday.'
  }
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

export default function RhythmWidget({
  daysUntilSession,
  myRole,
  otherRoles,
}: RhythmWidgetProps) {
  // Today's day-of-week in NZ timezone. 0 = Monday, 6 = Sunday.
  const nzDay = new Date().toLocaleDateString('en-NZ', {
    weekday: 'short',
    timeZone: 'Pacific/Auckland',
  })
  const dayMap: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  }
  const todayIdx = dayMap[nzDay] ?? 0

  // Compose the prompt + others-gloss line.
  const promptText = myRole ? rolePrompt(myRole) : null
  const othersText =
    otherRoles.length > 0
      ? otherRoles
          .map((r, i) => {
            const verb = roleVerbPhrase(r.roleType)
            const conj = i === 0 ? '' : i === otherRoles.length - 1 ? '; ' : '; '
            return `${conj}${r.authorName} is ${verb}`
          })
          .join('') + '.'
      : null

  return (
    <section aria-label="This week's rhythm">
      <p className="text-eyebrow mb-2">Rhythm</p>

      {daysUntilSession !== null && (
        <h3
          className="mb-4"
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '1.5rem',
            lineHeight: 1.2,
          }}
        >
          {daysUntilSession === 0
            ? 'Session is today'
            : daysUntilSession === 1
              ? '1 day until session'
              : `${daysUntilSession} days until session`}
        </h3>
      )}

      {myRole && (
        <div className="mb-3">
          <p className="text-eyebrow mb-1">Your role</p>
          <RoleBadge type={myRole} />
        </div>
      )}

      {(promptText || othersText) && (
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          {promptText}
          {promptText && othersText ? ' ' : ''}
          {othersText}
        </p>
      )}

      {/* Day strip — today highlighted purple */}
      <div
        className="grid grid-cols-7 gap-1 text-xs font-semibold tabular-nums"
        role="presentation"
      >
        {DAY_LETTERS.map((letter, idx) => {
          const isToday = idx === todayIdx
          return (
            <div
              key={idx}
              className="flex items-center justify-center py-1.5 rounded"
              style={{
                backgroundColor: isToday ? 'var(--accent-purple)' : 'transparent',
                color: isToday ? 'var(--text-inverse)' : 'var(--text-secondary)',
                border: isToday
                  ? 'none'
                  : '1px solid var(--border-subtle)',
              }}
              aria-label={isToday ? `Today, ${letter}` : letter}
            >
              {letter}
            </div>
          )
        })}
      </div>
    </section>
  )
}
