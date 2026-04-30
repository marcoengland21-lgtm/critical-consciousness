import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import MinimalWelcome from './MinimalWelcome'

/**
 * /welcome — pre-launch minimal welcome (Brief 1 sub-batch 6 v6.1).
 *
 * Mars's pre-launch call: the full multi-surface onboarding scroll
 * (Reading orbit, Group vertical-flow, Personal/Dashboard) isn't ready
 * for launch. Day-one teaching happens via projected walkthrough during
 * the first session. The route renders only the v3 opener panel — single
 * warm arrival moment, then user clicks through to the dashboard.
 *
 * RESTORATION PATH (post-launch, when the full scroll is ready):
 *   1. Replace `import MinimalWelcome from './MinimalWelcome'` with
 *      `import WelcomeScroll from './WelcomeScroll'`.
 *   2. Replace the `<MinimalWelcome ... />` JSX below with the original
 *      `<WelcomeScroll displayName={...} groupName={...}
 *      sessionDayPlural={...} />`.
 *   3. Restore the `sessionDayPlural` derivation block (kept as a comment
 *      below for future use) — currently inactive since MinimalWelcome
 *      doesn't consume it.
 *   4. The full WelcomeScroll component lives at `./WelcomeScroll.tsx`
 *      and stays intact in the repo. It's unreachable from this route
 *      until the swap above happens.
 *
 * Flag behaviour unchanged: completeOnboarding flips
 * profiles.has_completed_onboarding = true and redirects to /dashboard.
 * Returning users with the flag already true bypass /welcome via
 * loginUser routing.
 *
 * Middleware gates /welcome behind authentication; unauth users are
 * already bounced to /login.
 */
export default async function WelcomePage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Profile lookup — display_name for the personalised hero.
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const displayName = (profile as { display_name: string | null } | null)?.display_name ?? null

  // Group context — for groupName in the hero. The full scroll's
  // sessionDayPlural derivation is preserved as a comment below for
  // post-launch restoration; MinimalWelcome doesn't need it.
  const group = await getCurrentGroup(supabase, user.id)

  // RESTORATION (post-launch): uncomment when restoring WelcomeScroll
  // let sessionDayPlural: string | null = null
  // if (group?.nextSessionAt) {
  //   const d = new Date(group.nextSessionAt)
  //   const weekday = d.toLocaleDateString('en-NZ', {
  //     weekday: 'long',
  //     timeZone: 'Pacific/Auckland',
  //   })
  //   sessionDayPlural = `${weekday}s`
  // }

  return (
    <MinimalWelcome
      displayName={displayName}
      groupName={group?.name ?? 'Watermelon'}
    />
  )
}
