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

  const { data: weeks, error: weeksError } = await supabase
    .from('reading_schedule')
    .select(`
      *,
      weekly_roles(
        id, role_type,
        user:profiles!user_id(id, display_name)
      ),
      discussion_prompts(
        id, prompt_text, sort_order
      )
    `)
    .order('week_number', { ascending: true })

  if (weeksError) {
    console.error('[CCP] Schedule page — query error:', weeksError)
  }

  // Determine current week (closest upcoming due_date)
  const now = new Date()
  const typedWeeks = (weeks || []) as unknown as ScheduleWeek[]
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
