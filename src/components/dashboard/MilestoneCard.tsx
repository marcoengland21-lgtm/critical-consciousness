import { createAdminClient } from '@/lib/supabase/admin'

interface MilestoneCardProps {
  weekId: string
  weekNumber: number
}

interface Milestone {
  id: string
  week_number: number
  title: string
  description: string
  reflection_prompt: string | null
}

export default async function MilestoneCard({ weekId, weekNumber }: MilestoneCardProps) {
  const supabase = createAdminClient()

  // Check if there's a milestone for this week
  const { data: milestone } = await supabase
    .from('reading_milestones')
    .select('id, week_number, title, description, reflection_prompt')
    .eq('week_number', weekNumber)
    .single()

  if (!milestone) {
    return null
  }

  return (
    <div
      className="rounded-lg border-2 p-6 overflow-hidden"
      style={{
        borderColor: 'var(--color-muted-gold)',
        backgroundColor: '#faf8f4',
        position: 'relative',
      }}
    >
      {/* Celebration decorative element */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          opacity: 0.1,
          fontSize: '4rem',
          lineHeight: '1',
        }}
      >
        ✦
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎓</span>
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-deep-red)' }}>
            Milestone Reached
          </h3>
        </div>

        <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-dark-brown)' }}>
          {milestone.title}
        </h4>

        {milestone.description && (
          <p className="text-sm mb-4" style={{ color: 'var(--color-warm-gray)' }}>
            {milestone.description}
          </p>
        )}

        {milestone.reflection_prompt && (
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-muted-gold)', backgroundColor: 'white' }}>
            <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--color-muted-gold)' }}>
              Reflection Prompt
            </p>
            <p className="text-sm" style={{ color: 'var(--color-dark-brown)', fontStyle: 'italic' }}>
              {milestone.reflection_prompt}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
