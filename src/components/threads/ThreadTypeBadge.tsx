import type { ThreadType } from '@/types/database'

export const threadTypeConfig: Record<ThreadType, {
  label: string
  icon: string
  color: string
  bgColor: string
  description: string
}> = {
  discussion: {
    label: 'Discussion',
    icon: '\u{1F4AC}',
    color: 'var(--role-discussion)',
    bgColor: 'var(--badge-bg-discussion)',
    description: 'Open-ended discussion on a topic',
  },
  reflection: {
    label: 'Reflection',
    icon: '\u{1FA9E}',
    color: 'var(--role-summarizer)',
    bgColor: 'var(--badge-bg-reflection)',
    description: 'Personal reflection on the reading',
  },
  summary: {
    label: 'Summary',
    icon: '\u{1F4CB}',
    color: 'var(--role-connector)',
    bgColor: 'var(--badge-bg-summary)',
    description: 'Summary of key points from the reading',
  },
  passage_pick: {
    label: 'Passage Pick',
    icon: '\u{1F4D6}',
    color: 'var(--role-passage)',
    bgColor: 'var(--badge-bg-passage)',
    description: 'Highlight and discuss a specific passage',
  },
  connection: {
    label: 'Connection',
    icon: '\u{1F517}',
    color: 'var(--accent-purple)',
    bgColor: 'var(--badge-bg-connection)',
    description: 'Connect the reading to current events or other texts',
  },
  general: {
    label: 'General',
    icon: '\u{1F4AD}',
    color: 'var(--text-secondary)',
    bgColor: 'var(--bg-badge)',
    description: 'General conversation or announcements',
  },
}

export default function ThreadTypeBadge({ type }: { type: ThreadType }) {
  const config = threadTypeConfig[type] || threadTypeConfig.general

  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}
