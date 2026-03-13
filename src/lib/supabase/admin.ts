import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service role key.
 * Bypasses RLS — use only for server-side data fetching, never expose to the client.
 * TODO: RE-ENABLE AUTH — Once RLS policies are properly configured for all roles,
 * switch back to the cookie-based client for user-scoped queries.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
