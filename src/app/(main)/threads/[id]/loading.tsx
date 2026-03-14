export default function ThreadLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-32 rounded mb-8" style={{ backgroundColor: 'var(--bg-card-alt)' }} />

      {/* Thread header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-20 rounded-full" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        </div>
        <div className="h-8 w-3/4 rounded mb-5" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        <div className="flex items-center gap-3 mb-8">
          <div className="h-4 w-24 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        </div>
        {/* Body skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-5/6 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-4/5 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          <div className="h-4 w-2/3 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        </div>
      </div>

      <hr className="mb-8" style={{ borderColor: 'var(--border-default)' }} />

      {/* Replies skeleton */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="p-5 rounded-lg border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              <div className="h-3 w-16 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
