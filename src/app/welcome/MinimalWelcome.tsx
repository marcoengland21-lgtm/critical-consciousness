'use client'

import { completeOnboarding } from './actions'

/**
 * MinimalWelcome — single-panel pre-launch welcome (Brief 1 sub-batch 6 v6.1).
 *
 * Mars's call: hide the full multi-surface onboarding scroll until it's
 * actually ready post-launch. First-session day-one teaching happens
 * via projected walkthrough instead. The single warm panel preserves
 * the arrival moment without pretending the rest of the scroll is ready.
 *
 * Restoration path: when the full scroll is ready post-launch, swap
 * `/welcome/page.tsx` back to rendering `<WelcomeScroll>` instead of
 * `<MinimalWelcome>`. The full WelcomeScroll component (Reading orbit,
 * Group vertical-flow, Personal/Dashboard pending) stays intact in the
 * repo at `WelcomeScroll.tsx` — unreachable from the route until the
 * page.tsx swap.
 *
 * Flag behaviour: completeOnboarding still flips
 * profiles.has_completed_onboarding = true and redirects to /dashboard.
 * Returning users with the flag already true continue to bypass /welcome
 * via the loginUser routing (no change here).
 */

interface Props {
  displayName: string | null
  groupName: string
}

export default function MinimalWelcome({ displayName, groupName }: Props) {
  const heroName = displayName ?? 'reader'

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <div className="text-center max-w-xl">
        <div
          aria-hidden="true"
          className="inline-flex items-center justify-center mb-8 rounded text-2xl font-bold"
          style={{
            width: '4rem',
            height: '4rem',
            backgroundColor: 'var(--bg-nav)',
            color: 'var(--text-inverse)',
            fontFamily: "'Lora', Georgia, serif",
          }}
        >
          W
        </div>

        <p className="text-eyebrow mb-3">You&rsquo;re in</p>

        <h1
          className="text-display-lg mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Welcome to {groupName}, {heroName}.
        </h1>

        <p
          className="text-base sm:text-lg mb-10 max-w-md mx-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          A small group reading Capital. Slowly, carefully.
        </p>

        <form action={completeOnboarding}>
          <button
            type="submit"
            className="btn-primary inline-flex items-center justify-center px-8 py-3 text-base"
          >
            Take me to the dashboard &rarr;
          </button>
        </form>
      </div>
    </main>
  )
}
