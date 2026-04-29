/**
 * ConceptsThisChapterWidget — chunk 3b piece 4 + Schedule modes
 * (recurring v1) chapter-aware swap.
 *
 * Right-rail widget per frame 13D. Lists glossary terms introduced
 * in the group's CURRENT chapter — filtered upstream in
 * dashboard/page.tsx by
 * `glossary_entries.first_appearance_chapter = group.currentChapterId`
 * (009 — recurring v1).
 *
 *   CONCEPTS THIS CHAPTER
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
 *
 * Renamed from ConceptsThisWeekWidget per Schedule modes (recurring
 * v1) item 2 — the unit of structure shifted from week to chapter
 * (host advances when ready, no preset weekly schedule).
 */

import Link from 'next/link'

export interface ConceptItem {
  id: string
  term: string
  /** First sentence of the definition, truncated to ~80 chars. */
  shortDefinition: string
}

interface ConceptsThisChapterWidgetProps {
  concepts: ConceptItem[]
}

export default function ConceptsThisChapterWidget({ concepts }: ConceptsThisChapterWidgetProps) {
  return (
    <section aria-label="Concepts introduced in the current chapter">
      <p className="text-eyebrow mb-2">Concepts this chapter</p>

      {concepts.length === 0 ? (
        <p
          className="text-sm italic"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          No new concepts introduced in this chapter yet.
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
