'use client'

import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AnnotationPopover from './AnnotationPopover'
import AnnotationPanel from './AnnotationPanel'
import SelectionToolbar from './SelectionToolbar'
import OnboardingHint from './OnboardingHint'
import ReadingToolbar from './ReadingToolbar'
import ConfusionHeatmap from './ConfusionHeatmap'
import ReadingPresence from './ReadingPresence'
import GlossaryTooltip from './GlossaryTooltip'
import GlossaryQuickAccess from './GlossaryQuickAccess'
import FootnoteInline from './FootnoteInline'
import Toast from '@/components/ui/Toast'
import BackToTop from './BackToTop'
import ReadingGuide from './ReadingGuide'
import AudioPlayer from './AudioPlayer'
import type { AudioAlignment } from '@/lib/audio-alignments'
import { getConfusionFlagCounts, getUserConfusionFlags } from '@/lib/confusion-flags'
import { findGlossaryTermMatches, buildGlossarySegments, findChapterGlossaryTerms, GlossaryTerm, GlossaryTermWithCount, TermMatch } from '@/lib/glossary-utils'
import { useScrollPersistence } from '@/hooks/useScrollPersistence'

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

interface Footnote {
  id: string
  footnote_number: number
  content: string
  author: 'marx' | 'engels'
}

interface Props {
  chapter: Chapter
  annotations: Annotation[]
  footnotes: Footnote[]
  glossaryTerms: GlossaryTerm[]
  userId: string | null
  documentSlug: string
  allChapters: { chapter_number: number; title: string }[]
  currentIndex: number
  audioAlignment?: AudioAlignment | null
}

// Guest ID for unauthenticated annotation
const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

const isDev = process.env.NODE_ENV === 'development'

// How many paragraphs to render immediately (above the fold)
const INITIAL_RENDER_COUNT = 25

/**
 * Snap a character position so it doesn't fall inside a footnote marker [N].
 * If pos is inside a marker, move it to the start of that marker.
 * This prevents annotation boundaries from splitting footnote markers across segments.
 */
function snapOutsideFootnoteMarker(text: string, pos: number): number {
  // Look backwards from pos for an unclosed '['
  for (let i = pos - 1; i >= Math.max(0, pos - 5); i--) {
    if (text[i] === '[') {
      // Check if there's a closing ']' after pos
      const closingIdx = text.indexOf(']', i)
      if (closingIdx >= pos) {
        // pos is inside [N] — check it's actually a footnote marker
        const inner = text.slice(i + 1, closingIdx)
        if (/^\d+$/.test(inner)) {
          return i // snap to before the '['
        }
      }
      break
    }
    if (text[i] === ']') break // we're past any marker
  }
  return pos
}

/** Split text into annotated and unannotated segments */
function buildSegments(
  text: string,
  annotations: Annotation[]
): { start: number; end: number; text: string; annotations: Annotation[] }[] {
  if (annotations.length === 0) {
    return [{ start: 0, end: text.length, text, annotations: [] }]
  }

  const boundaries = new Set<number>()
  boundaries.add(0)
  boundaries.add(text.length)

  for (const ann of annotations) {
    // Snap boundaries so they don't split footnote markers like [1]
    boundaries.add(Math.max(0, snapOutsideFootnoteMarker(text, ann.position_start)))
    boundaries.add(Math.min(text.length, snapOutsideFootnoteMarker(text, ann.position_end)))
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  const segments: { start: number; end: number; text: string; annotations: Annotation[] }[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    const segText = text.slice(start, end)

    const covering = annotations.filter(
      (a) => a.position_start <= start && a.position_end >= end
    )

    segments.push({ start, end, text: segText, annotations: covering })
  }

  return segments
}

/** Merge annotation and glossary segments */
function buildMergedSegments(
  annotationSegments: { start: number; end: number; text: string; annotations: Annotation[] }[],
  glossarySegments: {
    start: number
    end: number
    text: string
    isGlossaryTerm: boolean
    termData?: { term: string; definition: string }
  }[]
): {
  start: number
  end: number
  text: string
  annotations: Annotation[]
  isGlossaryTerm: boolean
  termData?: { term: string; definition: string }
}[] {
  const merged: {
    start: number
    end: number
    text: string
    annotations: Annotation[]
    isGlossaryTerm: boolean
    termData?: { term: string; definition: string }
  }[] = []

  const boundaries = new Set<number>()
  for (const seg of annotationSegments) {
    boundaries.add(seg.start)
    boundaries.add(seg.end)
  }
  for (const seg of glossarySegments) {
    boundaries.add(seg.start)
    boundaries.add(seg.end)
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b)

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]

    const overlapAnnotation = annotationSegments.find((s) => s.start <= start && s.end >= end)
    const overlapGlossary = glossarySegments.find((s) => s.start <= start && s.end >= end)

    const text = annotationSegments[0].text.slice(start, end) || glossarySegments[0].text.slice(start, end)

    merged.push({
      start,
      end,
      text,
      annotations: overlapAnnotation?.annotations || [],
      isGlossaryTerm: overlapGlossary?.isGlossaryTerm || false,
      termData: overlapGlossary?.termData,
    })
  }

  return merged
}

/** Split text on footnote markers [N] and return React nodes */
function renderTextWithFootnotes(
  text: string,
  footnoteMap: Map<number, Footnote>,
  keyPrefix: string,
  footnotesExpanded?: boolean
): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /\[(\d+)\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const fnNum = parseInt(match[1], 10)
    const footnote = footnoteMap.get(fnNum)

    if (footnote) {
      parts.push(
        <FootnoteInline
          key={`${keyPrefix}-fn-${fnNum}`}
          number={fnNum}
          content={footnote.content}
          author={footnote.author}
          forceOpen={footnotesExpanded}
        />
      )
    } else {
      parts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

// ====================================================================
// Memoized paragraph component — only re-renders when its own props change
// This is the key performance optimization: when you open a tooltip,
// change font size, or type a keyword, paragraphs that didn't change
// won't re-render their expensive segment/glossary/footnote logic.
// ====================================================================
interface ParagraphProps {
  pIdx: number
  paragraph: string
  pStart: number
  pEnd: number
  annotations: Annotation[]
  glossaryTerms: GlossaryTerm[]
  footnoteMap: Map<number, Footnote>
  focusedMode: boolean
  chapterId: string
  confusionCount: number
  isUserFlagged: boolean
  keywordFilter: { matching: Set<string> }
  showKeywordStats: boolean
  footnotesExpanded: boolean
  onAnnotationClick: (anns: Annotation[]) => void
  onGlossaryTermClick: (term: string, definition: string, event: React.MouseEvent) => void
}

const MemoizedParagraph = memo(function Paragraph({
  pIdx,
  paragraph,
  pStart,
  pEnd,
  annotations: displayAnnotations,
  glossaryTerms,
  footnoteMap,
  focusedMode,
  chapterId,
  confusionCount,
  isUserFlagged,
  keywordFilter,
  showKeywordStats,
  footnotesExpanded,
  onAnnotationClick,
  onGlossaryTermClick,
}: ParagraphProps) {
  // Get annotations that overlap this paragraph
  const pAnnotations = displayAnnotations.filter(
    (a) => a.position_start < pEnd && a.position_end > pStart
  )

  // Find glossary terms in this paragraph
  const glossaryMatches = focusedMode ? [] : findGlossaryTermMatches(paragraph, glossaryTerms)

  // Build segments
  const annotationSegments = buildSegments(
    paragraph,
    pAnnotations.map((a) => ({
      ...a,
      position_start: Math.max(a.position_start - pStart, 0),
      position_end: Math.min(a.position_end - pStart, paragraph.length),
    }))
  )

  const glossarySegments = buildGlossarySegments(paragraph, glossaryMatches)
  const mergedSegments = buildMergedSegments(annotationSegments, glossarySegments)

  const annotationCount = pAnnotations.length

  return (
    <p data-offset={pStart} className="relative group/para">
      {/* Confusion heatmap margin — warm strip showing collective struggle */}
      <ConfusionHeatmap
        chapterId={chapterId}
        paragraphIndex={pIdx}
        initialCount={confusionCount}
        isUserFlagged={isUserFlagged}
        hidden={focusedMode}
      />

      {/* Annotation count badge — shown in left margin on desktop */}
      {annotationCount > 0 && !focusedMode && (
        <span
          className="absolute -left-14 top-1 hidden lg:flex w-6 h-6 rounded-full items-center justify-center text-xs font-medium opacity-40 group-hover/para:opacity-100 transition-opacity"
          style={{
            backgroundColor: annotationCount > 2 ? 'var(--accent-purple)' : 'var(--bg-soft)',
            color: annotationCount > 2 ? 'var(--text-inverse)' : 'var(--text-primary)',
          }}
          title={`${annotationCount} annotation${annotationCount > 1 ? 's' : ''}`}
        >
          {annotationCount}
        </span>
      )}

      {mergedSegments.map((seg, sIdx) => {
        // Glossary term only
        if (seg.isGlossaryTerm && seg.annotations.length === 0 && seg.termData) {
          return (
            <span
              key={sIdx}
              className="cursor-help rounded-sm transition-colors duration-150 hover:bg-[rgba(var(--accent-purple-rgb),0.08)]"
              style={{ color: 'inherit' }}
              onClick={(e) => onGlossaryTermClick(seg.termData!.term, seg.termData!.definition, e)}
              title={`Click to see definition of "${seg.termData.term}"`}
            >
              {renderTextWithFootnotes(seg.text, footnoteMap, `p${pIdx}-s${sIdx}`, footnotesExpanded)}
            </span>
          )
        }

        // Annotation highlight
        if (seg.annotations.length > 0) {
          const globalAnns = seg.annotations.map((localAnn) => {
            return pAnnotations.find(
              (a) =>
                a.position_start <= pStart + localAnn.position_start &&
                a.position_end >= pStart + localAnn.position_end
            )!
          }).filter(Boolean)

          const density = globalAnns.length

          if (seg.isGlossaryTerm && seg.termData) {
            const isMatchingAnnotation = globalAnns.some((ann) => keywordFilter.matching.has(ann.id))
            return (
              <mark
                key={sIdx}
                className={`${density > 1 ? 'annotation-highlight-dense' : 'annotation-highlight'} cursor-pointer`}
                style={{
                  opacity: showKeywordStats && !isMatchingAnnotation ? 0.2 : undefined,
                  transition: 'opacity 200ms ease',
                }}
                onClick={(e) => {
                  if (e.detail === 1) {
                    onGlossaryTermClick(seg.termData!.term, seg.termData!.definition, e)
                  }
                }}
                title={`${density} annotation${density > 1 ? 's' : ''}; Click to see glossary definition of "${seg.termData.term}"`}
              >
                {renderTextWithFootnotes(seg.text, footnoteMap, `p${pIdx}-s${sIdx}`, footnotesExpanded)}
              </mark>
            )
          }

          const isMatchingAnnotation = globalAnns.some((ann) => keywordFilter.matching.has(ann.id))
          return (
            <mark
              key={sIdx}
              className={density > 1 ? 'annotation-highlight-dense' : 'annotation-highlight'}
              onClick={() => onAnnotationClick(globalAnns)}
              title={`${density} annotation${density > 1 ? 's' : ''}`}
              style={{
                opacity: showKeywordStats && !isMatchingAnnotation ? 0.2 : undefined,
                transition: 'opacity 200ms ease',
              }}
            >
              {renderTextWithFootnotes(seg.text, footnoteMap, `p${pIdx}-s${sIdx}`, footnotesExpanded)}
            </mark>
          )
        }

        // Regular text
        return <span key={sIdx}>{renderTextWithFootnotes(seg.text, footnoteMap, `p${pIdx}-s${sIdx}`, footnotesExpanded)}</span>
      })}
    </p>
  )
})

// ====================================================================
// Main ChapterReader component
// ====================================================================
export default function ChapterReader({ chapter, annotations: initialAnnotations, footnotes, glossaryTerms: initialGlossaryTerms, userId, documentSlug, allChapters, currentIndex, audioAlignment }: Props) {

  const router = useRouter()
  useScrollPersistence(chapter.chapter_number)
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
  const [focusedMode, setFocusedMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ccp-focused-mode') === 'true'
    }
    return false
  })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confusionFlagCounts, setConfusionFlagCounts] = useState<Map<number, number>>(new Map())
  const [userConfusionFlags, setUserConfusionFlags] = useState<Set<number>>(new Set())
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>(initialGlossaryTerms)
  const [glossaryTooltip, setGlossaryTooltip] = useState<{
    term: string
    definition: string
    position: { top: number; left: number }
  } | null>(null)
  const [annotationKeyword, setAnnotationKeyword] = useState('')
  const [showGlossaryPanel, setShowGlossaryPanel] = useState(false)
  const [renderedCount, setRenderedCount] = useState(INITIAL_RENDER_COUNT)
  const [footnotesExpanded, setFootnotesExpanded] = useState(false)
  const [audioIsPlaying, setAudioIsPlaying] = useState(false)
  const audioParagraphRef = useRef<HTMLElement | null>(null)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [showSlimBar, setShowSlimBar] = useState(false)
  const titleObserverRef = useRef<IntersectionObserver | null>(null)
  const slimBarTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Audio paragraph highlight ──
  // When the audio player reports a new paragraph, highlight it with a
  // left border (same visual language as the reading pacer) and auto-scroll.
  const handleAudioParagraphChange = useCallback((paragraphIndex: number | null) => {
    // Clear previous highlight
    if (audioParagraphRef.current) {
      audioParagraphRef.current.style.removeProperty('border-left')
      audioParagraphRef.current.style.removeProperty('padding-left')
      audioParagraphRef.current.style.removeProperty('transition')
      audioParagraphRef.current.style.removeProperty('background-color')
      audioParagraphRef.current = null
    }

    if (paragraphIndex === null || !textRef.current) return

    // Find the paragraph element by index
    const paragraphs = textRef.current.querySelectorAll(':scope > p')
    const paraEl = paragraphs[paragraphIndex] as HTMLElement | undefined
    if (!paraEl) return

    // Apply highlight
    paraEl.style.transition = 'border-left var(--duration-normal) var(--ease-out-expo), padding-left var(--duration-normal) var(--ease-out-expo), background-color var(--duration-normal) var(--ease-out-expo)'
    paraEl.style.borderLeft = '3px solid var(--accent-purple)'
    paraEl.style.paddingLeft = '1rem'
    paraEl.style.backgroundColor = 'color-mix(in srgb, var(--accent-purple) 5%, transparent)'
    audioParagraphRef.current = paraEl

    // Auto-scroll to keep paragraph visible
    const rect = paraEl.getBoundingClientRect()
    const viewportH = window.innerHeight
    const targetZone = viewportH * 0.33 // top third
    if (rect.top > viewportH * 0.7 || rect.top < 60) {
      const scrollTarget = window.scrollY + rect.top - targetZone
      window.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' })
    }
  }, [])

  // Clean up audio highlight on unmount
  useEffect(() => {
    return () => {
      if (audioParagraphRef.current) {
        audioParagraphRef.current.style.removeProperty('border-left')
        audioParagraphRef.current.style.removeProperty('padding-left')
        audioParagraphRef.current.style.removeProperty('transition')
        audioParagraphRef.current.style.removeProperty('background-color')
      }
    }
  }, [])

  // Build footnote lookup map
  const footnoteMap = useMemo(() => {
    const map = new Map<number, Footnote>()
    for (const fn of footnotes) {
      map.set(fn.footnote_number, fn)
    }
    return map
  }, [footnotes])

  // Chapter-level glossary terms for the quick-access panel (deduplicated + sorted)
  const chapterGlossaryTerms = useMemo(
    () => findChapterGlossaryTerms(chapter.content, glossaryTerms),
    [chapter.content, glossaryTerms]
  )

  // Pre-compute paragraph splits and offsets — only recompute when content changes
  const paragraphData = useMemo(() => {
    const paragraphs = chapter.content.split('\n\n')
    const data: { text: string; start: number; end: number }[] = []
    let offset = 0
    for (const p of paragraphs) {
      data.push({ text: p, start: offset, end: offset + p.length })
      offset += p.length + 2 // +2 for \n\n
    }
    return data
  }, [chapter.content])

  // Progressive rendering: render remaining paragraphs after initial paint
  useEffect(() => {
    if (renderedCount >= paragraphData.length) return

    // Use requestIdleCallback (or setTimeout fallback) to render more paragraphs
    // without blocking the main thread
    const renderMore = () => {
      setRenderedCount((prev) => {
        const next = Math.min(prev + 50, paragraphData.length)
        return next
      })
    }

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(renderMore, { timeout: 100 })
      return () => cancelIdleCallback(id)
    } else {
      const id = setTimeout(renderMore, 16)
      return () => clearTimeout(id)
    }
  }, [renderedCount, paragraphData.length])

  // Reset rendered count when chapter changes
  useEffect(() => {
    setRenderedCount(INITIAL_RENDER_COUNT)
  }, [chapter.id])

  // Debounced scroll position memory
  useEffect(() => {
    const key = `ccp-scroll-${chapter.id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const pos = parseInt(saved, 10)
      setTimeout(() => window.scrollTo(0, pos), 100)
    }

    let rafId: number | null = null
    function saveScroll() {
      if (rafId) return // Skip if already queued
      rafId = requestAnimationFrame(() => {
        localStorage.setItem(key, String(window.scrollY))
        rafId = null
      })
    }
    window.addEventListener('scroll', saveScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', saveScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [chapter.id])

  // Save font size preference
  useEffect(() => {
    localStorage.setItem('ccp-font-size', String(fontSize))
  }, [fontSize])

  // Save focused mode preference + close glossary panel
  useEffect(() => {
    localStorage.setItem('ccp-focused-mode', String(focusedMode))
    if (focusedMode) setShowGlossaryPanel(false)
  }, [focusedMode])

  // Load confusion flags on mount
  useEffect(() => {
    async function loadConfusionFlags() {
      try {
        const counts = await getConfusionFlagCounts(chapter.id)
        setConfusionFlagCounts(counts)
        const userFlags = await getUserConfusionFlags(chapter.id)
        setUserConfusionFlags(userFlags)
      } catch (error) {
        console.error('[CCP] Failed to load confusion flags:', error)
      }
    }
    loadConfusionFlags()
  }, [chapter.id])



  // ── Slim top bar: appears when title scrolls out of view ──
  useEffect(() => {
    const titleEl = document.querySelector('[data-chapter-title]')
    if (!titleEl) return

    titleObserverRef.current = new IntersectionObserver(
      ([entry]) => {
        // Title not visible → show slim bar
        if (!entry.isIntersecting) {
          setShowSlimBar(true)
        } else {
          setShowSlimBar(false)
        }
      },
      { threshold: 0 }
    )
    titleObserverRef.current.observe(titleEl)

    return () => {
      titleObserverRef.current?.disconnect()
    }
  }, [])

  // Clean up slim bar timer on unmount
  useEffect(() => {
    return () => {
      if (slimBarTimerRef.current) clearTimeout(slimBarTimerRef.current)
    }
  }, [])

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
          if (isDev) console.log('[CCP] Realtime annotation change', payload.eventType)
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
          table: 'confusion_counts',
          filter: `chapter_id=eq.${chapter.id}`,
        },
        async () => {
          if (isDev) console.log('[CCP] Confusion flag change')
          try {
            const counts = await getConfusionFlagCounts(chapter.id)
            setConfusionFlagCounts(counts)
          } catch (error) {
            console.error('[CCP] Failed to refresh confusion flags:', error)
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

  /** Handle text selection */
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !textRef.current) {
      if (!activeAnnotation && !showAnnotatePopover) {
        setSelection(null)
        setShowToolbar(false)
      }
      return
    }

    const range = sel.getRangeAt(0)

    if (!textRef.current.contains(range.startContainer) || !textRef.current.contains(range.endContainer)) {
      return
    }

    const text = sel.toString().trim()
    if (!text || text.length < 3) return

    const start = getCharOffset(range.startContainer, range.startOffset)
    const end = getCharOffset(range.endContainer, range.endOffset)
    const rect = range.getBoundingClientRect()

    if (isDev) console.log('[CCP] Text selected', { start, end })
    setSelection({ text, start, end, rect })
    setShowToolbar(true)
    setShowAnnotatePopover(false)
    setActiveAnnotation(null)
  }, [getCharOffset, activeAnnotation, showAnnotatePopover])

  /** Save a new annotation */
  const handleSaveAnnotation = useCallback(
    async (body: string) => {
      if (!selection) {
        if (isDev) console.log('[CCP] No selection for annotation')
        return
      }

      const supabase = createClient()
      const authorId = userId || GUEST_ID
      const content = chapter.content

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
      if (isDev) console.log('[CCP] Inserting annotation')

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

      if (isDev) console.log('[CCP] Annotation saved', data?.id)

      if (!error && data) {
        setAnnotations((prev) => {
          const next = [...prev, data]
          if (isDev) console.log('[CCP] Annotations:', next.length)
          return next
        })
        setSelection(null)
        setShowAnnotatePopover(false)
        setShowToolbar(false)
        window.getSelection()?.removeAllRanges()
        setToast({ message: 'Annotation saved', type: 'success' })
      } else if (error) {
        console.error('[CCP] Annotation save failed', error)
        setToast({ message: 'Failed to save annotation', type: 'error' })
      }
    },
    [selection, userId, chapter.id, chapter.content]
  )

  /** Click on an annotated segment */
  const handleAnnotationClick = useCallback((anns: Annotation[]) => {
    if (isDev) console.log('[CCP] Annotation clicked', anns.length)
    if (anns.length > 0) {
      setActiveAnnotation(anns[0])
      setShowAnnotatePopover(false)
      setSelection(null)
    }
  }, [])

  /** Handle glossary term click */
  const handleGlossaryTermClick = useCallback(
    (term: string, definition: string, event: React.MouseEvent) => {
      event.stopPropagation()
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      // getBoundingClientRect() returns viewport-relative coords, which is what
      // position:fixed needs — no scrollY/scrollX offset
      setGlossaryTooltip({
        term,
        definition,
        position: {
          top: rect.bottom + 8,
          left: rect.left,
        },
      })
    },
    []
  )

  /** Open the annotation popover from toolbar */
  const handleAnnotateFromToolbar = useCallback(() => {
    if (isDev) console.log('[CCP] Annotate clicked')
    setShowToolbar(false)
    setShowAnnotatePopover(true)
  }, [selection])

  /** Navigate to thread creation with selected quote */
  const handleStartThread = useCallback(() => {
    if (!selection) return
    const quote = selection.text.length > 200
      ? selection.text.slice(0, 200) + '…'
      : selection.text
    const params = new URLSearchParams({
      type: 'passage_pick',
      quote,
      chapter: String(chapter.chapter_number),
      section: chapter.title,
    })
    router.push(`/threads/new?${params.toString()}`)
  }, [selection, chapter.chapter_number, chapter.title, router])

  // Filter annotations in focused mode
  const displayAnnotations = focusedMode ? [] : annotations

  // Memoize keyword filter
  const keywordFilter = useMemo(() => {
    if (!annotationKeyword.trim()) {
      return { matching: new Set(displayAnnotations.map((a) => a.id)), total: displayAnnotations.length }
    }
    const keyword = annotationKeyword.toLowerCase()
    const matching = new Set<string>()
    displayAnnotations.forEach((ann) => {
      if (ann.body.toLowerCase().includes(keyword)) {
        matching.add(ann.id)
      }
    })
    return { matching, total: displayAnnotations.length }
  }, [displayAnnotations, annotationKeyword])

  const matchingCount = keywordFilter.matching.size
  const showKeywordStats = annotationKeyword.trim().length > 0

  // Only render up to renderedCount paragraphs (progressive rendering)
  const visibleParagraphs = paragraphData.slice(0, renderedCount)
  const hasMore = renderedCount < paragraphData.length

  return (
    <div className="relative">
      {/* Onboarding hint */}
      <OnboardingHint />

      {/* Reading presence — subtle inline text, not a full banner */}
      {!focusedMode && (
        <ReadingPresence chapterId={chapter.id} />
      )}

      {/* Audio player — LibriVox recordings with synced paragraph highlighting */}
      {audioAlignment && !focusedMode && (
        <div className="mb-6">
          <AudioPlayer
            alignment={audioAlignment}
            onParagraphChange={handleAudioParagraphChange}
            onPlayStateChange={(playing) => {
              setAudioIsPlaying(playing)
              // Auto-expand footnotes when audio starts playing
              if (playing) setFootnotesExpanded(true)
            }}
            footnotesExpanded={footnotesExpanded}
            onFootnotesToggle={() => setFootnotesExpanded(prev => !prev)}
          />
        </div>
      )}

      {/* The reading text */}
      <div
        ref={textRef}
        className="reading-text"
        onMouseUp={handleMouseUp}
        style={{ fontSize: `${fontSize / 16}rem` }}
      >
        {visibleParagraphs.map((pData, pIdx) => (
          <MemoizedParagraph
            key={pIdx}
            pIdx={pIdx}
            paragraph={pData.text}
            pStart={pData.start}
            pEnd={pData.end}
            annotations={displayAnnotations}
            glossaryTerms={glossaryTerms}
            footnoteMap={footnoteMap}
            focusedMode={focusedMode}
            chapterId={chapter.id}
            confusionCount={confusionFlagCounts.get(pIdx) || 0}
            isUserFlagged={userConfusionFlags.has(pIdx)}
            keywordFilter={keywordFilter}
            showKeywordStats={showKeywordStats}
            footnotesExpanded={footnotesExpanded}
            onAnnotationClick={handleAnnotationClick}
            onGlossaryTermClick={handleGlossaryTermClick}
          />
        ))}

        {/* Loading indicator while more paragraphs render */}
        {hasMore && (
          <div className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-xs">Loading remaining text…</span>
          </div>
        )}
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

      {/* Glossary quick-access panel — slides in from left */}
      {showGlossaryPanel && !focusedMode && (
        <GlossaryQuickAccess
          terms={chapterGlossaryTerms}
          onTermClick={(term, definition) => {
            setShowGlossaryPanel(false)
            // Show the tooltip centered in the viewport
            setGlossaryTooltip({
              term,
              definition,
              position: {
                top: Math.min(window.innerHeight / 3, window.innerHeight - 300),
                left: Math.max(16, window.innerWidth / 2 - 150),
              },
            })
          }}
          onClose={() => setShowGlossaryPanel(false)}
        />
      )}

      {/* Glossary tooltip */}
      {glossaryTooltip && (
        <GlossaryTooltip
          term={glossaryTooltip.term}
          definition={glossaryTooltip.definition}
          position={glossaryTooltip.position}
          onClose={() => setGlossaryTooltip(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Slim top bar — appears when title scrolls out of view */}
      {showSlimBar && !focusedMode && (
        <div
          className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 animate-fade-in"
          style={{
            height: '36px',
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-default)',
            marginLeft: 'var(--sidebar-width, 0px)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <span
            className="text-xs font-medium truncate"
            style={{ color: 'var(--text-secondary)', fontFamily: "'Lora', Georgia, serif" }}
          >
            {chapter.title}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
            {annotations.length > 0 && `${annotations.length} notes`}
          </span>
        </div>
      )}

      {/* Tools button — single entry point for all reading controls */}
      {!focusedMode && (
        <button
          onClick={() => setIsToolsOpen(true)}
          className="fixed z-30 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all btn-transition"
          style={{
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          title="View settings, annotations, glossary lookup, chapter navigation"
          aria-label="Open reading workspace"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <span className="text-sm font-medium">Workspace</span>
        </button>
      )}

      {/* Labeled tools panel — slides in from right */}
      <ReadingToolbar
        chapters={allChapters}
        currentChapter={chapter.chapter_number}
        currentIndex={currentIndex}
        slug={documentSlug}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        focusedMode={focusedMode}
        onFocusedModeChange={setFocusedMode}
        annotationCount={annotations.length}
        annotationKeyword={annotationKeyword}
        onAnnotationKeywordChange={setAnnotationKeyword}
        matchingAnnotationCount={matchingCount}
        glossaryTermCount={chapterGlossaryTerms.length}
        showGlossaryPanel={showGlossaryPanel}
        onGlossaryPanelToggle={() => setShowGlossaryPanel((prev) => !prev)}
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        audioAlignment={audioAlignment}
        audioIsPlaying={audioIsPlaying}
        onAudioToggle={() => {
          // Start audio — expand the inline player
          setAudioIsPlaying(true)
        }}
      />

      {/* Back to top */}
      <BackToTop />

      {/* Reading guide — scoped to reading pages only */}
      <ReadingGuide />
    </div>
  )
}
