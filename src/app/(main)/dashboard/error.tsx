'use client'

import Link from 'next/link'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        Something went wrong loading your dashboard
      </p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        This might be a temporary issue. Try refreshing, or head back to Reading.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium btn-transition"
          style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
        >
          Try Again
        </button>
        <Link
          href="/reading"
          className="px-4 py-2 rounded-lg text-sm font-medium border btn-transition"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
        >
          Go to Reading
        </Link>
      </div>
    </div>
  )
}
