interface Milestone {
  id: string
  week_number: number
  title: string
  description: string
  reflection_prompt: string | null
}

interface MilestoneCardProps {
  milestone: Milestone | null
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
  if (!milestone) {
    return null
  }

  return (
    <div
      className="rounded-xl border-2 p-6 overflow-hidden"
      style={{
        borderColor: 'var(--accent-purple)',
        backgroundColor: 'var(--bg-card-alt)',
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
        <div className="mb-2">
          <h3 className="font-bold text-lg" style={{ color: 'var(--accent-red)' }}>
            Milestone Reached
          </h3>
        </div>

        <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {milestone.title}
        </h4>

        {milestone.description && (
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {milestone.description}
          </p>
        )}

        {milestone.reflection_prompt && (
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--accent-purple)', backgroundColor: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--accent-purple)' }}>
              Reflection Prompt
            </p>
            <p className="text-sm" style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
              {milestone.reflection_prompt}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
