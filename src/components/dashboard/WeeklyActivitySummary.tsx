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
      <div className="rounded-lg border p-5" style={{ borderColor: '#e5e1d8', backgroundColor: '#faf8f4' }}>
        <p className="text-sm italic" style={{ color: 'var(--color-warm-gray)' }}>
          The group hasn't added any annotations, discussions, or glossary terms yet this week. Be the first to contribute!
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: '#e5e1d8', backgroundColor: '#faf8f4' }}>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-dark-brown)' }}>
        This Week's Activity
      </h3>
      <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
        The group has been active:{' '}
        <span className="font-medium" style={{ color: 'var(--color-dark-brown)' }}>
          {annotationCount ? `${annotationCount} ${annotationCount === 1 ? 'annotation' : 'annotations'}` : null}
          {annotationCount && threadCount ? ', ' : null}
          {threadCount ? `${threadCount} ${threadCount === 1 ? 'discussion' : 'discussions'}` : null}
          {(annotationCount || threadCount) && glossaryCount ? ', ' : null}
          {glossaryCount ? `${glossaryCount} glossary ${glossaryCount === 1 ? 'term' : 'terms'}` : null}
        </span>
      </p>
    </div>
  )
}
