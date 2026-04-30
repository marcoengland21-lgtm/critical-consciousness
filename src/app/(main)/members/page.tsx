import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import TimeAgo from '@/components/ui/TimeAgo'

/**
 * Members page — simple list of who's in the active group.
 *
 * Mars's spec (post-Brief 1, pre-launch): "just a simple page like profile
 * with a list of members thats all just to see whos joined." No
 * directory, no DM, no profile cards. One row per member: avatar
 * initial, display name, host badge if host, joined-when.
 *
 * Group-scoped to the resolver's active group. RLS on
 * `group_memberships` (is_group_member) enforces that a member only
 * sees rows from groups they belong to. `profiles_select` is open-read
 * so the join to display_name works without a service-role query.
 *
 * No nav-config entry yet — placement is Mars's call (sidebar between
 * Resources and the avatar block? linked from /schedule? linked from
 * /dashboard?). Page is reachable directly at /members in the meantime.
 */
export const metadata = {
  title: 'Members | Capital Study Group',
}

interface MembershipRow {
  user_id: string
  role: 'host' | 'member'
  joined_at: string
  profile: { display_name: string | null } | { display_name: string | null }[] | null
}

export default async function MembersPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id)
  if (!group) redirect('/login')

  const { data: rows } = await supabase
    .from('group_memberships')
    .select(`
      user_id,
      role,
      joined_at,
      profile:profiles!user_id(display_name)
    `)
    .eq('group_id', group.groupId)
    .order('joined_at', { ascending: true })

  const members = ((rows as MembershipRow[] | null) || []).map((r) => {
    const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile
    return {
      userId: r.user_id,
      role: r.role,
      joinedAt: r.joined_at,
      displayName: profile?.display_name?.trim() || 'Member',
      isYou: r.user_id === user.id,
    }
  })

  return (
    <div className="stagger-children">
      {/* Header — eyebrow + Lora italic display title */}
      <div className="mb-8">
        <p className="text-eyebrow mb-2">Members — {group.name}</p>
        <h1
          className="text-display-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          {members.length === 1
            ? '1 person reading'
            : `${members.length} people reading`}
        </h1>
      </div>

      {/* Member list — single column, hairline dividers per the
          chrome-audit pattern (no nested cards). */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        {members.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">No members yet.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {members.map((m) => {
              const initial = m.displayName.charAt(0).toUpperCase()
              return (
                <li
                  key={m.userId}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  {/* Avatar — first letter, gradient fill matching profile aesthetic */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-red))',
                      color: 'var(--text-inverse)',
                    }}
                    aria-hidden="true"
                  >
                    {initial}
                  </div>

                  {/* Name + role + you-marker */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {m.displayName}
                      </span>
                      {m.isYou && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full leading-none"
                          style={{
                            backgroundColor: 'var(--bg-badge)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          you
                        </span>
                      )}
                      {/* Host role badge intentionally hidden for now per Mars
                          (Rule 21 — dialogue between equals; visible host
                          badge in the member list pulls toward hierarchy
                          framing). Membership.role is still fetched + tracked
                          in state in case it's needed later (host-specific
                          actions, etc.) — only the visual is dropped. */}
                    </div>
                  </div>

                  {/* Joined-when — quiet right-aligned */}
                  <div
                    className="text-xs shrink-0"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Joined <TimeAgo date={m.joinedAt} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
