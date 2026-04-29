import Link from 'next/link'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createStaticClient, getSessionUser } from '@/lib/supabase/server'
import { getChapterLabel } from '@/lib/chapter-utils'
import { formatNextSessionSentence } from '@/lib/session-timing-format'

/**
 * Interim landing page (Brief 1, Sprint A Session 1).
 *
 * Replaces the previous static two-button "Sign In / Create Account"
 * landing with the Watermelon-anchored single-CTA design. The
 * platform brand stays quiet at the top; Watermelon is the hero.
 *
 * Routing:
 *   - Authenticated users → /dashboard (auth-redirect server-side; the
 *     middleware deliberately skips this path so the unauth render is
 *     fully cacheable, so the redirect lives here in the page).
 *   - Unauthenticated users → see this page.
 *
 * Data fetch:
 *   - One row from `groups` keyed on Watermelon's hardcoded UUID
 *     (seeded by migration 005). Plus, when current_chapter_id is
 *     set, one row from `text_chapters` for the chapter label. Both
 *     tables are public-readable post-L1 (NOT group-membership-RLS),
 *     so `createStaticClient()` is sufficient — no auth context.
 *   - Wrapped in unstable_cache with 60s revalidation. Watermelon's
 *     group state changes infrequently (only when Mars edits via the
 *     schedule page); the public landing doesn't need real-time
 *     freshness.
 *
 * Templating + honest empty states (per Brief 1 sign-off):
 *   - CURRENTLY line renders only when started_at, current_chapter_id,
 *     current_chapter_started_at are ALL set AND the chapter row
 *     resolves. Partial counters are never shown — incomplete data
 *     means the line is omitted, not faked.
 *   - SESSIONS line renders only when next_session_at is set.
 *   - FORMAT line is static; renders whenever the meta-row renders.
 *   - The whole meta-row is omitted when neither CURRENTLY nor
 *     SESSIONS would render (Format-only would be a row carrying no
 *     real information about Watermelon, just generic platform copy).
 *
 * Inline-in-page-components decision (Brief 1, sub-batch 2):
 *   - Dual-counter computation lives inline below. SystemStatusStrip
 *     has the parallel inline. See the architectural note in
 *     `src/lib/session-timing-format.ts` for the trigger condition
 *     to extract a shared helper (third NEW surface needing the same
 *     shape, e.g. Session 3's group-scoped schedule view).
 */

// Watermelon group UUID — seeded by migration 005 (L1 multi-tenancy).
// Hardcoded here intentionally: the interim landing IS Watermelon,
// not generic. Multi-tenant landing UI is post-L3 territory.
const WATERMELON_ID = '00000000-0000-0000-0000-000000000002'

interface LandingGroupData {
  name: string
  startedAt: string | null
  currentChapterStartedAt: string | null
  nextSessionAt: string | null
  chapterNumber: number | null
}

const getWatermelonForLanding = unstable_cache(
  async (): Promise<LandingGroupData | null> => {
    const supabase = createStaticClient()
    const { data: group } = await supabase
      .from('groups')
      .select('name, started_at, current_chapter_id, current_chapter_started_at, next_session_at')
      .eq('id', WATERMELON_ID)
      .maybeSingle()
    if (!group) return null

    const row = group as {
      name: string
      started_at: string | null
      current_chapter_id: string | null
      current_chapter_started_at: string | null
      next_session_at: string | null
    }

    let chapterNumber: number | null = null
    if (row.current_chapter_id) {
      const { data: chapter } = await supabase
        .from('text_chapters')
        .select('chapter_number')
        .eq('id', row.current_chapter_id)
        .maybeSingle()
      chapterNumber = (chapter as { chapter_number: number } | null)?.chapter_number ?? null
    }

    return {
      name: row.name,
      startedAt: row.started_at,
      currentChapterStartedAt: row.current_chapter_started_at,
      nextSessionAt: row.next_session_at,
      chapterNumber,
    }
  },
  ['watermelon-landing'],
  { revalidate: 60 }
)

export default async function Home() {
  // Auth-redirect for logged-in users. Middleware skips `/` by design
  // so this stays the only place that sends authenticated visitors on
  // to the dashboard.
  const user = await getSessionUser()
  if (user) redirect('/dashboard')

  const data = await getWatermelonForLanding()

  // Inline dual-counter computation — see header comment above for the
  // architectural reason this isn't extracted to a shared helper.
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
  let dualCounter: { totalWeeks: number; chapterWeeks: number } | null = null
  if (data?.startedAt && data?.currentChapterStartedAt) {
    const now = Date.now()
    const startedMs = new Date(data.startedAt).getTime()
    const chapterStartedMs = new Date(data.currentChapterStartedAt).getTime()
    dualCounter = {
      totalWeeks: Math.max(1, Math.floor((now - startedMs) / MS_PER_WEEK) + 1),
      chapterWeeks: Math.max(1, Math.floor((now - chapterStartedMs) / MS_PER_WEEK) + 1),
    }
  }

  const chapterLabel = data?.chapterNumber != null
    ? getChapterLabel(data.chapterNumber).label
    : null

  const renderCurrently = dualCounter !== null && chapterLabel !== null

  const sessionSentence = formatNextSessionSentence(data?.nextSessionAt ?? null)
  const renderSessions = sessionSentence !== null

  const renderMetaRow = renderCurrently || renderSessions

  // Group name fallback is purely defensive — if the Watermelon row
  // somehow can't be fetched, render the static name rather than show
  // an empty-string CTA. Migration 005 ships the row, so this fallback
  // should never trip in practice.
  const groupName = data?.name ?? 'Watermelon'

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      {/* Quiet platform header. Mono badge + name + tagline (tagline
          drops on mobile per mum's L2 design — the badge + name carries
          the brand alone at 375px). */}
      <header className="px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-7 h-7 rounded text-sm font-bold"
          style={{
            backgroundColor: 'var(--bg-nav)',
            color: 'var(--text-inverse)',
            fontFamily: "'Lora', Georgia, serif",
          }}
        >
          C
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Capital Study Group
        </span>
        <span
          className="hidden sm:inline-block text-xs"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          A platform for Marxist study groups
        </span>
      </header>

      {/* Hero + meta-row + CTAs */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-2xl text-center">
          {/* Hero. Two-line break — "Welcome to" reads as approach,
              "{groupName}." reads as arrival. Matches mum's L1/L2
              layout. Lora-italic via the .text-display-lg utility. */}
          <h1
            className="text-display-lg mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Welcome to
            <span className="block">{groupName}.</span>
          </h1>

          <p
            className="text-base sm:text-lg mb-8 max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            A small group reading Marx&rsquo;s Capital, Volume I together.
          </p>

          {/* Meta-row: three keys (CURRENTLY / SESSIONS / FORMAT) on
              desktop with hairline dividers between, stacked on mobile.
              Honest empty-state degradation — see header comment.
              Build the visible children explicitly so the divider
              logic (left-border on every child after the first) is
              correct regardless of which contextual lines render. */}
          {renderMetaRow && (() => {
            type MetaItem = { label: string; value: React.ReactNode }
            const items: MetaItem[] = []
            if (renderCurrently) {
              items.push({
                label: 'Currently',
                value: (
                  <>
                    Week {dualCounter!.totalWeeks} &middot; Week {dualCounter!.chapterWeeks} on {chapterLabel}
                  </>
                ),
              })
            }
            if (renderSessions) {
              items.push({ label: 'Sessions', value: sessionSentence })
            }
            items.push({ label: 'Format', value: 'Read on your own. Meet weekly.' })

            // Tailwind needs class names to be statically discoverable.
            // items.length is always 2 or 3 (FORMAT always present;
            // renderMetaRow guarantees at least one of CURRENTLY /
            // SESSIONS), so an explicit ternary on the literal strings
            // is sufficient — no runtime class-name interpolation.
            const colsClass = items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            return (
              <div
                className={`my-8 sm:my-10 grid gap-6 sm:gap-0 ${colsClass} text-left sm:text-center`}
              >
                {items.map((item, i) => (
                  // Divider is sm+ only — mobile stacks vertically and
                  // a left border on stacked items reads as a stray
                  // vertical line, not a hairline divider. `sm:border-l`
                  // adds the width at the sm breakpoint; `border-subtle`
                  // (defined in globals.css) sets the color globally —
                  // harmless on mobile where no width applies.
                  <div
                    key={item.label}
                    className={`sm:px-4 ${i > 0 ? 'sm:border-l border-subtle' : ''}`}
                  >
                    <p className="text-eyebrow mb-2">{item.label}</p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Primary CTA — single path, joins Watermelon */}
          <div className="mt-8 sm:mt-10">
            <Link
              href="/register"
              className="btn-primary inline-flex items-center justify-center px-8 py-3 text-base"
            >
              Join {groupName}
            </Link>
          </div>

          {/* Secondary path — sign in for existing members */}
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold hover:underline"
              style={{ color: 'var(--accent-red)' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Footer — quiet, single line. Per Brief 1 sign-off, the
          previous "Hosting one reading group during launch. About →"
          tail is dropped — there's no /about route to point at and
          the line manufactured a sense that the reader needed more
          context than they actually do. */}
      <footer className="px-4 sm:px-8 py-6 text-center">
        <p
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Capital Study Group &middot; est. 2026
        </p>
      </footer>
    </main>
  )
}
