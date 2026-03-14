import type { WeeklyRoleType } from '@/types/database'

const roleConfig: Record<WeeklyRoleType, { label: string; color: string }> = {
  summarizer: { label: 'Summarizer', color: 'var(--text-badge)' },
  discussion_starter: { label: 'Discussion Starter', color: 'var(--role-discussion)' },
  connector: { label: 'Connector', color: 'var(--role-connector)' },
  passage_picker: { label: 'Passage Picker', color: 'var(--role-passage)' },
}

export default function RoleBadge({ type }: { type: WeeklyRoleType }) {
  const config = roleConfig[type]
  if (!config) return null

  return (
    <span className="text-xs font-medium" style={{ color: config.color }}>
      {config.label}
    </span>
  )
}
