'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * loginUser — sign in + post-auth route resolution.
 *
 * Brief 1 (sub-batch 5) adds the has_completed_onboarding routing
 * branch on top of the existing email-password sign-in. Users who
 * haven't seen the onboarding scroll yet land on /welcome; users who
 * have, land on /dashboard.
 *
 * Implementation:
 *   - signInWithPassword on the user-cookie-aware client to set
 *     session cookies for the response.
 *   - Profile lookup uses the service-role client (the user's session
 *     is set in the cookie at this point but the cookies-on-response
 *     hand-off doesn't make the new session readable by the same
 *     server-action invocation through the user-cookie client).
 *     Service role bypasses RLS — fine for reading the user's own
 *     onboarding flag by their auth-id.
 *   - Defensive default: missing profile or null flag → /welcome.
 *     A user without a profile row shouldn't exist (handle_new_user
 *     trigger guarantees it), and a null flag shouldn't exist post-
 *     migration 011 (NOT NULL constraint), but if either ever
 *     surfaces, /welcome is the safe destination — at worst a user
 *     sees the onboarding scroll once more.
 *
 * Generic error copy on bad credentials — never disambiguates email
 * vs password (security baseline, matches mum's I2 design).
 */

export type LoginResult =
  | { ok: true; redirectTo: '/dashboard' | '/welcome' }
  | { ok: false; error: string }

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const trimmedEmail = email?.trim().toLowerCase() ?? ''
  const trimmedPassword = password ?? ''

  if (!trimmedEmail || !trimmedPassword) {
    return { ok: false, error: "That email and password don't match. Try again, or reset your password." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password: trimmedPassword,
  })

  if (error || !data.user) {
    return {
      ok: false,
      error: "That email and password don't match. Try again, or reset your password.",
    }
  }

  // Look up onboarding flag via service role — the just-set session
  // cookies aren't necessarily readable by the user-cookie client
  // within the same server-action invocation.
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('has_completed_onboarding')
    .eq('id', data.user.id)
    .maybeSingle()

  const completed = (profile as { has_completed_onboarding: boolean | null } | null)
    ?.has_completed_onboarding

  // Defensive default: any not-explicitly-true value routes to
  // /welcome. Worst case the user sees onboarding once more.
  return {
    ok: true,
    redirectTo: completed === true ? '/dashboard' : '/welcome',
  }
}
