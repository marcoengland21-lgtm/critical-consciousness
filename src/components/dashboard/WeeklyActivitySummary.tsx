interface WeeklyActivitySummaryProps {
  annotationCount: number
  threadCount: number
  glossaryCount: number
}

export default function WeeklyActivitySummary({ annotationCount, threadCount, glossaryCount }: WeeklyActivitySummaryProps) {
  const hasActivity = annotationCount > 0 || threadCount > 0 || glossaryCount > 0

  if (!hasActivity) {
    return (
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card-alt)' }}>
        <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
          The group's activity this week will appear here as people begin reading and annotating.
        </p>
      </div>
    )
  }

  const hasAnnotations = annotationCount > 0
  const hasThreads = threadCount > 0
  const hasGlossary = glossaryCount > 0

  let activityDescription = ''
  if (hasAnnotations && hasThreads && hasGlossary) {
    activityDescription = 'The group has been reading, discussing, and building shared vocabulary this week.'
  } else if (hasAnnotations && hasThreads) {
    activityDescription = 'The group has been reading and discussing together this week.'
  } else if (hasAnnotations && hasGlossary) {
    activityDescription = 'The group has been reading and building shared vocabulary this week.'
  } else if (hasThreads && hasGlossary) {
    activityDescription = 'Conversations are happening and the shared vocabulary is growing this week.'
  } else if (hasAnnotations) {
    activityDescription = 'People have been leaving notes in the text this week.'
  } else if (hasThreads) {
    activityDescription = 'Conversations are happening in the discussion threads.'
  } else if (hasGlossary) {
    activityDescription = 'The shared vocabulary is growing this week.'
  }

  return (
    <div className="rounded-xl border p-5 card-elevated" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card-alt)' }}>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        This Week&apos;s Activity
      </h3>
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {activityDescription}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>
          <span style={{ color: 'var(--accent-purple)' }}>&#x25C6;</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{annotationCount} {annotationCount === 1 ? 'annotation' : 'annotations'}</span>
        </span>
        <span>
          <span style={{ color: 'var(--accent-red)' }}>&#x25C6;</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{threadCount} {threadCount === 1 ? 'thread' : 'threads'}</span>
        </span>
        <span>
          <span style={{ color: 'var(--accent-green)' }}>&#x25C6;</span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>{glossaryCount} {glossaryCount === 1 ? 'term' : 'terms'}</span>
        </span>
      </div>
    </div>
  )
}
