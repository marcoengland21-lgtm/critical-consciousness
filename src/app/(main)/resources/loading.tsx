export default function ResourcesLoading() {
  return (
    <div className="skeleton-shimmer">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-40 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        <div className="h-9 w-28 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
      </div>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 rounded-full" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
            <div className="h-4 w-16 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            <div className="h-5 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            <div className="h-3 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
