'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AnnotationPopover from './AnnotationPopover'
import AnnotationPanel from './AnnotationPanel'
import SelectionToolbar from './SelectionToolbar'
import OnboardingHint from './OnboardingHint'
import ReadingControls from './ReadingControls'
import ConfusionFlagButton from './ConfusionFlagButton'
import Toast from '@/components/ui/Toast'
import { getConfusionFlagCounts, getUserConfusionFlags } from '@/lib/confusion-flags'

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
  // Debug logging
  console.log('[CCP Debug] ChapterReader mounted', {
    chapterId: chapter.id,
    contentLength: chapter.content.length,
    initialAnnotationCount: initialAnnotations.length,
    userId,
    annotations: initialAnnotations.map(a => ({ id: a.id, start: a.position_start, end: a.position_end, body: a.body?.slice(0, 40) })),
  })

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
  const [showToolbar, setShowToolbar] = useState(false)
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('ccp-font-size') || '18', 10)
    }
    return 18
  })
  const [focusedMode, setFocusedMode] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confusionFlagCounts, setConfusionFlagCounts] = useState<Map<number, number>>(new Map())
  const [userConfusionFlags, setUserConfusionFlags] = useState<Set<number>>(new Set())

  // Scroll position memory
  useEffect(() => {
    const key = `ccp-scroll-${chapter.id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const pos = parseInt(saved, 10)
      setTimeout(() => window.scrollTo(0, pos), 100)
    }

    function saveScroll() {
      localStorage.setItem(key, String(window.scrollY))
    }
    window.addEventListener('scroll', saveScroll, { passive: true })
    return () => window.removeEventListener('scroll', saveScroll)
  }, [chapter.id])

  // Save font size preference
  useEffect(() => {
    localStorage.setItem('ccp-font-size', String(fontSize))
  }, [fontSize])

  // Load confusion flags on mount
  useEffect(() => {
    async function loadConfusionFlags() {
      try {
        const counts = await getConfusionFlagCounts(chapter.id)
        setConfusionFlagCounts(counts)
        const userFlags = await getUserConfusionFlags(chapter.id)
        setUserConfusionFlags(userFlags)
      } catch (error) {
        console.error('[CCP Debug] Failed to load confusion flags:', error)
      }
    }
    loadConfusionFlags()
  }, [chapter.id])

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
        (payload) => {
          // Refresh on any annotation change
          console.log('[CCP Debug] Realtime annotation change', payload.eventType, payload.new)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'confusion_flags',
          filter: `chapter_id=eq.${chapter.id}`,
        },
        async () => {
          // Refresh confusion flags when they change
          console.log('[CCP Debug] Realtime confusion flag change')
          try {
            const counts = await getConfusionFlagCounts(chapter.id)
            setConfusionFlagCounts(counts)
          } catch (error) {
            console.error('[CCP Debug] Failed to refresh confusion flags:', error)
          }
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

  /** Handle text selection — shows floating toolbar first */
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !textRef.current) {
      // Don't clear selection if annotation panel or popover is open
      if (!activeAnnotation && !showAnnotatePopover) {
        setSelection(null)
        setShowToolbar(false)
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

    console.log('[CCP Debug] Text selected', { text: text.slice(0, 60), start, end, rectTop: rect.top, rectLeft: rect.left })
    setSelection({ text, start, end, rect })
    setShowToolbar(true)
    setShowAnnotatePopover(false)
    setActiveAnnotation(null)
  }, [getCharOffset, activeAnnotation, showAnnotatePopover])

  /** Save a new annotation */
  const handleSaveAnnotation = useCallback(
    async (body: string) => {
      if (!selection) {
        console.log('[CCP Debug] handleSaveAnnotation called but no selection')
        return
      }

      const supabase = createClient()
      const authorId = userId || GUEST_ID
      const content = chapter.content

      // Compute prefix/suffix context
      const prefixStart = Math.max(0, selection.start - 30)
      const suffixEnd = Math.min(content.length, selection.end + 30)
      const quotePrefix = content.slice(prefixStart, selection.start)
      const quoteSuffix = content.slice(selection.end, suffixEnd)

      const insertPayload = {
        chapter_id: chapter.id,
        author_id: authorId,
        body,
        quote_exact: selection.text,
        position_start: selection.start,
        position_end: selection.end,
        quote_prefix: quotePrefix,
        quote_suffix: quoteSuffix,
      }
      console.log('[CCP Debug] Inserting annotation', insertPayload)

      const { data, error } = await supabase
        .from('annotations')
        .insert(insertPayload)
        .select(`
          *,
          author:profiles!author_id(id, display_name),
          replies:annotation_replies(
            id, body, created_at,
            author:profiles!author_id(id, display_name)
          )
        `)
        .single()

      console.log('[CCP Debug] Annotation save result', { data: data ? { id: data.id, start: data.position_start, end: data.position_end } : null, error })

      if (!error && data) {
        setAnnotations((prev) => {
          const next = [...prev, data]
          console.log('[CCP Debug] Annotations state updated, count:', next.length)
          return next
        })
        setSelection(null)
        setShowAnnotatePopover(false)
        setShowToolbar(false)
        window.getSelection()?.removeAllRanges()
        setToast({ message: 'Annotation saved', type: 'success' })
      } else if (error) {
        console.error('[CCP Debug] Annotation save FAILED', error)
        setToast({ message: 'Failed to save annotation', type: 'error' })
      }
    },
    [selection, userId, chapter.id, chapter.content]
  )

  /** Click on an annotated segment */
  const handleAnnotationClick = useCallback((anns: Annotation[]) => {
    console.log('[CCP Debug] Annotation highlight clicked', { count: anns.length, ids: anns.map(a => a.id) })
    if (anns.length > 0) {
      setActiveAnnotation(anns[0])
      setShowAnnotatePopover(false)
      setSelection(null)
    }
  }, [])

  /** Open the annotation popover from toolbar */
  const handleAnnotateFromToolbar = useCallback(() => {
    console.log('[CCP Debug] Annotate button clicked, selection:', selection ? { text: selection.text.slice(0, 40), start: selection.start, end: selection.end } : null)
    setShowToolbar(false)
    setShowAnnotatePopover(true)
  }, [selection])

  /** Navigate to thread creation with selected quote */
  const handleStartThread = useCallback(() => {
    if (!selection) return
    const quote = selection.text.length > 200
      ? selection.text.slice(0, 200) + '…'
      : selection.text
    // Encode selected text as a URL param for the thread form
    const params = new URLSearchParams({
      type: 'passage_pick',
      quote,
      chapter: String(chapter.chapter_number),
      section: chapter.title,
    })
    router.push(`/threads/new?${params.toString()}`)
  }, [selection, chapter.chapter_number, chapter.title, router])

  // Split text into paragraphs and render with annotations
  const paragraphs = chapter.content.split('\n\n')
  let charOffset = 0

  // Filter annotations in focused mode
  const displayAnnotations = focusedMode ? [] : annotations

  return (
    <div className="relative">
      {/* Onboarding hint — only shown on first visit */}
      <OnboardingHint />

      {/* Reading controls (font size, focused mode) */}
      <ReadingControls
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        focusedMode={focusedMode}
        onFocusedModeChange={setFocusedMode}
        annotationCount={annotations.length}
      />

      {/* The reading text */}
      <div
        ref={textRef}
        className="reading-text"
        onMouseUp={handleMouseUp}
        style={{ fontSize: `${fontSize / 16}rem` }}
      >
        {paragraphs.map((paragraph, pIdx) => {
          const pStart = charOffset
          const pEnd = charOffset + paragraph.length
          charOffset = pEnd + 2 // +2 for the \n\n

          // Get annotations that overlap this paragraph
          const pAnnotations = displayAnnotations.filter(
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
              {/* Margin controls */}
              <div className="absolute -left-16 top-1 flex gap-1 items-center opacity-40 group-hover/para:opacity-100 transition-opacity hidden lg:flex">
                {/* Confusion flag button */}
                <ConfusionFlagButton
                  chapterId={chapter.id}
                  paragraphIndex={pIdx}
                  initialCount={confusionFlagCounts.get(pIdx) || 0}
                  isUserFlagged={userConfusionFlags.has(pIdx)}
                  hidden={focusedMode}
                />

                {/* Annotation count indicator */}
                {annotationCount > 0 && (
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{
                      backgroundColor: annotationCount > 2 ? 'var(--color-muted-gold)' : '#e8ddd0',
                      color: 'var(--color-dark-brown)',
                    }}
                    title={`${annotationCount} annotation${annotationCount > 1 ? 's' : ''}`}
                  >
                    {annotationCount}
                  </span>
                )}
              </div>
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

      {/* Floating selection toolbar */}
      {showToolbar && selection && !showAnnotatePopover && (
        <SelectionToolbar
          rect={selection.rect}
          onAnnotate={handleAnnotateFromToolbar}
          onStartThread={handleStartThread}
          onClose={() => {
            setShowToolbar(false)
            setSelection(null)
            window.getSelection()?.removeAllRanges()
          }}
        />
      )}

      {/* Annotation creation popover */}
      {showAnnotatePopover && selection && (
        <AnnotationPopover
          rect={selection.rect}
          selectedText={selection.text}
          onSave={handleSaveAnnotation}
          onCancel={() => {
            setShowAnnotatePopover(false)
            setShowToolbar(false)
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

      {/* Success/error toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
