'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AnnotationPopover from './AnnotationPopover'
import AnnotationPanel from './AnnotationPanel'

interface Annotation {
  id: string
  chapter_id: string
  author_id: string
  body: string
  quote_exact: string
  position_start: number
  position_end: number
  quote_prefix: string | null
  quote_suffix: string | null
  created_at: string
  author?: { id: string; display_name: string }
  replies?: {
    id: string
    body: string
    created_at: string
    author?: { id: string; display_name: string }
  }[]
}

interface Chapter {
  id: string
  chapter_number: number
  title: string
  content: string
  sort_order: number
}

interface Props {
  chapter: Chapter
  annotations: Annotation[]
  userId: string | null
  documentSlug: string
}

// Guest ID for unauthenticated annotation
const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

/** Split text into annotated and unannotated segments */
function buildSegments(
  text: string,
  annotations: Annotation[]
): { start: number; end: number; text: string; annotations: Annotation[] }[] {
  if (annotations.length === 0) {
    return [{ start: 0, end: text.length, text, annotations: [] }]
  }

  // Build a list of boundary points
  const boundaries = new Set<number>()
  boundaries.add(0)
  boundaries.add(text.length)

  for (const ann of annotations) {
    boundaries.add(Math.max(0, ann.position_start))
    boundaries.add(Math.min(text.length, ann.position_end))
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  const segments: { start: number; end: number; text: string; annotations: Annotation[] }[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    const segText = text.slice(start, end)

    // Find all annotations that cover this segment
    const covering = annotations.filter(
      (a) => a.position_start <= start && a.position_end >= end
    )

    segments.push({ start, end, text: segText, annotations: covering })
  }

  return segments
}

export default function ChapterReader({ chapter, annotations: initialAnnotations, userId, documentSlug }: Props) {
  const router = useRouter()
  const textRef = useRef<HTMLDivElement>(null)
  const [annotations, setAnnotations] = useState(initialAnnotations)
  const [selection, setSelection] = useState<{
    text: string
    start: number
    end: number
    rect: DOMRect
  } | null>(null)
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null)
  const [showAnnotatePopover, setShowAnnotatePopover] = useState(false)

  // Listen for Supabase realtime annotation changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`annotations:${chapter.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotations',
          filter: `chapter_id=eq.${chapter.id}`,
        },
        () => {
          // Refresh on any annotation change
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotation_replies',
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chapter.id, router])

  // Update annotations when props change (from realtime refresh)
  useEffect(() => {
    setAnnotations(initialAnnotations)
  }, [initialAnnotations])

  /** Compute character offset of a DOM position relative to the text container */
  const getCharOffset = useCallback(
    (node: Node, offset: number): number => {
      if (!textRef.current) return 0

      const walker = document.createTreeWalker(textRef.current, NodeFilter.SHOW_TEXT)
      let charCount = 0

      while (walker.nextNode()) {
        if (walker.currentNode === node) {
          return charCount + offset
        }
        charCount += (walker.currentNode.textContent?.length || 0)
      }

      return charCount
    },
    []
  )

  /** Handle text selection */
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !textRef.current) {
      // Don't clear selection if annotation panel is open
      if (!activeAnnotation) {
        setSelection(null)
        setShowAnnotatePopover(false)
      }
      return
    }

    const range = sel.getRangeAt(0)

    // Ensure selection is within our text container
    if (!textRef.current.contains(range.startContainer) || !textRef.current.contains(range.endContainer)) {
      return
    }

    const text = sel.toString().trim()
    if (!text || text.length < 3) return

    const start = getCharOffset(range.startContainer, range.startOffset)
    const end = getCharOffset(range.endContainer, range.endOffset)
    const rect = range.getBoundingClientRect()

    setSelection({ text, start, end, rect })
    setShowAnnotatePopover(true)
    setActiveAnnotation(null)
  }, [getCharOffset, activeAnnotation])

  /** Save a new annotation */
  const handleSaveAnnotation = useCallback(
    async (body: string) => {
      if (!selection) return

      const supabase = createClient()
      const authorId = userId || GUEST_ID
      const content = chapter.content

      // Compute prefix/suffix context
      const prefixStart = Math.max(0, selection.start - 30)
      const suffixEnd = Math.min(content.length, selection.end + 30)
      const quotePrefix = content.slice(prefixStart, selection.start)
      const quoteSuffix = content.slice(selection.end, suffixEnd)

      const { data, error } = await supabase
        .from('annotations')
        .insert({
          chapter_id: chapter.id,
          author_id: authorId,
          body,
          quote_exact: selection.text,
          position_start: selection.start,
          position_end: selection.end,
          quote_prefix: quotePrefix,
          quote_suffix: quoteSuffix,
        })
        .select(`
          *,
          author:profiles!author_id(id, display_name),
          replies:annotation_replies(
            id, body, created_at,
            author:profiles!author_id(id, display_name)
          )
        `)
        .single()

      if (!error && data) {
        setAnnotations((prev) => [...prev, data])
        setSelection(null)
        setShowAnnotatePopover(false)
        window.getSelection()?.removeAllRanges()
      }
    },
    [selection, userId, chapter.id, chapter.content]
  )

  /** Click on an annotated segment */
  const handleAnnotationClick = useCallback((anns: Annotation[]) => {
    if (anns.length > 0) {
      setActiveAnnotation(anns[0])
      setShowAnnotatePopover(false)
      setSelection(null)
    }
  }, [])

  // Split text into paragraphs and render with annotations
  const paragraphs = chapter.content.split('\n\n')
  let charOffset = 0

  return (
    <div className="relative">
      {/* The reading text */}
      <div
        ref={textRef}
        className="reading-text"
        onMouseUp={handleMouseUp}
      >
        {paragraphs.map((paragraph, pIdx) => {
          const pStart = charOffset
          const pEnd = charOffset + paragraph.length
          charOffset = pEnd + 2 // +2 for the \n\n

          // Get annotations that overlap this paragraph
          const pAnnotations = annotations.filter(
            (a) => a.position_start < pEnd && a.position_end > pStart
          )

          if (pAnnotations.length === 0) {
            return (
              <p key={pIdx} data-offset={pStart}>
                {paragraph}
              </p>
            )
          }

          // Build segments for this paragraph
          const localAnnotations = pAnnotations.map((a) => ({
            ...a,
            position_start: Math.max(a.position_start - pStart, 0),
            position_end: Math.min(a.position_end - pStart, paragraph.length),
          }))

          const segments = buildSegments(paragraph, localAnnotations)

          // Count annotations per paragraph for margin indicator
          const annotationCount = pAnnotations.length

          return (
            <p key={pIdx} data-offset={pStart} className="relative group/para">
              {/* Margin annotation count indicator */}
              {annotationCount > 0 && (
                <span
                  className="absolute -left-10 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium opacity-40 group-hover/para:opacity-100 transition-opacity hidden lg:flex"
                  style={{
                    backgroundColor: annotationCount > 2 ? 'var(--color-muted-gold)' : '#e8ddd0',
                    color: 'var(--color-dark-brown)',
                  }}
                  title={`${annotationCount} annotation${annotationCount > 1 ? 's' : ''}`}
                >
                  {annotationCount}
                </span>
              )}
              {segments.map((seg, sIdx) => {
                if (seg.annotations.length === 0) {
                  return <span key={sIdx}>{seg.text}</span>
                }

                // Map local annotations back to global ones
                const globalAnns = seg.annotations.map((localAnn) => {
                  return pAnnotations.find(
                    (a) =>
                      a.position_start <= pStart + localAnn.position_start &&
                      a.position_end >= pStart + localAnn.position_end
                  )!
                }).filter(Boolean)

                const density = globalAnns.length
                return (
                  <mark
                    key={sIdx}
                    className={density > 1 ? 'annotation-highlight-dense' : 'annotation-highlight'}
                    onClick={() => handleAnnotationClick(globalAnns)}
                    title={`${density} annotation${density > 1 ? 's' : ''}`}
                  >
                    {seg.text}
                  </mark>
                )
              })}
            </p>
          )
        })}
      </div>

      {/* Annotation creation popover */}
      {showAnnotatePopover && selection && (
        <AnnotationPopover
          rect={selection.rect}
          selectedText={selection.text}
          onSave={handleSaveAnnotation}
          onCancel={() => {
            setShowAnnotatePopover(false)
            setSelection(null)
            window.getSelection()?.removeAllRanges()
          }}
          isGuest={!userId}
        />
      )}

      {/* Annotation detail panel */}
      {activeAnnotation && (
        <AnnotationPanel
          annotation={activeAnnotation}
          userId={userId}
          chapterId={chapter.id}
          onClose={() => setActiveAnnotation(null)}
        />
      )}
    </div>
  )
}
