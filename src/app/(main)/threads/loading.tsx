export default function ThreadsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="h-9 w-56 rounded" style={{ backgroundColor: 'var(--bg-soft)' }} />
        <div className="h-9 w-28 rounded-lg" style={{ backgroundColor: 'var(--bg-soft)' }} />
      </div>

      {/* Filter pills skeleton */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 rounded-full" style={{ width: `${60 + i * 12}px`, backgroundColor: 'var(--bg-soft)' }} />
        ))}
      </div>

      {/* Thread cards skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-lg border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-20 rounded-full" style={{ backgroundColor: 'var(--bg-soft)' }} />
            </div>
            <div className="h-6 w-3/4 rounded mb-2" style={{ backgroundColor: 'var(--bg-soft)' }} />
            <div className="h-4 w-full rounded mb-1" style={{ backgroundColor: 'var(--bg-soft)', opacity: 0.5 }} />
            <div className="h-4 w-2/3 rounded mb-3" style={{ backgroundColor: 'var(--bg-soft)', opacity: 0.3 }} />
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: 'var(--bg-soft)' }} />
              <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--bg-soft)', opacity: 0.5 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
