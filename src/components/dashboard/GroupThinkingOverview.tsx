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
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
            What the Group is Thinking
          </h2>
        </div>
        <div className="p-5 text-center" style={{ backgroundColor: 'var(--bg-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The group's thinking will appear here as people begin annotating the text.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
      <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
          What the Group is Thinking
        </h2>
      </div>
      <div className="p-5 space-y-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        {/* By section summary */}
        {analysis.byChapter.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
              By Section
            </h3>
            <div className="space-y-2">
              {analysis.byChapter.slice(0, 3).map((chapter) => (
                <div
                  key={chapter.chapter_number}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-page)' }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Section {chapter.chapter_number}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {chapter.chapter_title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--bg-card)' }}>
                      {chapter.annotation_count}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--accent-purple)' }}>
              Themes Being Explored
            </h3>
            <div className="space-y-2">
              {analysis.recentSnippets.map((snippet, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg text-sm italic"
                  style={{
                    backgroundColor: 'var(--bg-page)',
                    color: 'var(--text-primary)',
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
