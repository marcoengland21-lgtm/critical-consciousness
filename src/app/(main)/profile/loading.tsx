export default function ProfileLoading() {
  return (
    <div className="skeleton-shimmer">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-32 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
            <div className="h-8 w-12 mx-auto rounded mb-2" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            <div className="h-3 w-20 mx-auto rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <div className="h-5 w-40 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
            <div className="p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)' }}>
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-16 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
