export default function GlossaryLoading() {
  return (
    <div className="skeleton-shimmer">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-40 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: term list */}
        <div className="lg:w-72 shrink-0 space-y-3">
          <div className="h-10 w-full rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-10 w-full rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            ))}
          </div>
        </div>
        {/* Right: definition panel */}
        <div className="flex-1 rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
          <div className="h-6 w-48 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-5/6 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        </div>
      </div>
    </div>
  )
}
