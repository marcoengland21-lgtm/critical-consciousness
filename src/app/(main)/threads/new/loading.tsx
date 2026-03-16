export default function NewThreadLoading() {
  return (
    <div className="skeleton-shimmer max-w-2xl">
      <div className="mb-8">
        <div className="h-8 w-48 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
      </div>

      {/* Type selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
            <div className="h-5 w-5 rounded mb-2" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            <div className="h-4 w-20 rounded mb-1" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            <div className="h-3 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          </div>
        ))}
      </div>

      {/* Title */}
      <div className="mb-4">
        <div className="h-4 w-12 rounded mb-2" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        <div className="h-10 w-full rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
      </div>

      {/* Body */}
      <div className="mb-6">
        <div className="h-4 w-20 rounded mb-2" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        <div className="h-48 w-full rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
      </div>
    </div>
  )
}
