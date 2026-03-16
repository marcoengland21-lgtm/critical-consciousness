'use client'

import Link from 'next/link'

export default function ThreadDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        Something went wrong loading this thread
      </p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        This might be a temporary issue. Try refreshing, or head back to Threads.
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
          href="/threads"
          className="px-4 py-2 rounded-lg text-sm font-medium border btn-transition"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
        >
          Back to Threads
        </Link>
      </div>
    </div>
  )
}
