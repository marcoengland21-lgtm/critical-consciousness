import { createClient, getSessionUser } from '@/lib/supabase/server'
import ScheduleClient from '@/components/schedule/ScheduleClient'

// Query-specific join shapes for Supabase responses
interface WeeklyRoleRow {
  id: string
  role_type: string
  user: { id: string; display_name: string } | null
}

interface DiscussionPrompt {
  id: string
  prompt_text: string
  sort_order: number
}

interface RawWeeklyRole {
  id: string
  week_id: string
  role_type: string
  user_id: string
}

interface ScheduleWeek {
  id: string
  week_number: number
  title: string
  due_date: string
  session_date: string | null
  session_location: string | null
  zoom_link: string | null
  chapter_ref: string | null
  page_start: number | null
  page_end: number | null
  description: string | null
  weekly_roles: WeeklyRoleRow[] | null
  discussion_prompts: DiscussionPrompt[] | null
}

export const metadata = {
  title: 'Reading Schedule | Capital Study Group',
}

export default async function SchedulePage() {
  const user = await getSessionUser()
  const supabase = await createClient()

  // Flat parallel queries — avoids nested join RLS failures.
  // Previous approach nested weekly_roles(user:profiles) + discussion_prompts inside
  // reading_schedule, which fails silently if RLS blocks any joined table.
  const [weeksResult, rolesResult, promptsResult, profilesResult] = await Promise.all([
    // Weeks — flat, no joins
    supabase
      .from('reading_schedule')
      .select('*')
      .order('week_number', { ascending: true }),
    // Roles — flat
    supabase
      .from('weekly_roles')
      .select('id, week_id, role_type, user_id'),
    // Prompts — flat
    supabase
      .from('discussion_prompts')
      .select('id, week_id, prompt_text, sort_order'),
    // Profiles for role user names
    supabase
      .from('profiles')
      .select('id, display_name'),
  ])

  if (weeksResult.error) {
    console.error('[CCP] Schedule page — reading_schedule query error:', weeksResult.error)
  }
  if (rolesResult.error) {
    console.error('[CCP] Schedule page — weekly_roles query error:', rolesResult.error)
  }
  if (promptsResult.error) {
    console.error('[CCP] Schedule page — discussion_prompts query error:', promptsResult.error)
  }
  if (profilesResult.error) {
    console.error('[CCP] Schedule page — profiles query error:', profilesResult.error)
  }

  // Build profile lookup
  const profileMap = new Map<string, { id: string; display_name: string }>()
  if (profilesResult.data) {
    for (const p of profilesResult.data) {
      profileMap.set(p.id, { id: p.id, display_name: p.display_name })
    }
  }

  // Build roles by week_id
  const rolesByWeek = new Map<string, WeeklyRoleRow[]>()
  if (rolesResult.data) {
    for (const r of rolesResult.data as RawWeeklyRole[]) {
      const weekRoles = rolesByWeek.get(r.week_id) || []
      weekRoles.push({
        id: r.id,
        role_type: r.role_type,
        user: profileMap.get(r.user_id) || null,
      })
      rolesByWeek.set(r.week_id, weekRoles)
    }
  }

  // Build prompts by week_id
  const promptsByWeek = new Map<string, DiscussionPrompt[]>()
  if (promptsResult.data) {
    for (const p of promptsResult.data as (DiscussionPrompt & { week_id: string })[]) {
      const weekPrompts = promptsByWeek.get(p.week_id) || []
      weekPrompts.push({ id: p.id, prompt_text: p.prompt_text, sort_order: p.sort_order })
      promptsByWeek.set(p.week_id, weekPrompts)
    }
  }

  // Merge into ScheduleWeek shape
  const rawWeeks = (weeksResult.data || []) as { id: string; week_number: number; title: string; due_date: string; session_date: string | null; session_location: string | null; zoom_link: string | null; chapter_ref: string | null; page_start: number | null; page_end: number | null; description: string | null }[]

  const typedWeeks: ScheduleWeek[] = rawWeeks.map((w) => ({
    ...w,
    weekly_roles: rolesByWeek.get(w.id) || null,
    discussion_prompts: promptsByWeek.get(w.id) || null,
  }))

  // Determine current week (closest upcoming due_date)
  const now = new Date()
  const currentWeek = typedWeeks.find((w) => new Date(w.due_date) >= now) || typedWeeks[typedWeeks.length - 1]

  if (typedWeeks.length === 0) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--accent-red)' }}>
          Reading Schedule
        </h1>
        <div className="text-center py-16">
          <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            The schedule is on its way
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The reading schedule will appear here once your facilitator sets it up. In the meantime, explore the platform.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>
        Reading Schedule
      </h1>

      <ScheduleClient
        weeks={typedWeeks}
        currentWeekId={currentWeek?.id || null}
        userId={user?.id || null}
      />
    </div>
  )
}
