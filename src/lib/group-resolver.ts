/**
 * Group resolver — chunk 3b L1 multi-tenancy.
 *
 * Determines the user's current active group from membership data.
 * Replaces the `DEFAULT_GROUP_ID` constant pattern across the app.
 *
 * Resolution order (locked decisions from L1 sign-off):
 *   1. URL parameter override `?group=<slug|uuid>` — gated to
 *      `profiles.role === 'admin'`. Slug-primary if both match the
 *      same group. Mirrors the existing `getTestingOverride` pattern
 *      in `lib/testing-override.ts`. Lets admin (Mars) switch active
 *      group via URL for testing without changing the stored
 *      preference.
 *   2. `profiles.current_group_id` — the user's stored active group.
 *   3. Fallback: the oldest `group_memberships.joined_at` for this
 *      user. Written back to `profiles.current_group_id` so the
 *      next call short-circuits at step 2.
 *   4. Null when the user has no memberships (error state — should
 *      not happen for real users post-Brief 1, since signup inserts
 *      a membership).
 *
 * IMPORTANT: this resolver runs server-side. RLS at the database
 * layer is the structural guarantee that a query without a group
 * filter still can't leak across groups. The resolver gives the app
 * the right group_id to filter ON for the right UX, but it is not
 * the security boundary.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | undefined

export interface GroupContext {
  groupId: string
  slug: string
  name: string
  /** The user's role in this group. */
  role: 'host' | 'member'
}

interface ResolveOptions {
  /** Server-side searchParams from the page (Next.js App Router). */
  searchParams?: SearchParamsLike
  /** The pre-fetched profile (saves a query when the caller already
      has it). If omitted, the resolver fetches it. */
  profile?: { role: 'admin' | 'member'; current_group_id: string | null } | null
}

/**
 * Resolve the current active group for an authenticated user.
 * Returns null if the user has no memberships.
 *
 * The supabase client must be authenticated (server-side, with the
 * user's session). The function performs at most three queries:
 * profile (if not provided), the URL-override lookup (if applicable),
 * and a memberships fallback (if needed).
 */
export async function getCurrentGroup(
  supabase: SupabaseClient,
  userId: string,
  opts: ResolveOptions = {}
): Promise<GroupContext | null> {
  const { searchParams, profile: providedProfile } = opts

  // Step 0: profile fetch (or use provided).
  let profile = providedProfile
  if (profile === undefined) {
    const { data } = await supabase
      .from('profiles')
      .select('role, current_group_id')
      .eq('id', userId)
      .single()
    profile = (data as { role: 'admin' | 'member'; current_group_id: string | null } | null) ?? null
  }
  if (!profile) return null

  // Step 1: URL override (admin-gated).
  const overrideKey = firstParam(searchParams, 'group')
  if (overrideKey && profile.role === 'admin') {
    const ctx = await fetchGroupByKeyAndMembership(supabase, overrideKey, userId)
    if (ctx) return ctx
    // Override key didn't resolve to a group the admin is a member of;
    // fall through to step 2 silently rather than 404. (Admin can be
    // a member of all groups, but we still scope strictly.)
  }

  // Step 2: profiles.current_group_id (verify membership before trusting).
  if (profile.current_group_id) {
    const ctx = await fetchGroupByIdAndMembership(supabase, profile.current_group_id, userId)
    if (ctx) return ctx
    // Stored value is stale (user removed from that group). Fall through.
  }

  // Step 3: oldest membership fallback.
  const { data: oldestMembership } = await supabase
    .from('group_memberships')
    .select('group_id, role, group:groups!group_id(id, name, slug)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!oldestMembership) return null
  const m = oldestMembership as unknown as {
    group_id: string
    role: 'host' | 'member'
    group: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[]
  }
  const g = Array.isArray(m.group) ? m.group[0] : m.group
  if (!g) return null

  // Write back to profile so future resolves short-circuit at step 2.
  await supabase
    .from('profiles')
    .update({ current_group_id: m.group_id })
    .eq('id', userId)

  return {
    groupId: g.id,
    slug: g.slug,
    name: g.name,
    role: m.role,
  }
}

/**
 * Convenience wrapper: throws if the user has no memberships. Use in
 * routes that absolutely require a group context (most server pages
 * post-L1). Server pages that need to render something for the
 * no-memberships edge case should call `getCurrentGroup` directly.
 */
export async function getCurrentGroupOrThrow(
  supabase: SupabaseClient,
  userId: string,
  opts: ResolveOptions = {}
): Promise<GroupContext> {
  const ctx = await getCurrentGroup(supabase, userId, opts)
  if (!ctx) {
    throw new Error(
      `[CCP] getCurrentGroupOrThrow: user ${userId} has no group memberships. ` +
        `Brief 1's signup flow should insert a membership at registration; ` +
        `this error means either an old account predates that flow OR L1 ` +
        `migrations were run without the admin host-membership seed.`
    )
  }
  return ctx
}

// ── Internal helpers ──────────────────────────────────────────────────

function firstParam(
  sp: SearchParamsLike,
  key: string
): string | undefined {
  if (!sp) return undefined
  const v = sp[key]
  if (Array.isArray(v)) return v[0]
  return v
}

/**
 * Resolve a `?group=<key>` value to a GroupContext, where key is
 * either a slug or a UUID. Slug-primary if both match (slugs are
 * stable + readable; UUIDs are debugging-only). Verifies the user is
 * a member of the resolved group; returns null otherwise.
 */
async function fetchGroupByKeyAndMembership(
  supabase: SupabaseClient,
  key: string,
  userId: string
): Promise<GroupContext | null> {
  // Try slug first.
  const { data: bySlug } = await supabase
    .from('groups')
    .select('id, name, slug')
    .eq('slug', key)
    .maybeSingle()
  if (bySlug) {
    const id = (bySlug as { id: string }).id
    const role = await fetchMembershipRole(supabase, id, userId)
    if (role) {
      return {
        groupId: id,
        slug: (bySlug as { slug: string }).slug,
        name: (bySlug as { name: string }).name,
        role,
      }
    }
  }
  // Fall back to UUID.
  if (isUuid(key)) {
    return fetchGroupByIdAndMembership(supabase, key, userId)
  }
  return null
}

async function fetchGroupByIdAndMembership(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
): Promise<GroupContext | null> {
  const { data: g } = await supabase
    .from('groups')
    .select('id, name, slug')
    .eq('id', groupId)
    .maybeSingle()
  if (!g) return null
  const role = await fetchMembershipRole(supabase, groupId, userId)
  if (!role) return null
  return {
    groupId: (g as { id: string }).id,
    slug: (g as { slug: string }).slug,
    name: (g as { name: string }).name,
    role,
  }
}

async function fetchMembershipRole(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
): Promise<'host' | 'member' | null> {
  const { data } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  return (data as { role: 'host' | 'member' }).role
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(s: string): boolean {
  return UUID_RE.test(s)
}
