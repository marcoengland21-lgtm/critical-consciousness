'use client'

import { useMemo } from 'react'

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
}

// Extract common words from text
function extractKeywords(text: string): Map<string, number> {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'as', 'from', 'up', 'about', 'into', 'through', 'so', 'more', 'most',
  ])

  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => {
      const cleaned = word.replace(/[^\w]/g, '')
      return cleaned.length > 3 && !stopwords.has(cleaned)
    })
    .map((word) => word.replace(/[^\w]/g, ''))

  const frequency = new Map<string, number>()
  words.forEach((word) => {
    frequency.set(word, (frequency.get(word) || 0) + 1)
  })

  return frequency
}

export default function GroupThinkingOverview({ annotations, threads }: Props) {
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

    // Extract top keywords from all annotations
    const allBodies = Array.from(byChapter.values())
      .map((ch) => ch.body)
      .join(' ')
    const keywords = extractKeywords(allBodies)
    const topKeywords = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0])

    return {
      byChapter: Array.from(byChapter.values()),
      topKeywords,
      totalAnnotations: annotations.length,
      totalThreads: threads.reduce((sum, t) => sum + t.thread_count, 0),
    }
  }, [annotations, threads])

  if (analysis.totalAnnotations === 0 && analysis.totalThreads === 0) {
    return (
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e1d8' }}>
        <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e1d8' }}>
          <h2 className="font-bold" style={{ color: 'var(--color-dark-brown)' }}>
            What the Group is Thinking
          </h2>
        </div>
        <div className="p-5 text-center" style={{ backgroundColor: 'white' }}>
          <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
            No annotations or discussions yet. Start a conversation!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e1d8' }}>
      <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e1d8' }}>
        <h2 className="font-bold" style={{ color: 'var(--color-dark-brown)' }}>
          What the Group is Thinking
        </h2>
      </div>
      <div className="p-5 space-y-6" style={{ backgroundColor: 'white' }}>
        {/* By section summary */}
        {analysis.byChapter.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-muted-gold)' }}>
              By Section
            </h3>
            <div className="space-y-2">
              {analysis.byChapter.slice(0, 3).map((chapter) => (
                <div
                  key={chapter.chapter_number}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--color-warm-cream)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-dark-brown)' }}>
                      Section {chapter.chapter_number}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-warm-gray)' }}>
                      {chapter.chapter_title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#C4A35A', color: 'white' }}>
                      {chapter.annotation_count}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                      {chapter.annotation_count === 1 ? 'note' : 'notes'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hot topics */}
        {analysis.topKeywords.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-muted-gold)' }}>
              Hot Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.topKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: 'rgba(196, 163, 90, 0.15)',
                    color: 'var(--color-deep-red)',
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats summary */}
        <div className="pt-2 border-t" style={{ borderColor: '#e5e1d8' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>Total Annotations</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-dark-brown)' }}>
                {analysis.totalAnnotations}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>Total Discussions</p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-dark-brown)' }}>
                {analysis.totalThreads}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
