import type { ThreadType } from '@/types/database'

export const threadTypeConfig: Record<ThreadType, {
  label: string
  color: string
  description: string
}> = {
  discussion: {
    label: 'Discussion',
    color: 'var(--role-discussion)',
    description: 'Open-ended discussion on a topic',
  },
  reflection: {
    label: 'Reflection',
    color: 'var(--role-summarizer)',
    description: 'Personal reflection on the reading',
  },
  summary: {
    label: 'Summary',
    color: 'var(--role-connector)',
    description: 'Summary of key points from the reading',
  },
  passage_pick: {
    label: 'Passage Pick',
    color: 'var(--role-passage)',
    description: 'Highlight and discuss a specific passage',
  },
  connection: {
    label: 'Connection',
    color: 'var(--accent-purple)',
    description: 'Connect the reading to current events or other texts',
  },
  general: {
    label: 'General',
    color: 'var(--text-secondary)',
    description: 'General conversation or announcements',
  },
}

export default function ThreadTypeBadge({ type }: { type: ThreadType }) {
  const config = threadTypeConfig[type] || threadTypeConfig.general

  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full"
      style={{
        backgroundColor: 'var(--bg-badge)',
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}
