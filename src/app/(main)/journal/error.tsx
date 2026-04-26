'use client'

import Link from 'next/link'

export default function JournalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <p
        className="mb-2"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: 'italic',
          fontSize: '1.5rem',
        }}
      >
        Something went wrong loading your journal
      </p>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Your entries are still safe. Try again or head back to the dashboard.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={reset} className="btn-primary text-sm">
          Try again
        </button>
        <Link href="/dashboard" className="btn-secondary text-sm">
          Dashboard
        </Link>
      </div>
    </div>
  )
}
