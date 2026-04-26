/**
 * Testing-mode override — chunk 2 part 1.
 *
 * Lets Mars (admin) verify how surfaces render in different journey states
 * and (later) different rhythm modes by appending URL parameters, without
 * touching the database.
 *
 * Parameters (admin-only — silently ignored for non-admin users):
 *   ?journey=started        → render as if the journey is started
 *   ?journey=not_started    → render as if not started
 *   ?mode=prep|session|recap|trough  → reserved for future rhythm-shift work
 *
 * Doesn't persist across navigation. No DB writes. No new queries — admin
 * role is read from the profile lookup the page already does.
 *
 * Server-side helper (rather than the brief's suggested useSearchParams hook)
 * because the dashboard is a server component that receives `searchParams`
 * as a prop and applies the override before computing journey state. A
 * client-side hook would force the override into a re-render after hydration,
 * which would briefly flash the un-overridden state.
 */

export type JourneyOverride = 'started' | 'not_started'
export type ModeOverride = 'prep' | 'session' | 'recap' | 'trough'

export interface TestingOverride {
  journey?: JourneyOverride
  mode?: ModeOverride
}

const JOURNEY_VALUES: ReadonlySet<string> = new Set(['started', 'not_started'])
const MODE_VALUES: ReadonlySet<string> = new Set(['prep', 'session', 'recap', 'trough'])

/**
 * Parse a Next.js searchParams object into a TestingOverride. Returns null
 * when the user is NOT an admin OR when no override params are present.
 *
 * `searchParams` is the prop passed to a Next.js server-component page
 * (string | string[] | undefined per key).
 */
export function getTestingOverride(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  isAdmin: boolean
): TestingOverride | null {
  if (!searchParams || !isAdmin) return null

  const journeyRaw = first(searchParams.journey)
  const modeRaw = first(searchParams.mode)

  const override: TestingOverride = {}
  if (journeyRaw && JOURNEY_VALUES.has(journeyRaw)) {
    override.journey = journeyRaw as JourneyOverride
  }
  if (modeRaw && MODE_VALUES.has(modeRaw)) {
    override.mode = modeRaw as ModeOverride
  }

  if (override.journey === undefined && override.mode === undefined) return null
  return override
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}
