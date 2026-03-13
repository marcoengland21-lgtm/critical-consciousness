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

    // Get the 3 most recent annotation snippets for reflection
    const recentSnippets = annotations
      .slice(-3)
      .reverse()
      .map((ann) => {
        const snippet = ann.body.length > 80 ? ann.body.substring(0, 80).trim() + '...' : ann.body
        return snippet
      })

    return {
      byChapter: Array.from(byChapter.values()),
      recentSnippets,
      totalAnnotations: annotations.length,
      totalThreads: threads.reduce((sum, t) => sum + t.thread_count, 0),
    }
  }, [annotations, threads])

  if (analysis.totalAnnotations === 0 && analysis.totalThreads === 0) {
    return (
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2dfe8' }}>
        <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e2dfe8' }}>
          <h2 className="font-bold" style={{ color: 'var(--color-dark-brown)' }}>
            What the Group is Thinking
          </h2>
        </div>
        <div className="p-5 text-center" style={{ backgroundColor: 'white' }}>
          <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
            The group's thinking will appear here as people begin annotating the text.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2dfe8' }}>
      <div className="px-5 py-3" style={{ backgroundColor: 'white', borderBottom: '1px solid #e2dfe8' }}>
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
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#6b4c9a', color: 'white' }}>
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

        {/* Themes being explored */}
        {analysis.recentSnippets.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--color-muted-gold)' }}>
              Themes Being Explored
            </h3>
            <div className="space-y-2">
              {analysis.recentSnippets.map((snippet, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg text-sm italic"
                  style={{
                    backgroundColor: 'var(--color-warm-cream)',
                    color: 'var(--color-dark-brown)',
                  }}
                >
                  <p>Someone noted: "{snippet}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
