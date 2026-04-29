'use server'

import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'

/**
 * completeOnboarding — flip the user's has_completed_onboarding flag
 * to true and redirect to the dashboard.
 *
 * Called from section 8's CTA in the welcome scroll. After this runs,
 * subsequent sign-ins for this user route to /dashboard rather than
 * back to /welcome.
 *
 * Uses the cookie-aware client + an explicit user_id filter — safer
 * than service role here because the action is user-initiated and
 * we want it to fail loudly if somehow run unauthenticated. If RLS
 * blocks the update (it shouldn't — users can update their own
 * profile row), the failure surfaces immediately rather than
 * silently no-op'ing.
 */
export async function completeOnboarding(): Promise<void> {
  const user = await getSessionUser()
  if (!user) {
    // No session → bounce to login. The scroll route should never
    // reach this branch in practice (middleware gates /welcome),
    // but defensive.
    redirect('/login')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ has_completed_onboarding: true })
    .eq('id', user.id)

  if (error) {
    // Failure here is rare (RLS-blocked write or DB hiccup). We
    // still send the user to the dashboard — they can re-trigger
    // by signing out and back in if the flag stays false. Not worth
    // blocking the user-visible flow on a write that has no other
    // side effects.
    console.error('[completeOnboarding] update failed:', error.message)
  }

  redirect('/dashboard')
}
