import type { ThreadType } from '@/types/database'
import {
  MessageCircle,
  PenLine,
  ListChecks,
  BookOpen,
  Link2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

export const threadTypeConfig: Record<ThreadType, {
  label: string
  /** Lucide icon component (chrome audit: emoji → lucide). Render at
   *  16px, strokeWidth 2 for badge-grid contexts. */
  icon: LucideIcon
  color: string
  bgColor: string
  description: string
}> = {
  discussion: {
    label: 'Discussion',
    icon: MessageCircle,
    color: 'var(--role-discussion)',
    bgColor: 'var(--badge-bg-discussion)',
    description: 'Open-ended discussion on a topic',
  },
  reflection: {
    label: 'Reflection',
    icon: PenLine,
    color: 'var(--role-summarizer)',
    bgColor: 'var(--badge-bg-reflection)',
    description: 'Personal reflection on the reading',
  },
  summary: {
    label: 'Summary',
    icon: ListChecks,
    color: 'var(--role-connector)',
    bgColor: 'var(--badge-bg-summary)',
    description: 'Summary of key points from the reading',
  },
  passage_pick: {
    label: 'Passage Pick',
    icon: BookOpen,
    color: 'var(--role-passage)',
    bgColor: 'var(--badge-bg-passage)',
    description: 'Highlight and discuss a specific passage',
  },
  connection: {
    label: 'Connection',
    icon: Link2,
    color: 'var(--accent-purple)',
    bgColor: 'var(--badge-bg-connection)',
    description: 'Connect the reading to current events or other texts',
  },
  general: {
    label: 'General',
    icon: MessageSquare,
    color: 'var(--text-secondary)',
    bgColor: 'var(--bg-badge)',
    description: 'General conversation or announcements',
  },
}

export default function ThreadTypeBadge({ type }: { type: ThreadType }) {
  const config = threadTypeConfig[type] || threadTypeConfig.general

  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full leading-none"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}
