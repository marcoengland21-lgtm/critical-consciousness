import { createAdminClient } from '@/lib/supabase/admin'

interface WeeklyActivitySummaryProps {
  weekId: string
}

export default async function WeeklyActivitySummary({ weekId }: WeeklyActivitySummaryProps) {
  const supabase = createAdminClient()

  // Get week data for date context
  const { data: weekData } = await supabase
    .from('reading_schedule')
    .select('week_number, title')
    .eq('id', weekId)
    .single()

  if (!weekData) return null

  // Calculate this week's date range (Monday to Sunday of the current week)
  const now = new Date()
  const currentDay = now.getDay()
  const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
  const weekStart = new Date(now.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Query annotations created this week
  const { count: annotationCount } = await supabase
    .from('annotations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString())

  // Query threads created this week
  const { count: threadCount } = await supabase
    .from('threads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString())

  // Query glossary entries created this week
  const { count: glossaryCount } = await supabase
    .from('glossary_entries')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString())

  const hasActivity = (annotationCount || 0) > 0 || (threadCount || 0) > 0 || (glossaryCount || 0) > 0

  if (!hasActivity) {
    return (
      <div className="rounded-lg border p-5" style={{ borderColor: '#dee2e6', backgroundColor: '#f8f9fa' }}>
        <p className="text-sm italic" style={{ color: 'var(--color-warm-gray)' }}>
          The group's activity this week will appear here as people begin reading and annotating.
        </p>
      </div>
    )
  }

  // Build qualitative activity description based on activity types present
  const hasAnnotations = (annotationCount || 0) > 0
  const hasThreads = (threadCount || 0) > 0
  const hasGlossary = (glossaryCount || 0) > 0

  let activityDescription = ''
  if (hasAnnotations && hasThreads && hasGlossary) {
    activityDescription = 'The group has been reading, discussing, and building shared vocabulary this week.'
  } else if (hasAnnotations && hasThreads) {
    activityDescription = 'The group has been reading and discussing together this week.'
  } else if (hasAnnotations && hasGlossary) {
    activityDescription = 'The group has been reading and building shared vocabulary this week.'
  } else if (hasThreads && hasGlossary) {
    activityDescription = 'Conversations are happening and the shared vocabulary is growing this week.'
  } else if (hasAnnotations) {
    activityDescription = 'People have been leaving notes in the text this week.'
  } else if (hasThreads) {
    activityDescription = 'Conversations are happening in the discussion threads.'
  } else if (hasGlossary) {
    activityDescription = 'The shared vocabulary is growing this week.'
  }

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: '#dee2e6', backgroundColor: '#f8f9fa' }}>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-dark-brown)' }}>
        This Week's Activity
      </h3>
      <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
        <span className="font-medium" style={{ color: 'var(--color-dark-brown)' }}>
          {activityDescription}
        </span>
      </p>
    </div>
  )
}
