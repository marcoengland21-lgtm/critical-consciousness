'use server'

import { createClient } from '@supabase/supabase-js'

/**
 * Validates an invite code and increments its use count.
 * Uses the service role key to bypass RLS (since the user isn't authenticated yet).
 */
export async function validateInviteCode(code: string): Promise<{ valid: boolean; error?: string }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Look up the invite code
  const { data: invite, error } = await supabaseAdmin
    .from('invite_codes')
    .select('*')
    .eq('code', code.trim())
    .eq('active', true)
    .single()

  if (error || !invite) {
    return { valid: false, error: 'Invalid invite code' }
  }

  // Check if expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false, error: 'This invite code has expired' }
  }

  // Check if max uses reached
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return { valid: false, error: 'This invite code has reached its maximum uses' }
  }

  // Increment use count
  await supabaseAdmin
    .from('invite_codes')
    .update({ use_count: invite.use_count + 1 })
    .eq('id', invite.id)

  return { valid: true }
}
