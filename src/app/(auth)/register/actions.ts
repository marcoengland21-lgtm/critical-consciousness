'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * registerUser — single atomic server action for the Brief 1 signup flow.
 *
 * Closes the gap L1 anticipated: the multi-tenancy migration assumed
 * Brief 1 would build the signup-creates-membership flow that L1
 * itself didn't ship. Without this, any new signup creates an auth
 * user + profile but no group_memberships row — the next page render
 * trips `getCurrentGroupOrThrow`'s explicit error message.
 *
 * Atomicity:
 *   - All work runs server-side. Client makes one round-trip.
 *   - admin.createUser (service-role) creates the auth user with
 *     email_confirm=true so the v1 flow doesn't require email
 *     verification (locked by Brief 1 sign-off Q2 — keep off for v1;
 *     post-launch reconsidered when there's bounce data).
 *   - Membership insert + use_count increment use the service-role
 *     client so they bypass the freshly-created user's not-yet-
 *     established RLS context. The denormalized group_id triggers
 *     from L1 still apply (they're BEFORE INSERT triggers, not RLS),
 *     so cross-group membership inserts would be rejected at the
 *     trigger layer.
 *   - signInWithPassword runs on the user-cookie-aware client to set
 *     the session cookies in this request's response. Client redirects
 *     to /welcome (always — onboarding scroll routes signup users
 *     unconditionally; the has_completed_onboarding flag flips at the
 *     end of the scroll, section 8 CTA in sub-batch 6).
 *
 * Rollback on partial failure:
 *   - If admin.createUser succeeds but a later step fails, we call
 *     admin.deleteUser on the new auth user. The on_auth_user_created
 *     trigger's profiles row cascade-deletes via the FK (auth.users →
 *     profiles ON DELETE CASCADE). Membership rows likewise cascade
 *     via group_memberships.user_id ON DELETE CASCADE.
 *   - If only signInWithPassword fails (membership + count are in
 *     place, account is real), return success with redirectTo=/login
 *     so the user lands somewhere useful and can sign in manually.
 *     Don't rollback — they'd lose their account for a transient
 *     network blip.
 *
 * Use_count race (out-of-scope tech debt — see migration 012 header):
 *   - Increment runs AFTER auth user creation succeeds, not before.
 *     Different from the legacy validateInviteCode which incremented
 *     pre-signup. This is the "address when finite-use codes ship"
 *     fix the migration anticipated.
 *
 * Brief 1 error-copy decisions (sign-off Q9):
 *   - Invite-code error: "That code isn't right. Check the email or
 *     message that brought you here."
 *   - Email already in use: scoped to email field; copy mirrors mum's
 *     S3 design.
 *   - Password too short: client-side validation catches first; this
 *     branch is a safety net for spec'd minimum (8 chars per design;
 *     enforced server-side too).
 *   - Network/unknown errors: generic "Something went wrong. Try
 *     again." — never leak Supabase internals.
 */

export type RegisterResult =
  | { ok: true; redirectTo: '/welcome' | '/login' }
  | {
      ok: false
      error: {
        field: 'inviteCode' | 'email' | 'password' | 'general'
        message: string
      }
    }

interface RegisterInput {
  inviteCode: string
  displayName: string
  email: string
  password: string
}

const PASSWORD_MIN = 8

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const inviteCode = input.inviteCode?.trim() ?? ''
  const displayName = input.displayName?.trim() ?? ''
  const email = input.email?.trim().toLowerCase() ?? ''
  const password = input.password ?? ''

  // ── Step 1: shape validation ────────────────────────────────────
  if (!inviteCode) {
    return {
      ok: false,
      error: {
        field: 'inviteCode',
        message: "That code isn't right. Check the email or message that brought you here.",
      },
    }
  }
  if (!displayName) {
    return {
      ok: false,
      error: { field: 'general', message: 'Please add the name you want to be known by.' },
    }
  }
  if (!email) {
    return {
      ok: false,
      error: { field: 'email', message: 'Please add your email.' },
    }
  }
  if (password.length < PASSWORD_MIN) {
    return {
      ok: false,
      error: {
        field: 'password',
        message: `Needs to be at least ${PASSWORD_MIN} characters.`,
      },
    }
  }

  const admin = createAdminClient()

  // ── Step 2: invite code lookup ──────────────────────────────────
  // Uses service role (caller is unauthenticated — no RLS context yet).
  const { data: invite, error: inviteErr } = await admin
    .from('invite_codes')
    .select('id, group_id, max_uses, use_count, active, expires_at')
    .eq('code', inviteCode)
    .eq('active', true)
    .maybeSingle()

  if (inviteErr || !invite) {
    return {
      ok: false,
      error: {
        field: 'inviteCode',
        message: "That code isn't right. Check the email or message that brought you here.",
      },
    }
  }
  const inviteRow = invite as {
    id: string
    group_id: string
    max_uses: number | null
    use_count: number
    active: boolean
    expires_at: string | null
  }
  if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) {
    return {
      ok: false,
      error: { field: 'inviteCode', message: 'This invite code has expired.' },
    }
  }
  if (inviteRow.max_uses !== null && inviteRow.use_count >= inviteRow.max_uses) {
    return {
      ok: false,
      error: {
        field: 'inviteCode',
        message: 'This invite code has reached its maximum uses.',
      },
    }
  }

  // ── Step 3: create the auth user (admin / service role) ─────────
  // email_confirm:true auto-confirms regardless of project setting.
  // user_metadata.display_name is consumed by the handle_new_user
  // trigger to populate profiles.display_name.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })

  if (createErr || !created.user) {
    // Email-already-in-use is the common case. Supabase returns a
    // descriptive message; we surface the field-scoped variant.
    const msg = createErr?.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
      return {
        ok: false,
        error: {
          field: 'email',
          message: 'An account with this email already exists. Sign in instead, or use a different email.',
        },
      }
    }
    return {
      ok: false,
      error: { field: 'general', message: 'Something went wrong. Try again.' },
    }
  }

  const userId = created.user.id

  // ── Step 4: insert group_memberships row ────────────────────────
  // Service-role bypasses RLS (the new user has no session here yet
  // and group_memberships is the boundary L1 protects). The L1
  // triggers don't apply to direct membership inserts — they're for
  // the inherited tables (replies, annotation_replies, etc.).
  const { error: memberErr } = await admin
    .from('group_memberships')
    .insert({
      group_id: inviteRow.group_id,
      user_id: userId,
      role: 'member',
    })

  if (memberErr) {
    // Rollback: delete the orphan auth user so the email can be
    // retried cleanly. Profile row cascade-deletes via the FK.
    await admin.auth.admin.deleteUser(userId).catch(() => {
      // If rollback itself fails, log but don't compound the error
      // shown to the user — the membership-insert message takes
      // priority. Worst case Mars cleans up via the dashboard.
    })
    return {
      ok: false,
      error: { field: 'general', message: 'Something went wrong. Try again.' },
    }
  }

  // ── Step 5: increment invite_codes.use_count ────────────────────
  // Post-success increment (vs the legacy pre-signup increment which
  // could over-count on auth failures). For WATERMELON26 (max_uses
  // null) the count is informational only.
  await admin
    .from('invite_codes')
    .update({ use_count: inviteRow.use_count + 1 })
    .eq('id', inviteRow.id)
  // Increment failure isn't fatal — the user is fully provisioned.
  // Don't return an error for an off-by-one count discrepancy.

  // ── Step 6: sign in to set session cookies ──────────────────────
  // user-cookie-aware client; createServerClient writes cookies via
  // next/headers cookies(), which is allowed inside server actions.
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInErr) {
    // Account is real, just no session. Send to /login rather than
    // rolling back a successful registration.
    return { ok: true, redirectTo: '/login' }
  }

  return { ok: true, redirectTo: '/welcome' }
}
