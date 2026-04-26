export default function JournalLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-32 mb-2 rounded skeleton-shimmer" style={{ backgroundColor: 'var(--bg-soft)' }} />
      <div className="h-10 w-48 mb-8 rounded skeleton-shimmer" style={{ backgroundColor: 'var(--bg-soft)' }} />
      <div className="h-10 w-full mb-6 rounded skeleton-shimmer" style={{ backgroundColor: 'var(--bg-soft)' }} />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full rounded skeleton-shimmer" style={{ backgroundColor: 'var(--bg-soft)' }} />
        ))}
      </div>
    </div>
  )
}
