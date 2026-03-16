export default function ScheduleLoading() {
  return (
    <div className="skeleton-shimmer">
      <div className="mb-8">
        <div className="h-8 w-52 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border-2 overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-header)' }}>
              <div className="h-5 w-32 rounded" style={{ backgroundColor: 'var(--bg-card-alt)', opacity: 0.3 }} />
            </div>
            <div className="p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="h-5 w-64 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              <div className="h-4 w-48 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              <div className="h-4 w-36 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
