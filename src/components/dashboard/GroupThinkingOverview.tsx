'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

interface AnnotationData {
  chapter_number: number
  chapter_title: string
  annotation_count: number
  body: string
}

interface ThreadData {
  week_number: number
  thread_count: number
}

interface Props {
  annotations: AnnotationData[]
  threads: ThreadData[]
  documentSlug?: string
  /** Render the 'By Section' attention heatmap. Default true. */
  showSections?: boolean
  /** Render the 'Themes Being Explored' quotes list. Default true. */
  showThemes?: boolean
}

const THEMES_DEFAULT_VISIBLE = 2

/**
 * GroupThinkingOverview — the dashboard's per-section attention heatmap +
 * 'Themes Being Explored' (recent annotation quotes).
 *
 * Per chunk 1 §4 the dashboard now renders this twice on the same page —
 * once with showThemes={false} for the heatmap (above Recent Discussions)
 * and again with showSections={false} for the themes (below Recent
 * Discussions). The split keeps the visual rhythm right without forking
 * this component.
 *
 * Heatmap rows (per chunk 1 §5.2):
 * - Compact ~44-48px tall (down from ~60-70px)
 * - Hairline magnitude bar below the title showing relative note count
 *
 * Themes (per chunk 1 §5.3):
 * - Capped at 2 visible by default
 * - '+ N more' expands inline
 * - Tighter padding
 */
export default function GroupThinkingOverview({
  annotations,
  threads,
  documentSlug = 'capital-vol-1',
  showSections = true,
  showThemes = true,
}: Props) {
  const [themesExpanded, setThemesExpanded] = useState(false)

  const analysis = useMemo(() => {
    // Group annotations by chapter
    const byChapter = new Map<number, AnnotationData>()
    annotations.forEach((ann) => {
      if (!byChapter.has(ann.chapter_number)) {
        byChapter.set(ann.chapter_number, {
          chapter_number: ann.chapter_number,
          chapter_title: ann.chapter_title,
          annotation_count: 0,
          body: '',
        })
      }
      const chapter = byChapter.get(ann.chapter_number)!
      chapter.annotation_count += 1
      chapter.body += ' ' + ann.body
    })

    // Get the 3 most recent annotation snippets with their chapter info
    const recentSnippets = annotations
      .slice(-3)
      .reverse()
      .map((ann) => ({
        snippet: ann.body.length > 140 ? ann.body.substring(0, 140).trim() + '...' : ann.body,
        chapter_number: ann.chapter_number,
      }))

    return {
      byChapter: Array.from(byChapter.values()),
      recentSnippets,
      totalAnnotations: annotations.length,
      totalThreads: threads.reduce((sum, t) => sum + t.thread_count, 0),
    }
  }, [annotations, threads])

  // Empty state: only render when at least one of the requested subsections
  // would have content. Otherwise return null so we don't leave an empty
  // "What the Group is Thinking" header floating on the page.
  const hasSections = analysis.byChapter.length > 0
  const hasThemes = analysis.recentSnippets.length > 0
  const renderingSections = showSections && hasSections
  const renderingThemes = showThemes && hasThemes
  if (!renderingSections && !renderingThemes) {
    return null
  }

  // For the magnitude bars (§5.2): scale relative to the highest count.
  const maxCount = analysis.byChapter.reduce((m, c) => Math.max(m, c.annotation_count), 0) || 1

  const visibleThemes = themesExpanded
    ? analysis.recentSnippets
    : analysis.recentSnippets.slice(0, THEMES_DEFAULT_VISIBLE)
  const moreCount = analysis.recentSnippets.length - THEMES_DEFAULT_VISIBLE

  return (
    <section>
      {/* Header — only renders if at least one inner subsection is visible.
          When this component is rendered twice on the dashboard the header
          appears only on the first instance (the one with showSections), so
          the themes-only second pass below uses its own eyebrow. */}
      {renderingSections && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-eyebrow">What the Group is Thinking</p>
          <Link
            href={`/reading/${documentSlug}/1`}
            className="text-xs font-medium"
            style={{ color: 'var(--accent-red)' }}
          >
            Read &amp; annotate →
          </Link>
        </div>
      )}

      {renderingSections && (
        <div>
          <p className="text-eyebrow mb-2" style={{ color: 'var(--accent-purple)' }}>
            By Section
          </p>
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {analysis.byChapter.slice(0, 4).map((chapter) => {
              const ratio = chapter.annotation_count / maxCount
              return (
                <Link
                  key={chapter.chapter_number}
                  href={`/reading/${documentSlug}/${chapter.chapter_number}`}
                  className="block px-2 py-2 transition-colors hover-bg-themed"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Section {chapter.chapter_number}{' '}
                        <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>
                          — {chapter.chapter_title}
                        </span>
                      </p>
                    </div>
                    <span
                      className="text-xs shrink-0 tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {chapter.annotation_count} {chapter.annotation_count === 1 ? 'note' : 'notes'}
                    </span>
                  </div>
                  {/* Magnitude bar — hairline-thin, scaled to the max count.
                      Makes the heatmap an actual heatmap (per §5.2). */}
                  <div
                    className="mt-1.5 h-[3px] rounded-sm"
                    style={{
                      backgroundColor: 'rgba(var(--accent-purple-rgb), 0.4)',
                      width: `${Math.max(ratio * 100, 6)}%`,
                    }}
                    aria-hidden="true"
                  />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {renderingThemes && (
        <div className={renderingSections ? 'mt-6' : ''}>
          <p className="text-eyebrow mb-2" style={{ color: 'var(--accent-purple)' }}>
            Themes Being Explored
          </p>
          <div className="space-y-1.5">
            {visibleThemes.map((item, index) => (
              <Link
                key={index}
                href={`/reading/${documentSlug}/${item.chapter_number}`}
                className="block px-3 py-2.5 rounded-md text-sm italic transition-colors hover-bg-themed"
                style={{
                  backgroundColor: 'var(--bg-card-alt)',
                  color: 'var(--text-primary)',
                  borderLeft: '2px solid var(--accent-purple)',
                  lineHeight: 1.5,
                }}
              >
                <span>&ldquo;{item.snippet}&rdquo;</span>
                <span
                  className="block text-xs not-italic mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Section {item.chapter_number} →
                </span>
              </Link>
            ))}
          </div>
          {!themesExpanded && moreCount > 0 && (
            <button
              onClick={() => setThemesExpanded(true)}
              className="text-eyebrow mt-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              + {moreCount} more
            </button>
          )}
        </div>
      )}
    </section>
  )
}
