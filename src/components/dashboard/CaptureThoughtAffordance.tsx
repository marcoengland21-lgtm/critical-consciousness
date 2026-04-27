'use client'

/**
 * CaptureThoughtAffordance — chunk 3b piece 4.
 *
 * Bottom-of-right-rail trigger for the JournalCaptureModal per
 * frame 13D. Visually a quiet pseudo-input (placeholder-style)
 * that opens the modal on click.
 *
 *   +  Capture a thought…
 *
 * Below, an optional preview of the most-recent journal entry —
 * "3D AGO 'Thinking with Marx about my own labour' →"
 */

import { useState } from 'react'
import Link from 'next/link'
import JournalCaptureModal from './JournalCaptureModal'

interface CaptureThoughtAffordanceProps {
  userId: string
  /** Most-recent journal entry preview (may be null). */
  recent: {
    id: string
    title: string | null
    excerpt: string
    timeAgo: string
  } | null
}

export default function CaptureThoughtAffordance({
  userId,
  recent,
}: CaptureThoughtAffordanceProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section aria-label="Capture a thought">
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center gap-2 text-left rounded-md px-3 py-2.5 transition-colors hover-bg-themed"
        style={{
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card-alt)',
          color: 'var(--text-secondary)',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span
          className="text-sm italic"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          Capture a thought…
        </span>
      </button>

      {recent && (
        <Link
          href={`/journal/${recent.id}`}
          className="block mt-2 px-1 py-1 text-xs transition-colors hover-bg-themed rounded"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="text-eyebrow mr-2" style={{ opacity: 0.75 }}>
            {recent.timeAgo}
          </span>
          <span style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>
            &ldquo;{recent.title || recent.excerpt}&rdquo;
          </span>
          <span className="ml-1" style={{ color: 'var(--accent-red)' }}>
            →
          </span>
        </Link>
      )}

      <JournalCaptureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
      />
    </section>
  )
}
