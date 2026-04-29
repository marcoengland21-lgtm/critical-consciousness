import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import WelcomeScroll from './WelcomeScroll'

/**
 * /welcome — onboarding scroll route (Brief 1, Sprint A Session 1).
 *
 * Server component: fetches display_name + recurring-mode group
 * context (for section 2's session-day templating) and hands off to
 * the client-side WelcomeScroll component for the interactive scroll
 * + animation work.
 *
 * No has_completed_onboarding gate here — visitors who've already
 * completed onboarding can revisit the scroll if they navigate to
 * /welcome explicitly. Section 8's CTA still flips the flag and
 * redirects to /dashboard. Re-completing the flag is idempotent.
 *
 * Middleware gates /welcome behind authentication; unauth users are
 * already bounced to /login.
 */
export default async function WelcomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Profile lookup — display_name for section 1's personalised hero.
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const displayName = (profile as { display_name: string | null } | null)?.display_name ?? null

  // Group context — needed for section 2's recurring-mode-aware
  // copy ("Meet on Tuesdays" vs "Meet weekly" empty state). The
  // resolver returns nextSessionAt; we derive the weekday-plural
  // here rather than passing the ISO down to the client component.
  const group = await getCurrentGroup(supabase, user.id)

  // Inline weekday-plural derivation. One consumer, so per the
  // sub-batch 2 architectural note in session-timing-format.ts, we
  // inline rather than extracting `formatSessionWeekdayPlural`.
  let sessionDayPlural: string | null = null
  if (group?.nextSessionAt) {
    const d = new Date(group.nextSessionAt)
    const weekday = d.toLocaleDateString('en-NZ', {
      weekday: 'long',
      timeZone: 'Pacific/Auckland',
    })
    sessionDayPlural = `${weekday}s`
  }

  return (
    <WelcomeScroll
      displayName={displayName}
      groupName={group?.name ?? 'Watermelon'}
      sessionDayPlural={sessionDayPlural}
    />
  )
}
