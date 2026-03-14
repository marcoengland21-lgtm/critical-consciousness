export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-72 rounded mb-2" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
        <div className="h-4 w-48 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* This Week's Reading skeleton */}
          <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: 'var(--accent-purple)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-header)' }}>
              <div className="h-5 w-40 rounded" style={{ backgroundColor: 'var(--accent-purple)', opacity: 0.3 }} />
            </div>
            <div className="p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              <div className="h-6 w-64 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              <div className="h-4 w-48 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
              <div className="h-20 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
          </div>

          {/* Activity skeleton */}
          <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card-alt)' }}>
            <div className="h-4 w-36 rounded mb-2" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>

          {/* Recent Threads skeleton */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <div className="h-5 w-40 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                  <div className="h-3 w-16 rounded mb-2" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
                  <div className="h-4 w-48 rounded mb-1" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
                  <div className="h-3 w-32 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
              <div className="h-5 w-24 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
            <div className="p-5" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="h-16 w-full rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            </div>
          </div>

          <div className="rounded-lg border-2 p-5" style={{ borderColor: 'var(--accent-red)', backgroundColor: 'var(--bg-card)' }}>
            <div className="h-3 w-24 rounded mb-2" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            <div className="h-5 w-48 rounded mb-1" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
            <div className="h-3 w-64 rounded" style={{ backgroundColor: 'var(--bg-card-alt)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
