/**
 * ConceptsThisWeekWidget — chunk 3b piece 4.
 *
 * Right-rail widget per frame 13D. Lists glossary terms introduced in
 * this week's reading week (filtered by
 * `glossary_entries.first_appearance_week = current_week.id`).
 *
 *   CONCEPTS THIS WEEK
 *   4 terms being introduced                                Glossary →
 *
 *   Use-value         the qualitative side — what a thing is good for
 *   Exchange-value    the quantitative side — what it trades against
 *   Abstract labour   labour stripped of its particular form
 *   Commodity fetishism  the social relation that appears as a
 *                        thing-relation
 *
 * Term names use Lora italic with the placeholder treatment from
 * piece 5 (single-underline; round 5 will refine).
 */

import Link from 'next/link'

export interface ConceptItem {
  id: string
  term: string
  /** First sentence of the definition, truncated to ~80 chars. */
  shortDefinition: string
}

interface ConceptsThisWeekWidgetProps {
  concepts: ConceptItem[]
}

export default function ConceptsThisWeekWidget({ concepts }: ConceptsThisWeekWidgetProps) {
  return (
    <section aria-label="Concepts introduced this week">
      <p className="text-eyebrow mb-2">Concepts this week</p>

      {concepts.length === 0 ? (
        <p
          className="text-sm italic"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          No new concepts introduced this week.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}
            >
              {concepts.length}{' '}
              {concepts.length === 1 ? 'term being introduced' : 'terms being introduced'}
            </p>
            <Link
              href="/glossary"
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: 'var(--accent-red)' }}
            >
              Glossary →
            </Link>
          </div>

          <ul className="space-y-2.5">
            {concepts.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5">
                <Link
                  href={`/glossary?term=${encodeURIComponent(c.term)}`}
                  className="text-sm transition-colors hover-bg-themed rounded-md px-2 -mx-2 py-1"
                >
                  <span
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: "'Lora', Georgia, serif",
                      fontStyle: 'italic',
                      fontWeight: 500,
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--accent-purple)',
                      textDecorationThickness: '1px',
                      textUnderlineOffset: '0.18em',
                    }}
                  >
                    {c.term}
                  </span>
                  <span
                    className="block text-xs mt-0.5"
                    style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}
                  >
                    {c.shortDefinition}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
