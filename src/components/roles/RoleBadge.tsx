import type { WeeklyRoleType } from '@/types/database'

const roleConfig: Record<WeeklyRoleType, { label: string; icon: string; color: string }> = {
  summarizer: { label: 'Summarizer', icon: '📝', color: '#5c4a3a' },
  discussion_starter: { label: 'Discussion Starter', icon: '💬', color: '#3a5c3a' },
  connector: { label: 'Connector', icon: '🔗', color: '#3a4a5c' },
  passage_picker: { label: 'Passage Picker', icon: '📖', color: '#5c3a4a' },
}

export default function RoleBadge({ type }: { type: WeeklyRoleType }) {
  const config = roleConfig[type]
  if (!config) return null

  return (
    <span className="text-xs font-medium" style={{ color: config.color }}>
      {config.icon} {config.label}
    </span>
  )
}
