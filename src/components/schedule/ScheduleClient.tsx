'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getChapterLabel } from '@/lib/chapter-utils'
import { formatNextSessionSentence } from '@/lib/session-timing-format'

/**
 * Recurring-mode schedule client.
 *
 * Renders four sections, all conditional on data state:
 *   1. Pre-seed empty state — when startedAt is NULL (group hasn't
 *      started reading yet). Host sees a setup prompt + controls;
 *      member sees "your host will set things up."
 *   2. Current state banner — current chapter label, started date,
 *      "Week N on this chapter" counter. Only when currentChapterId
 *      and currentChapterStartedAt are both set. Also renders session
 *      timing piece (010 — TRANSITIONAL) when host has set
 *      next_session_at, so members see group rhythm too.
 *   3. Host controls — chapter dropdown, start date input, schedule
 *      mode dropdown, session timing (010). Hidden for members.
 *   4. Completed chapters timeline — group_chapter_history, reverse
 *      chronological. Empty when no advances have happened yet.
 *
 * Session timing (010) note: stored as `groups.next_session_at`
 * (TIMESTAMPTZ) and `groups.session_recurrence` (free text). Host UI
 * uses native `<input type="datetime-local">` which operates in the
 * BROWSER's local timezone — for a host outside Pacific/Auckland the
 * stored UTC won't match what they typed when displayed back in NZ.
 * For the launch use (Mars in NZ), this is fine. A small "Time in
 * Pacific/Auckland" hint sits next to the input for non-NZ hosts.
 * Multi-tenant future may want explicit timezone selection.
 */

interface ChapterRow {
  id: string
  chapter_number: number
  title: string
  sort_order: number
}

interface HistoryRow {
  id: string
  chapter_id: string
  started_at: string
  ended_at: string
}

interface Props {
  groupId: string
  scheduleMode: 'recurring' | 'bounded' | 'specific'
  startedAt: string | null
  currentChapterId: string | null
  currentChapterStartedAt: string | null
  /** 010 (TRANSITIONAL): next session timestamp + free-text recurrence.
   *  Both nullable; null when host hasn't set them. */
  nextSessionAt: string | null
  sessionRecurrence: string | null
  isHost: boolean
  chapters: ChapterRow[]
  history: HistoryRow[]
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

/** Compute week count between two dates, minimum 1.
 *  A stay always counts as at least one week of attention — even a
 *  same-day advance "counted" as one week of being on that chapter
 *  for the group. Rounding to nearest avoids the off-by-one weirdness
 *  of strict floor/ceil. */
function weeksBetween(startISO: string, endISO: string | Date): number {
  const start = new Date(startISO).getTime()
  const end = (endISO instanceof Date ? endISO : new Date(endISO)).getTime()
  const diffMs = Math.max(0, end - start)
  return Math.max(1, Math.round(diffMs / MS_PER_WEEK))
}

/** Format a date as "Mar 13, 2026" in NZ timezone (per platform convention). */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Pacific/Auckland',
  })
}

/** Convert an ISO timestamp to the value format that <input type="datetime-local">
 *  expects: "YYYY-MM-DDTHH:MM" in BROWSER local time (no Z, no seconds).
 *  See JSDoc at top — Mars (NZ) browser-local matches display TZ; for
 *  hosts in other timezones the saved UTC reflects browser local.
 *  Returns empty string for null/missing input — that's the unset state
 *  the input renders natively as "mm/dd/yyyy --:--". */
function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ScheduleClient({
  groupId,
  startedAt,
  currentChapterId,
  currentChapterStartedAt,
  nextSessionAt,
  sessionRecurrence,
  isHost,
  chapters,
  history,
}: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(null)
  const [confirmAdvanceTo, setConfirmAdvanceTo] = useState<ChapterRow | null>(null)
  const [startDateDraft, setStartDateDraft] = useState<string>(startedAt ?? '')
  // Session timing drafts (010). Datetime-local input value format,
  // free text for recurrence. Initial values are the saved server state.
  const [sessionTimingDraft, setSessionTimingDraft] = useState<string>(
    isoToDatetimeLocalValue(nextSessionAt)
  )
  const [recurrenceDraft, setRecurrenceDraft] = useState<string>(sessionRecurrence ?? '')

  // Lookup map for chapter id → row, for rendering history rows.
  const chapterById = useMemo(() => {
    const m = new Map<string, ChapterRow>()
    for (const c of chapters) m.set(c.id, c)
    return m
  }, [chapters])

  const currentChapter = currentChapterId ? chapterById.get(currentChapterId) ?? null : null

  // ── Pre-seed empty state ──────────────────────────────────────────
  // The group hasn't started reading yet. For recurring mode, "started"
  // means startedAt is set — that's the canonical flag. The host sees a
  // setup prompt and can use the host controls below. The member sees a
  // simple message and no controls.
  const isPreSeed = !startedAt

  // ── Current chapter setting (host action) ─────────────────────────
  // Picking a chapter from the dropdown stages it; the user confirms in
  // the inline confirmation prompt before the RPC fires. Confirmation
  // matters because advancing writes a history row — it's not a casual
  // toggle. Selecting the already-current chapter is a no-op (button
  // disabled).
  async function confirmAdvance() {
    if (!confirmAdvanceTo || submitting) return
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc('advance_chapter', {
      p_group_id: groupId,
      p_new_chapter_id: confirmAdvanceTo.id,
    })
    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setConfirmAdvanceTo(null)
    setPendingChapterId(null)
    router.refresh()
  }

  async function saveStartDate() {
    if (!startDateDraft || submitting) return
    if (startDateDraft === startedAt) return
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc('set_group_started_at', {
      p_group_id: groupId,
      p_started_at: startDateDraft,
    })
    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.refresh()
  }

  // ── Session timing save (010) ─────────────────────────────────────
  // Single Save covers both fields atomically via the RPC. Empty
  // datetime input → null next_session_at (cleared). Empty recurrence
  // → null (cleared). Either field can be set independently — host
  // can have a recurrence with no specific next session, or a next
  // session without a stated recurrence. Both nullable on the schema.
  async function saveSessionTiming() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    // Datetime-local value is browser-local; new Date() converts to UTC ISO.
    // Null when input is empty (host clearing the field).
    const isoValue = sessionTimingDraft
      ? new Date(sessionTimingDraft).toISOString()
      : null
    const recurrenceValue = recurrenceDraft.trim() || null
    const { error: rpcError } = await supabase.rpc('set_group_session_timing', {
      p_group_id: groupId,
      p_next_session_at: isoValue,
      p_recurrence: recurrenceValue,
    })
    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.refresh()
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {error && (
        <div
          className="text-sm rounded-md p-3"
          style={{
            backgroundColor: 'rgba(var(--accent-red-rgb), 0.08)',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)',
          }}
        >
          {error}
        </div>
      )}

      {/* ── 1 + 2. Current state OR pre-seed empty state ───────────── */}
      {isPreSeed ? (
        <PreSeedEmptyState isHost={isHost} />
      ) : (
        <CurrentStateBanner
          currentChapter={currentChapter}
          currentChapterStartedAt={currentChapterStartedAt}
          startedAt={startedAt}
          nextSessionAt={nextSessionAt}
          sessionRecurrence={sessionRecurrence}
        />
      )}

      {/* ── 3. Host controls (host only) ───────────────────────────── */}
      {isHost && (
        <HostControls
          chapters={chapters}
          currentChapterId={currentChapterId}
          startDateDraft={startDateDraft}
          setStartDateDraft={setStartDateDraft}
          startedAt={startedAt}
          saveStartDate={saveStartDate}
          pendingChapterId={pendingChapterId}
          setPendingChapterId={setPendingChapterId}
          submitting={submitting}
          onAdvanceClick={(chapter) => setConfirmAdvanceTo(chapter)}
          confirmAdvanceTo={confirmAdvanceTo}
          onCancelAdvance={() => {
            setConfirmAdvanceTo(null)
            setPendingChapterId(null)
          }}
          onConfirmAdvance={confirmAdvance}
          nextSessionAt={nextSessionAt}
          sessionRecurrence={sessionRecurrence}
          sessionTimingDraft={sessionTimingDraft}
          setSessionTimingDraft={setSessionTimingDraft}
          recurrenceDraft={recurrenceDraft}
          setRecurrenceDraft={setRecurrenceDraft}
          saveSessionTiming={saveSessionTiming}
        />
      )}

      {/* ── 4. Completed chapters timeline ─────────────────────────── */}
      {history.length > 0 && (
        <CompletedChaptersTimeline history={history} chapterById={chapterById} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function PreSeedEmptyState({ isHost }: { isHost: boolean }) {
  return (
    <div
      className="rounded-lg p-8"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <p
        className="mb-2"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: 'italic',
          fontSize: '1.25rem',
          color: 'var(--text-primary)',
        }}
      >
        This group hasn&rsquo;t started reading yet.
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {isHost
          ? 'Set the start date and current chapter below to begin.'
          : 'Your host will set things up here when ready.'}
      </p>
    </div>
  )
}

function CurrentStateBanner({
  currentChapter,
  currentChapterStartedAt,
  startedAt,
  nextSessionAt,
  sessionRecurrence,
}: {
  currentChapter: ChapterRow | null
  currentChapterStartedAt: string | null
  startedAt: string | null
  nextSessionAt: string | null
  sessionRecurrence: string | null
}) {
  if (!currentChapter || !currentChapterStartedAt) {
    // Edge case: startedAt is set but the host hasn't picked a current
    // chapter yet (or the FK target was deleted, very unlikely). The
    // honest move is to render an in-between state rather than fabricate
    // a counter from incomplete data — a "Week N on this chapter" line
    // when there's no chapter would be a small lie, and the empty state
    // is a calm prompt to the host to finish setup. Keep this branch
    // explicit; do not silently coerce to chapter_number 1.
    return (
      <div
        className="rounded-lg p-8"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          A current chapter hasn&rsquo;t been set yet.
        </p>
      </div>
    )
  }
  const { label } = getChapterLabel(currentChapter.chapter_number)
  const weeksOnChapter = weeksBetween(currentChapterStartedAt, new Date())
  const nextSessionFormatted = formatNextSessionSentence(nextSessionAt)
  return (
    <div>
      <p className="text-eyebrow mb-3">Current chapter</p>
      <h2
        className="text-display-md mb-3"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: 'italic',
        }}
      >
        {label}: {currentChapter.title}
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {startedAt && (
          <>
            Group started reading on {formatDate(startedAt)} ·{' '}
          </>
        )}
        On this chapter since {formatDate(currentChapterStartedAt)} ·{' '}
        Week {weeksOnChapter} on this chapter
      </p>

      {/* Session timing piece (010 — TRANSITIONAL). Renders only when
          host has set next_session_at — banner stays clean for groups
          that haven't set timing yet. Recurrence appended only when
          also set; "Meets ${recurrence}" reads natural for "weekly",
          "fortnightly Tuesday evenings", "every other week" etc.
          Members see this same banner so the rhythm is shared, not
          host-only knowledge. */}
      {nextSessionFormatted && (
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Next session {nextSessionFormatted}
          {sessionRecurrence && ` · Meets ${sessionRecurrence}`}
        </p>
      )}
    </div>
  )
}

function HostControls({
  chapters,
  currentChapterId,
  startDateDraft,
  setStartDateDraft,
  startedAt,
  saveStartDate,
  pendingChapterId,
  setPendingChapterId,
  submitting,
  onAdvanceClick,
  confirmAdvanceTo,
  onCancelAdvance,
  onConfirmAdvance,
  nextSessionAt,
  sessionRecurrence,
  sessionTimingDraft,
  setSessionTimingDraft,
  recurrenceDraft,
  setRecurrenceDraft,
  saveSessionTiming,
}: {
  chapters: ChapterRow[]
  currentChapterId: string | null
  startDateDraft: string
  setStartDateDraft: (v: string) => void
  startedAt: string | null
  saveStartDate: () => void
  pendingChapterId: string | null
  setPendingChapterId: (v: string | null) => void
  submitting: boolean
  onAdvanceClick: (chapter: ChapterRow) => void
  confirmAdvanceTo: ChapterRow | null
  onCancelAdvance: () => void
  onConfirmAdvance: () => void
  nextSessionAt: string | null
  sessionRecurrence: string | null
  sessionTimingDraft: string
  setSessionTimingDraft: (v: string) => void
  recurrenceDraft: string
  setRecurrenceDraft: (v: string) => void
  saveSessionTiming: () => void
}) {
  const startDateChanged = startDateDraft !== '' && startDateDraft !== startedAt
  const pickedChapter = pendingChapterId
    ? chapters.find((c) => c.id === pendingChapterId) ?? null
    : null
  const pickedIsCurrent = pickedChapter?.id === currentChapterId

  // Session timing dirty-state. Save is enabled when either the
  // datetime or the recurrence draft differs from the saved server
  // value. Empty string === null at the schema level (saveSessionTiming
  // converts blank inputs to null), so equality comparisons normalize
  // null → ''.
  const savedDatetimeValue = isoToDatetimeLocalValue(nextSessionAt)
  const savedRecurrenceValue = sessionRecurrence ?? ''
  const sessionTimingChanged =
    sessionTimingDraft !== savedDatetimeValue ||
    recurrenceDraft !== savedRecurrenceValue

  return (
    <section
      className="border-t pt-6"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <p className="text-eyebrow mb-4" style={{ color: 'var(--text-secondary)' }}>
        Host controls
      </p>

      {/* Schedule mode dropdown — recurring enabled, others disabled */}
      <div className="mb-6">
        <label
          htmlFor="schedule-mode"
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Schedule mode
        </label>
        <select
          id="schedule-mode"
          className="input-base text-sm w-full max-w-md"
          value="recurring"
          disabled
          aria-disabled
        >
          <option value="recurring">Recurring</option>
          <option value="bounded" disabled>Bounded (soon)</option>
          <option value="specific" disabled>Specific weeks (soon)</option>
        </select>
      </div>

      {/* Set start date */}
      <div className="mb-6">
        <label
          htmlFor="started-at"
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Group start date
        </label>
        <div className="flex items-center gap-2 max-w-md">
          <input
            id="started-at"
            type="date"
            className="input-base text-sm flex-1"
            value={startDateDraft}
            onChange={(e) => setStartDateDraft(e.target.value)}
            disabled={submitting}
          />
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={saveStartDate}
            disabled={!startDateChanged || submitting}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Set/change current chapter */}
      <div>
        <label
          htmlFor="current-chapter"
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Current chapter
        </label>
        <div className="flex items-center gap-2 max-w-md">
          <select
            id="current-chapter"
            className="input-base text-sm flex-1"
            value={pendingChapterId ?? currentChapterId ?? ''}
            onChange={(e) => setPendingChapterId(e.target.value || null)}
            disabled={submitting}
          >
            {!currentChapterId && !pendingChapterId && (
              <option value="">Select a chapter…</option>
            )}
            {chapters.map((c) => {
              const { label } = getChapterLabel(c.chapter_number)
              const isCurrent = c.id === currentChapterId
              return (
                <option key={c.id} value={c.id}>
                  {label}
                  {isCurrent ? ' · current' : ''}
                </option>
              )
            })}
          </select>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => pickedChapter && onAdvanceClick(pickedChapter)}
            disabled={!pickedChapter || pickedIsCurrent || submitting}
          >
            Apply
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Advancing the chapter ends the current chapter&rsquo;s stay in
          the timeline below and starts a new stay on the picked chapter.
        </p>

        {/* Confirmation prompt — inline below the dropdown */}
        {confirmAdvanceTo && (
          <div
            className="mt-4 rounded-md p-4"
            style={{
              backgroundColor: 'rgba(var(--accent-amber-rgb), 0.08)',
              border: '1px solid var(--accent-amber)',
            }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
              Advance to{' '}
              <strong>
                {getChapterLabel(confirmAdvanceTo.chapter_number).label}:{' '}
                {confirmAdvanceTo.title}
              </strong>
              ? This ends the current chapter&rsquo;s stay and starts a new
              one. The history is permanent.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-primary text-xs"
                onClick={onConfirmAdvance}
                disabled={submitting}
              >
                {submitting ? 'Advancing…' : 'Advance'}
              </button>
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={onCancelAdvance}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Session timing (010 — TRANSITIONAL) ──────────────────────
          Two inputs (next session datetime + free-text recurrence)
          and a single Save calling set_group_session_timing RPC
          atomically. Both fields nullable. Native datetime-local
          input renders the unset state natively as "mm/dd/yyyy --:--"
          — that's the honest "[not set]" treatment without a custom
          placeholder. "Currently:" feedback line below the inputs
          shows saved state for confirmation. Time-zone hint sits
          near the input for non-NZ hosts (Mars-in-NZ doesn't need
          it but it's accurate for everyone).
      */}
      <div
        className="mt-8 pt-6"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <p
          className="text-xs font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Session timing
        </p>
        <p
          className="text-xs mb-4"
          style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
        >
          When the group meets next, and how often. Both optional. Time
          shown in Pacific/Auckland.
        </p>

        {/* Next session datetime */}
        <div className="mb-4">
          <label
            htmlFor="next-session-at"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Next session
          </label>
          <input
            id="next-session-at"
            type="datetime-local"
            className="input-base text-sm w-full max-w-md"
            value={sessionTimingDraft}
            onChange={(e) => setSessionTimingDraft(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Recurrence (free text) */}
        <div className="mb-4">
          <label
            htmlFor="session-recurrence"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Recurrence
          </label>
          <input
            id="session-recurrence"
            type="text"
            className="input-base text-sm w-full max-w-md"
            placeholder="e.g. weekly, fortnightly Tuesday evenings"
            value={recurrenceDraft}
            onChange={(e) => setRecurrenceDraft(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Currently-saved feedback + Save */}
        <div className="flex items-center justify-between gap-2 max-w-md">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Currently:{' '}
            {nextSessionAt || sessionRecurrence ? (
              <>
                {nextSessionAt
                  ? formatNextSessionSentence(nextSessionAt)
                  : 'no specific time'}
                {sessionRecurrence && `, meets ${sessionRecurrence}`}
              </>
            ) : (
              <em style={{ fontStyle: 'italic' }}>not set</em>
            )}
          </p>
          <button
            type="button"
            className="btn-secondary text-xs shrink-0"
            onClick={saveSessionTiming}
            disabled={!sessionTimingChanged || submitting}
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  )
}

function CompletedChaptersTimeline({
  history,
  chapterById,
}: {
  history: HistoryRow[]
  chapterById: Map<string, ChapterRow>
}) {
  return (
    <section
      className="border-t pt-6"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <p className="text-eyebrow mb-4" style={{ color: 'var(--text-secondary)' }}>
        Completed chapters
      </p>
      <ul className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
        {history.map((row) => {
          const chapter = chapterById.get(row.chapter_id)
          if (!chapter) return null
          const { label } = getChapterLabel(chapter.chapter_number)
          const weeks = weeksBetween(row.started_at, row.ended_at)
          return (
            <li key={row.id} className="py-3">
              <p
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: '1.05rem',
                  color: 'var(--text-primary)',
                }}
              >
                {label}: {chapter.title}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {weeks} {weeks === 1 ? 'week' : 'weeks'} ·{' '}
                {formatDate(row.started_at)} – {formatDate(row.ended_at)}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
