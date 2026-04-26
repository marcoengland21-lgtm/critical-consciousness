'use client'

import Link from 'next/link'

interface PassageSpotlightProps {
  passage: {
    quote: string
    chapterTitle: string
    chapterNumber: number
    documentSlug: string
    annotationCount: number
  } | null
}

/**
 * Passage Spotlight
 *
 * Dashboard component that surfaces the most-annotated passage from the
 * current week. Creates a shared focal point — everyone sees what captured
 * the group's attention this week.
 *
 * Shows: warm amber "The group is thinking about..." header → blockquote →
 * annotation count → link to join.
 *
 * Why this matters: Creates a shared focal point. Everyone sees what captured
 * the group's attention this week, pulling more people into the conversation.
 */
export default function PassageSpotlight({ passage }: PassageSpotlightProps) {
  if (!passage) return null

  // Truncate long passages
  const displayQuote = passage.quote.length > 300
    ? passage.quote.slice(0, 300).trim() + '…'
    : passage.quote

  return (
    <div
      className="card-base card-hover overflow-hidden"
      style={{ borderLeft: '3px solid var(--accent-amber)' }}
    >
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{
              backgroundColor: 'rgba(var(--accent-amber-rgb), 0.12)',
              color: 'var(--accent-amber)',
            }}
          >
            ✦
          </span>
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--accent-amber)' }}
          >
            The group is thinking about…
          </h3>
        </div>
      </div>

      {/* Quote */}
      <div className="card-body pt-0">
        <blockquote
          className="reading-text"
          style={{
            fontSize: '0.95rem',
            lineHeight: 1.7,
            maxWidth: 'none',
            padding: '0.75rem 1rem',
            margin: 0,
            borderLeft: '2px solid var(--accent-purple)',
            backgroundColor: 'rgba(var(--accent-purple-rgb), 0.04)',
            borderRadius: '0 var(--radius-button) var(--radius-button) 0',
            fontStyle: 'italic',
            color: 'var(--text-primary)',
          }}
        >
          &ldquo;{displayQuote}&rdquo;
        </blockquote>

        {/* Meta info */}
        <div className="flex items-center justify-between mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>{passage.chapterTitle}</span>
          <span className="font-medium" style={{ color: 'var(--accent-purple)' }}>
            {passage.annotationCount} annotation{passage.annotationCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* CTA — chunk 1 §5.5: visually distinct from body text. Was just
            inline amber text reading like another body line; now an inline
            button-style link with a soft amber-tinted background, light
            border, and an underline-on-hover treatment. Doesn't need to
            be a heavy button; just shouldn't read as another line of text. */}
        <Link
          href={`/reading/${passage.documentSlug}/${passage.chapterNumber}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md btn-transition hover:underline"
          style={{
            color: 'var(--accent-amber)',
            backgroundColor: 'rgba(var(--accent-amber-rgb), 0.1)',
            border: '1px solid rgba(var(--accent-amber-rgb), 0.25)',
            textUnderlineOffset: '3px',
          }}
        >
          Join the conversation
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
