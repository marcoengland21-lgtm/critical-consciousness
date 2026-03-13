import type { WeeklyRoleType } from '@/types/database'

const roleConfig: Record<WeeklyRoleType, { label: string; icon: string; color: string }> = {
  summarizer: { label: 'Summarizer', icon: '📝', color: 'var(--text-badge)' },
  discussion_starter: { label: 'Discussion Starter', icon: '💬', color: 'var(--role-discussion)' },
  connector: { label: 'Connector', icon: '🔗', color: 'var(--role-connector)' },
  passage_picker: { label: 'Passage Picker', icon: '📖', color: 'var(--role-passage)' },
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
