export default function ChapterLoading() {
  return (
    <div className="max-w-3xl mx-auto" style={{ color: 'var(--text-primary)' }}>
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 w-16 rounded" style={{ backgroundColor: 'var(--bg-soft)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>›</span>
        <div className="h-4 w-28 rounded" style={{ backgroundColor: 'var(--bg-soft)' }} />
        <span style={{ color: 'var(--text-secondary)' }}>›</span>
        <div className="h-4 w-8 rounded" style={{ backgroundColor: 'var(--bg-soft)' }} />
      </div>

      {/* Section tabs skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 rounded-full"
            style={{
              width: `${100 + i * 20}px`,
              backgroundColor: 'var(--bg-soft)',
            }}
          />
        ))}
      </div>

      {/* Title skeleton */}
      <div className="text-center mb-10">
        <div className="h-3 w-20 mx-auto mb-3 rounded" style={{ backgroundColor: 'var(--bg-soft)' }} />
        <div className="h-8 w-96 mx-auto mb-4 rounded" style={{ backgroundColor: 'var(--bg-soft)' }} />
        <div className="h-1 w-12 mx-auto rounded" style={{ backgroundColor: 'var(--accent-red)', opacity: 0.3 }} />
      </div>

      {/* Content skeleton */}
      <div className="space-y-8 mt-12">
        {[1, 2, 3].map((p) => (
          <div key={p} className="space-y-3">
            <div className="h-5 w-full rounded" style={{ backgroundColor: 'var(--bg-soft)', opacity: 0.7 }} />
            <div className="h-5 w-full rounded" style={{ backgroundColor: 'var(--bg-soft)', opacity: 0.5 }} />
            <div className="h-5 w-4/5 rounded" style={{ backgroundColor: 'var(--bg-soft)', opacity: 0.3 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
