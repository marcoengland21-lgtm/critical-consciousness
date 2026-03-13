import type { ThreadType } from '@/types/database'

const typeConfig: Record<ThreadType, { label: string; bg: string; text: string }> = {
  discussion: { label: 'Discussion', bg: 'var(--bg-badge)', text: 'var(--role-summarizer)' },
  reflection: { label: 'Reflection', bg: 'var(--bg-badge)', text: 'var(--role-discussion)' },
  summary: { label: 'Summary', bg: 'var(--bg-badge)', text: 'var(--role-connector)' },
  passage_pick: { label: 'Passage Pick', bg: 'var(--bg-badge)', text: 'var(--role-passage)' },
  connection: { label: 'Connection', bg: 'var(--bg-badge)', text: 'var(--text-badge)' },
  general: { label: 'General', bg: 'var(--bg-badge)', text: 'var(--text-badge)' },
}

export default function ThreadTypeBadge({ type }: { type: ThreadType }) {
  const config = typeConfig[type] || typeConfig.general

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  )
}