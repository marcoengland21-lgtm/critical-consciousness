/**
 * WhereStuckWidget — chunk 3b piece 4.
 *
 * Right-rail widget per frame 13D. Surfaces the most-flagged
 * paragraphs in this week's reading so the discussion-starter knows
 * which spots to bring to the next session.
 *
 * Header copy is locked (Mars's refinement on point #1):
 *   "X paragraphs flagged in this week's reading"
 *   NOT "flagged this week" — confusion_counts has no timestamps
 *   (chunk 1 anonymity guarantee). We're scoping to the chapters in
 *   this week's reading, not claiming the flags were filed this week.
 *
 *   WHERE WE'RE STUCK
 *   3 paragraphs flagged in this week's reading       Bring to Tuesday →
 *
 *   Ch 1 §1, ¶7                                                     5 ⚑
 *   "The use-value of every commodity is conditioned by…"
 *
 *   Ch 1 §3, ¶12                                                    3 ⚑
 *   "The relative form of value of one commodity, the linen…"
 *
 *   Ch 1 §4, ¶3                                                     2 ⚑
 *   "The mystical character of commodities does not arise from…"
 */

import { getChapterLabel } from '@/lib/chapter-utils'

export interface StuckParagraph {
  chapterId: string
  chapterNumber: number
  paragraphIndex: number
  flagCount: number
  /** First ~80 chars of the paragraph for the quoted opening. */
  excerpt: string
  /** Reading slug for the chapter href. */
  documentSlug: string
}

interface WhereStuckWidgetProps {
  /** Top N paragraphs sorted by flag count desc. May be empty when
      no flags exist in this week's reading. */
  paragraphs: StuckParagraph[]
}

export default function WhereStuckWidget({ paragraphs }: WhereStuckWidgetProps) {
  return (
    <section aria-label="Where the group is stuck">
      <p className="text-eyebrow mb-2">Where we&apos;re stuck</p>

      {paragraphs.length === 0 ? (
        <p
          className="text-sm italic"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          No paragraphs flagged in this week&apos;s reading yet.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}
            >
              {paragraphs.length}{' '}
              {paragraphs.length === 1 ? 'paragraph' : 'paragraphs'} flagged in
              this week&apos;s reading
            </p>
            <a
              href="/threads/new?type=discussion"
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: 'var(--accent-red)' }}
            >
              Bring to Tuesday →
            </a>
          </div>

          <ul className="space-y-3">
            {paragraphs.map((p) => {
              const chapterLabel = getChapterLabel(p.chapterNumber).label
              const para = `¶${p.paragraphIndex + 1}`
              return (
                <li key={`${p.chapterId}-${p.paragraphIndex}`}>
                  <a
                    href={`/reading/${p.documentSlug}/${p.chapterNumber}#para-${p.paragraphIndex}`}
                    className="block transition-colors hover-bg-themed rounded-md px-2 -mx-2 py-1"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span
                        className="text-eyebrow"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {chapterLabel}, {para}
                      </span>
                      <span
                        className="text-xs font-semibold tabular-nums flex items-center gap-1"
                        style={{ color: 'var(--accent-amber)' }}
                      >
                        {p.flagCount}
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                          <line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                      </span>
                    </div>
                    <p
                      className="text-xs italic"
                      style={{
                        color: 'var(--text-secondary)',
                        fontFamily: "'Lora', Georgia, serif",
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      &ldquo;{p.excerpt}…&rdquo;
                    </p>
                  </a>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
