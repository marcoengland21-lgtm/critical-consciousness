/**
 * AttentionMagnitudeBars — chunk 3b piece 4.
 *
 * "Where the group's attention is" widget per frame 13D. Lists the
 * sections of this week's reading with annotation counts, magnitude
 * bars (purple fill proportional to count vs the max), "+N TODAY"
 * tags where applicable, and "N yours" indicators for the user's
 * own annotations.
 *
 * Real zero is shown as `0`, not `—` (per the brief).
 *
 *   Where the group's attention is
 *   38 annotations across 6 sections · Capital Vol 1, Ch 1   Read & annotate →
 *
 *   14   §1  The Two Factors of a Commodity        +2 TODAY    4 yours
 *        ████████████████████████████░░░░░░░░░░░
 *   11   §4  The Fetishism of Commodities          +1 TODAY    3 yours
 *        █████████████████░░░░░░░░░░░░░░░░░░░░░░
 *    6   §2  The Two-fold Character of Labour                  1 yours
 *        █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 *    3   §3  The Form of Value
 *        █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 *    2   §5  Exchange
 *        ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 *    0   §6  The Money Form
 *        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 */

import Link from 'next/link'

export interface SectionAttention {
  chapterId: string
  chapterNumber: number
  sectionLabel: string  // "§1"
  title: string
  totalCount: number
  todayCount: number
  yoursCount: number
  documentSlug: string
}

interface AttentionMagnitudeBarsProps {
  sections: SectionAttention[]
  /** Total annotations across all sections (for the subtitle). */
  totalAnnotations: number
  /** Reading scope label ("Capital Vol 1, Ch 1"). */
  scopeLabel: string
  /** Default href for the "Read & annotate" link. */
  primaryReadingHref: string
}

export default function AttentionMagnitudeBars({
  sections,
  totalAnnotations,
  scopeLabel,
  primaryReadingHref,
}: AttentionMagnitudeBarsProps) {
  // Compute the bar's fill ratio against the section with the most
  // annotations. If max is 0, all bars are empty.
  const max = sections.reduce((m, s) => Math.max(m, s.totalCount), 0)

  return (
    <section aria-label="Where the group's attention is">
      <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
        <h2
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '1.5rem',
            lineHeight: 1.2,
          }}
        >
          Where the group&apos;s attention is
        </h2>
        <Link
          href={primaryReadingHref}
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: 'var(--accent-red)' }}
        >
          Read &amp; annotate →
        </Link>
      </div>
      <p
        className="text-sm mb-5"
        style={{ color: 'var(--text-secondary)' }}
      >
        {totalAnnotations}{' '}
        {totalAnnotations === 1 ? 'annotation' : 'annotations'} across{' '}
        {sections.length} {sections.length === 1 ? 'section' : 'sections'} ·{' '}
        {scopeLabel}
      </p>

      <ul
        className="space-y-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {sections.map((s) => {
          const ratio = max > 0 ? s.totalCount / max : 0
          return (
            <li
              key={s.chapterId}
              className="pt-3"
              style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}
            >
              <Link
                href={`/reading/${s.documentSlug}/${s.chapterNumber}`}
                className="block group rounded-md transition-colors hover-bg-themed -mx-2 px-2 py-1"
              >
                <div className="flex items-baseline gap-3 mb-1.5 flex-wrap">
                  <span
                    className="text-2xl font-semibold tabular-nums shrink-0"
                    style={{
                      color: s.totalCount === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontFamily: "'Lora', Georgia, serif",
                      fontStyle: 'italic',
                      fontWeight: 500,
                      lineHeight: 1,
                      minWidth: '2ch',
                    }}
                  >
                    {s.totalCount}
                  </span>
                  <span
                    className="text-eyebrow shrink-0"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {s.sectionLabel}
                  </span>
                  <span
                    className="text-sm flex-1 min-w-0 truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {s.title}
                  </span>
                  {s.todayCount > 0 && (
                    <span
                      className="text-eyebrow px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: 'rgba(var(--accent-amber-rgb), 0.15)',
                        color: 'var(--accent-amber)',
                      }}
                    >
                      +{s.todayCount} today
                    </span>
                  )}
                  {s.yoursCount > 0 && (
                    <span
                      className="text-xs shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {s.yoursCount} yours
                    </span>
                  )}
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-soft)' }}
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round(ratio * 100)}%`,
                      backgroundColor: 'var(--accent-purple)',
                    }}
                  />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
