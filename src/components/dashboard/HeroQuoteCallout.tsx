/**
 * HeroQuoteCallout — chunk 3b piece 4.
 *
 * The "THE GROUP IS THINKING ABOUT" callout per frame 13D. Surfaces
 * the passage being most-discussed by the group — Marx's words, not
 * an annotation body. Eyebrow "THE GROUP IS THINKING ABOUT" with a
 * lighter "this week" suffix; quote in display Lora italic with
 * curly quotes; yellow CTA "Read the conversation →"; subtitle with
 * annotation count + chapter ref + last-reply gloss.
 *
 * Tie-break by recency of last activity (Mars's refinement on point
 * #2): if two passages have equal annotation counts, the one with
 * more recent activity wins. Resolves at the dashboard server-
 * component query level — this component just renders the result.
 */

import Link from 'next/link'

export interface HeroQuotePassage {
  /** The passage being discussed (annotation.quote_exact). */
  quote: string
  /** Annotation count on this passage. */
  annotationCount: number
  /** Chapter eyebrow ref ("Ch 1 §4"). */
  chapterRef: string
  /** Reading slug for the CTA link. */
  documentSlug: string
  /** Chapter number for the CTA link. */
  chapterNumber: number
  /** Last reply or annotation timestamp gloss ("2h ago by Liz"). */
  lastActivityGloss: string | null
}

interface HeroQuoteCalloutProps {
  passage: HeroQuotePassage | null
}

const QUOTE_TRUNCATE = 320

export default function HeroQuoteCallout({ passage }: HeroQuoteCalloutProps) {
  if (!passage) {
    return (
      <section aria-label="What the group is thinking about">
        <p
          className="text-eyebrow mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--accent-amber)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--accent-amber)' }}
            aria-hidden="true"
          />
          The group is thinking about{' '}
          <span style={{ color: 'var(--text-secondary)', opacity: 0.7, fontWeight: 400 }}>
            this week
          </span>
        </p>
        <p
          className="text-sm italic"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          No passage has gathered enough annotations yet. Once the group is
          discussing something, it&apos;ll show here.
        </p>
      </section>
    )
  }

  const displayQuote =
    passage.quote.length > QUOTE_TRUNCATE
      ? passage.quote.slice(0, QUOTE_TRUNCATE).replace(/\s+\S*$/, '') + '…'
      : passage.quote

  return (
    <section aria-label="What the group is thinking about">
      <p
        className="text-eyebrow mb-3 flex items-center gap-1.5"
        style={{ color: 'var(--accent-amber)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--accent-amber)' }}
          aria-hidden="true"
        />
        The group is thinking about{' '}
        <span style={{ color: 'var(--text-secondary)', opacity: 0.7, fontWeight: 400 }}>
          this week
        </span>
      </p>

      <blockquote
        className="mb-4"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: '1.625rem',
          lineHeight: 1.4,
          letterSpacing: '-0.005em',
        }}
      >
        &ldquo;{displayQuote}&rdquo;
      </blockquote>

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href={`/reading/${passage.documentSlug}/${passage.chapterNumber}`}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--accent-amber)',
            color: '#1a1625',
          }}
        >
          Read the conversation →
        </Link>
        <p
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {passage.annotationCount}{' '}
          {passage.annotationCount === 1 ? 'annotation' : 'annotations'}
          {' · '}
          {passage.chapterRef}
          {passage.lastActivityGloss && <> · last reply {passage.lastActivityGloss}</>}
        </p>
      </div>
    </section>
  )
}
