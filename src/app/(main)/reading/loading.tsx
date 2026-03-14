export default function ReadingLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-32 rounded mb-2" style={{ backgroundColor: 'var(--bg-soft)' }} />
        <div className="h-4 w-80 rounded" style={{ backgroundColor: 'var(--bg-soft)' }} />
      </div>

      {/* Document header skeleton */}
      <div className="rounded-t-lg px-6 py-5" style={{ backgroundColor: 'var(--bg-nav)' }}>
        <div className="h-7 w-64 rounded mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="h-4 w-24 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Chapter list skeleton */}
      <div className="rounded-b-lg border border-t-0" style={{ borderColor: 'var(--border-default)' }}>
        {/* Part header */}
        <div className="px-6 py-3" style={{ backgroundColor: 'var(--bg-soft)' }}>
          <div className="h-3 w-16 rounded mb-1" style={{ backgroundColor: 'var(--border-default)' }} />
          <div className="h-4 w-48 rounded" style={{ backgroundColor: 'var(--border-default)' }} />
        </div>

        {/* Chapter rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderBottom: i < 5 ? '1px solid var(--border-default)' : 'none',
            }}
          >
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--bg-soft)' }} />
            <div className="flex-1">
              <div className="h-4 w-48 rounded mb-1" style={{ backgroundColor: 'var(--bg-soft)' }} />
              <div className="h-3 w-32 rounded" style={{ backgroundColor: 'var(--bg-soft)', opacity: 0.5 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
