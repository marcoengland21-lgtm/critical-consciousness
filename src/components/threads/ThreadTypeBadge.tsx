import type { ThreadType } from '@/types/database'

const typeConfig: Record<ThreadType, { label: string; bg: string; text: string }> = {
  discussion: { label: 'Discussion', bg: '#e8ddd0', text: '#5c4a3a' },
  reflection: { label: 'Reflection', bg: '#dde5d8', text: '#3a5c3a' },
  summary: { label: 'Summary', bg: '#d8dde5', text: '#3a4a5c' },
  passage_pick: { label: 'Passage Pick', bg: '#e5d8dd', text: '#5c3a4a' },
  connection: { label: 'Connection', bg: '#e5e0d0', text: '#5c5030' },
  general: { label: 'General', bg: '#e0ddd8', text: '#4a4a4a' },
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