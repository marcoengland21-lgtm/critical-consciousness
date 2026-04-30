'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AnnotationPopover from './AnnotationPopover'
import AnnotationModal from './AnnotationModal'
import AnnotationCreatePopover from './AnnotationCreatePopover'
import SelectionActionBar from './SelectionActionBar'
import OnboardingHint from './OnboardingHint'
import ChapterTopToolbar from './ChapterTopToolbar'
import ConceptsNotesModal from './ConceptsNotesModal'
import ReadingPresence from './ReadingPresence'
import GlossaryPopover from './GlossaryPopover'
import ConfusionPopover from './ConfusionPopover'
import Toast from '@/components/ui/Toast'
import BackToTop from './BackToTop'
import ReadingGuide from './ReadingGuide'
import AudioPlayer from './AudioPlayer'
import MemoizedParagraph from './MemoizedParagraph'
import type { AudioAlignment } from '@/lib/audio-alignments'
import { getConfusionFlagCounts, getUserConfusionFlags } from '@/lib/confusion-flags'
import { findChapterGlossaryTerms, GlossaryTerm, GlossaryTermWithCount, TermMatch } from '@/lib/glossary-utils'
import { useScrollPersistence } from '@/hooks/useScrollPersistence'
import { snapOutsideFootnoteMarker } from './chapter-text-utils'

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
  /** reading_schedule.id this chapter is assigned to, if any.
      Used by the per-chapter concept slice in the Reading Workspace (§11.5). */
  week_id?: string | null
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
  /** Active group context (L1). Required for any group-scoped writes
      (annotations, confusion flags). RLS additionally enforces. */
  groupId: string
}

// Guest ID for unauthenticated annotation
const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

const isDev = process.env.NODE_ENV === 'development'

// How many paragraphs to render immediately (above the fold)
const INITIAL_RENDER_COUNT = 25

/* ── Pure text helpers (snapOutsideFootnoteMarker, buildSegments,
   buildMergedSegments, renderTextWithFootnotes) extracted to
   ./chapter-text-utils.tsx per IMPROVEMENTS_PLAN §14. snapOutsideFootnoteMarker
   is re-imported above for use in the selection-snap logic below.
   The MemoizedParagraph component is similarly extracted to
   ./MemoizedParagraph.tsx. ── */


// ====================================================================
// Main ChapterReader component
// ====================================================================
export default function ChapterReader({ chapter, annotations: initialAnnotations, footnotes, glossaryTerms: initialGlossaryTerms, userId, documentSlug, allChapters, currentIndex, audioAlignment, groupId }: Props) {

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
  // Chunk 3b piece 2c-i: annotation reading flow uses a paragraph-
  // anchored popover (preview) + a centered modal (full conversation),
  // not the old slide-over AnnotationPanel.
  const annotationAnchorRef = useRef<HTMLElement | null>(null)
  const [annotationsAtParagraph, setAnnotationsAtParagraph] = useState<Annotation[] | null>(null)
  const [annotationModal, setAnnotationModal] = useState<{
    annotation: Annotation
    paragraphIndex: number
    focusComposer: boolean
  } | null>(null)
  const [showAnnotatePopover, setShowAnnotatePopover] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)
  // Note (chunk 3a): the chapter-local font-size state was removed —
  // text-size scaling is now driven entirely by AccessibilityProvider's
  // --text-size-multiplier, which the .reading-text rule in globals.css
  // already applies. The old `ccp-font-size` localStorage key is dead;
  // ReadingToolbar's onFontSizeChange prop is gone too.
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
  // Chunk 3b piece 2b: GlossaryPopover replaces the old GlossaryTooltip
  // click-popover. State shape mirrors what the new popover needs —
  // initial term + DOM ref of the inline trigger so the <Popover>
  // primitive can anchor to it.
  const glossaryAnchorRef = useRef<HTMLElement | null>(null)
  const [glossaryPopover, setGlossaryPopover] = useState<{ term: string } | null>(null)
  // Chunk 3b piece 2b: ConfusionPopover state — paragraph index of the
  // currently-open popover, anchored via a paragraph ref captured at
  // open time (see handleOpenConfusion below).
  const confusionAnchorRef = useRef<HTMLElement | null>(null)
  const [confusionParagraphIdx, setConfusionParagraphIdx] = useState<number | null>(null)
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

  // Save focused mode preference + close glossary panel
  useEffect(() => {
    localStorage.setItem('ccp-focused-mode', String(focusedMode))
    if (focusedMode) setShowGlossaryPanel(false)
  }, [focusedMode])

  // Load confusion flags on mount
  useEffect(() => {
    async function loadConfusionFlags() {
      try {
        const counts = await getConfusionFlagCounts(chapter.id, groupId)
        setConfusionFlagCounts(counts)
        const userFlags = await getUserConfusionFlags(chapter.id, groupId)
        setUserConfusionFlags(userFlags)
      } catch (error) {
        console.error('[CCP] Failed to load confusion flags:', error)
      }
    }
    loadConfusionFlags()
  }, [chapter.id, groupId])



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
            const counts = await getConfusionFlagCounts(chapter.id, groupId)
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
  }, [chapter.id, router, groupId])

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
      if (!annotationsAtParagraph && !showAnnotatePopover) {
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
    setAnnotationsAtParagraph(null)
  }, [getCharOffset, annotationsAtParagraph, showAnnotatePopover])

  /** Save a new annotation — chunk 3b piece 2c-i: now takes an
   *  isPublic flag from the AnnotationCreatePopover's Private/Share
   *  toggle. Default behaviour is private (toggle off → false). */
  const handleSaveAnnotation = useCallback(
    async (body: string, isPublic: boolean) => {
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
        is_public: isPublic,
        // L1: scope annotation to active group; RLS enforces at DB layer.
        group_id: groupId,
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
        setToast({
          message: isPublic ? 'Annotation shared with the group' : 'Annotation saved (private)',
          type: 'success',
        })
      } else if (error) {
        console.error('[CCP] Annotation save failed', error)
        setToast({ message: 'Failed to save annotation', type: 'error' })
      }
    },
    [selection, userId, chapter.id, chapter.content, groupId]
  )

  /** Click on an annotated segment — chunk 3b piece 2c-i.
   *  Opens AnnotationPopover anchored to the paragraph that contains
   *  the click. Popover shows the most-recent annotation + "1 of N"
   *  indicator if the paragraph has more than one. */
  const handleAnnotationClick = useCallback(
    (anns: Annotation[], event: React.MouseEvent<HTMLElement>) => {
      if (isDev) console.log('[CCP] Annotation clicked', anns.length)
      if (anns.length === 0) return
      // Walk up to the paragraph element to anchor the popover.
      const paragraphEl = (event.currentTarget as HTMLElement).closest(
        '[data-paragraph-index]'
      ) as HTMLElement | null
      if (!paragraphEl) return
      const pIdxAttr = paragraphEl.dataset.paragraphIndex
      const pIdx = pIdxAttr !== undefined ? parseInt(pIdxAttr, 10) : -1
      if (pIdx < 0) return
      // Show ALL annotations on this paragraph, not just the clicked
      // segment — so the "1 of N" indicator is meaningful.
      const para = paragraphData[pIdx]
      const paragraphAnns = annotations.filter(
        (a) => a.position_start < para.end && a.position_end > para.start
      )
      annotationAnchorRef.current = paragraphEl
      setAnnotationsAtParagraph(paragraphAnns)
      setShowAnnotatePopover(false)
      setSelection(null)
    },
    [annotations, paragraphData]
  )

  /** Handle glossary term click — opens GlossaryPopover anchored to
      the inline term span (chunk 3b piece 2b). Also dismisses any
      hover tooltip (handled by Tooltip's onClick auto-dismiss). */
  const handleGlossaryTermClick = useCallback(
    (term: string, _definition: string, event: React.MouseEvent) => {
      event.stopPropagation()
      // Anchor the popover to the clicked term's DOM element. The
      // <Popover> primitive measures its rect at layout time so we
      // just need .current to point to the right element.
      glossaryAnchorRef.current = event.currentTarget as HTMLElement
      setGlossaryPopover({ term })
    },
    []
  )

  /** Handle confusion-flag click — opens ConfusionPopover anchored
      to the paragraph (chunk 3b piece 2b). The paragraph ref is
      resolved by walking up from the clicked button to the parent
      <p data-paragraph-index>. */
  const handleOpenConfusion = useCallback(
    (paragraphIndex: number, event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      // Walk up to the paragraph element that owns this confusion
      // strip — that's the anchor for the popover gutter+connector.
      const paragraphEl = (event.currentTarget as HTMLElement).closest(
        `[data-paragraph-index="${paragraphIndex}"]`
      ) as HTMLElement | null
      if (!paragraphEl) return
      confusionAnchorRef.current = paragraphEl
      setConfusionParagraphIdx(paragraphIndex)
    },
    []
  )

  /** "Start thinking together" placeholder — chunk 5 builds the real
      think-together threads. For 2b: clean toast, no params capture
      (different visibility model from regular threads — silently
      routing would create the wrong type of thread). */
  const handleStartThinkingTogether = useCallback(() => {
    setToast({
      message: 'Coming soon — think-together threads land in chunk 5',
      type: 'success',
    })
    setConfusionParagraphIdx(null)
  }, [])

  /** Open the annotation popover from toolbar */
  const handleAnnotateFromToolbar = useCallback(() => {
    if (isDev) console.log('[CCP] Annotate clicked')
    setShowToolbar(false)
    setShowAnnotatePopover(true)
  }, [selection])

  /** Resolve the paragraph index that contains a character offset.
   *  Used when "Annotate" or "Give this its own space" fires from the
   *  selection action bar — we need to know which paragraph the
   *  selection sits in so the create popover can anchor (gutter +
   *  connector) and the lineage params can carry para_index. */
  const paragraphIndexAt = useCallback(
    (charOffset: number): number => {
      for (let i = 0; i < paragraphData.length; i++) {
        if (charOffset >= paragraphData[i].start && charOffset <= paragraphData[i].end) {
          return i
        }
      }
      return 0
    },
    [paragraphData]
  )

  /** Ref-object for the AnnotationCreatePopover anchor. The paragraph
   *  element is resolved via querySelector at access time (paragraphs
   *  are rendered with data-paragraph-index). The popover primitive
   *  reads .current at layout time. */
  const createPopoverParagraphRef = useMemo(
    () => ({
      get current(): HTMLElement | null {
        if (!selection) return null
        const pIdx = paragraphIndexAt(selection.start)
        return document.querySelector(
          `[data-paragraph-index="${pIdx}"]`
        ) as HTMLElement | null
      },
      set current(_el: HTMLElement | null) {
        // No-op — ref is read-only / derived.
      },
    }),
    [selection, paragraphIndexAt]
  )

  /** Stable display number for an annotation (e.g. "#3"). Uses the
   *  chronological index across the whole chapter — order stable as
   *  new annotations are appended. Cheap O(N). */
  const getAnnotationDisplayNumber = useCallback(
    (ann: Pick<Annotation, 'id' | 'created_at'>) => {
      const sorted = [...annotations].sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      )
      const idx = sorted.findIndex((a) => a.id === ann.id)
      return idx >= 0 ? idx + 1 : annotations.length + 1
    },
    [annotations]
  )

  /** Promote the selection into a /threads/new flow with lineage URL
   *  params (chunk 3b piece 2c-i, Mars's #2 answer). 3c/3d will read
   *  these params when it builds the lineage chip — for now we just
   *  capture the data. Different param shape from the annotation
   *  modal's "Give this its own space" (started_from = selection vs
   *  annotation). */
  const handleGiveSelectionItsOwnSpace = useCallback(() => {
    if (!selection) return
    const pIdx = paragraphIndexAt(selection.start)
    const params = new URLSearchParams({
      started_from: 'selection',
      chapter_id: chapter.id,
      para_index: String(pIdx),
      quote: selection.text,
      type: 'passage_pick',
    })
    router.push(`/threads/new?${params.toString()}`)
  }, [selection, chapter.id, paragraphIndexAt, router])

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

      {/* Chapter top toolbar — gear / notebook / theme icons (chunk 3b
          piece 2a). Replaces the floating "Workspace" button at the
          bottom right. The notebook icon temporarily opens the
          existing ReadingToolbar slide-over until 2c builds the
          ConceptsNotesModal. */}
      <ChapterTopToolbar
        focusedMode={focusedMode}
        onFocusedModeChange={setFocusedMode}
        onNotebookClick={() => setIsToolsOpen(true)}
        notebookActive={isToolsOpen}
      />

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
              // Auto-expand footnotes during playback so the user reads
              // them in sync with the recording. Track audio state in
              // BOTH directions — the previous version only flipped to
              // true on play and never back, which made forceOpen on
              // FootnoteInline sticky-true after playback ended and
              // blocked the marker click from collapsing footnotes
              // (forceOpen wins over isLocalOpen). Binding to `playing`
              // means audio-stop releases the force, and per-footnote
              // marker clicks work again.
              setFootnotesExpanded(playing)
            }}
          />
        </div>
      )}

      {/* The reading text */}
      <div
        ref={textRef}
        className="reading-text"
        onMouseUp={handleMouseUp}
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
            onOpenConfusion={handleOpenConfusion}
          />
        ))}

        {/* Loading indicator while more paragraphs render */}
        {hasMore && (
          <div className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            <span className="text-xs">Loading remaining text…</span>
          </div>
        )}
      </div>

      {/* Selection action bar — chunk 3b piece 2c-i. Replaces the old
          SelectionToolbar with flip-above/flip-below logic + mobile
          vertical-stack-with-words variant. Two equal-weight actions:
          Annotate · Give this its own space. */}
      {showToolbar && selection && !showAnnotatePopover && (
        <SelectionActionBar
          rect={selection.rect}
          onAnnotate={handleAnnotateFromToolbar}
          onGiveItsOwnSpace={handleGiveSelectionItsOwnSpace}
          onClose={() => {
            setShowToolbar(false)
            setSelection(null)
            window.getSelection()?.removeAllRanges()
          }}
        />
      )}

      {/* Annotation creation popover — chunk 3b piece 2c-i. Frame 11D:
          private by default, with a "Share with group" toggle.
          Anchored to the paragraph containing the selection via the
          shared <ParagraphAnchoredPopover> primitive. */}
      <AnnotationCreatePopover
        open={showAnnotatePopover && !!selection}
        onClose={() => {
          setShowAnnotatePopover(false)
          setShowToolbar(false)
          setSelection(null)
          window.getSelection()?.removeAllRanges()
        }}
        paragraphRef={createPopoverParagraphRef}
        selectedText={selection?.text ?? ''}
        paragraphNumber={selection ? paragraphIndexAt(selection.start) + 1 : 1}
        onSave={handleSaveAnnotation}
        isGuest={!userId}
      />

      {/* Annotation read popover — chunk 3b piece 2c-i. Replaces the
          old AnnotationPanel slide-over for the inline preview. Shows
          the most-recent annotation on the clicked paragraph + a
          "1 of N" indicator if there are multiple. */}
      <AnnotationPopover
        open={!!annotationsAtParagraph}
        onClose={() => setAnnotationsAtParagraph(null)}
        paragraphRef={annotationAnchorRef}
        annotations={annotationsAtParagraph ?? []}
        annotationNumber={getAnnotationDisplayNumber}
        onReply={(ann) => {
          // Look up the full Annotation in chapter state — the popover
          // works with a narrower shape (AnnotationShape) but the
          // modal needs the full row (chapter_id, author_id, etc.).
          const full = annotations.find((a) => a.id === ann.id)
          if (!full) return
          const pIdx = paragraphIndexAt(full.position_start)
          setAnnotationsAtParagraph(null)
          setAnnotationModal({ annotation: full, paragraphIndex: pIdx, focusComposer: true })
        }}
        onOpenFull={(ann) => {
          const full = annotations.find((a) => a.id === ann.id)
          if (!full) return
          const pIdx = paragraphIndexAt(full.position_start)
          setAnnotationsAtParagraph(null)
          setAnnotationModal({ annotation: full, paragraphIndex: pIdx, focusComposer: false })
        }}
      />

      {/* Annotation modal — chunk 3b piece 2c-i. The full sit-with
          conversation surface (frame 04). Two equal-weight composer
          destinations (Reply · Give this its own space) per 04R. */}
      <AnnotationModal
        open={!!annotationModal}
        onClose={() => setAnnotationModal(null)}
        annotation={annotationModal?.annotation ?? null}
        chapterLabel={`Chapter ${chapter.chapter_number}`}
        paragraphNumber={(annotationModal?.paragraphIndex ?? 0) + 1}
        annotationNumber={
          annotationModal ? getAnnotationDisplayNumber(annotationModal.annotation) : 0
        }
        focusComposer={annotationModal?.focusComposer ?? false}
        userId={userId}
        groupId={groupId}
        onReplyAdded={() => {
          // Best-effort refresh of the chapter's annotations to pick
          // up the new reply. Realtime would do this too, but the
          // explicit refresh avoids races.
          router.refresh()
        }}
      />

      {/* Concepts & notes modal — chunk 3b piece 2c-ii. Replaces the
          old slide-over Workspace panel. Opened by the notebook icon
          in ChapterTopToolbar. Two columns at desktop, tabs at mobile.
          Concept click opens GlossaryPopover stacked above this modal
          (allowed by the stacking rule: popover-on-modal is fine). */}
      <ConceptsNotesModal
        open={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        chapterId={chapter.id}
        chapterLabel={`Chapter ${chapter.chapter_number}, §${chapter.chapter_number}`}
        userId={userId}
        groupId={groupId}
      />

      {/* Glossary popover — chunk 3b piece 2b. Opens on inline term
          click (or panel-pick); supports related-term internal
          navigation history with back arrow. */}
      <GlossaryPopover
        open={!!glossaryPopover}
        onClose={() => setGlossaryPopover(null)}
        anchor={glossaryAnchorRef}
        initialTerm={glossaryPopover?.term ?? ''}
        groupId={groupId}
      />

      {/* Confusion popover — chunk 3b piece 2b. Anchored to the
          paragraph captured at click time (paragraph DOM ref). */}
      <ConfusionPopover
        open={confusionParagraphIdx !== null}
        onClose={() => setConfusionParagraphIdx(null)}
        paragraphRef={confusionAnchorRef}
        chapterId={chapter.id}
        paragraphIndex={confusionParagraphIdx ?? 0}
        groupId={groupId}
        count={confusionParagraphIdx !== null ? confusionFlagCounts.get(confusionParagraphIdx) ?? 0 : 0}
        isUserFlagged={confusionParagraphIdx !== null && userConfusionFlags.has(confusionParagraphIdx)}
        onCountChange={(newCount, newIsSet) => {
          if (confusionParagraphIdx === null) return
          // Update the chapter-level state so the heatmap re-renders.
          setConfusionFlagCounts((prev) => {
            const next = new Map(prev)
            if (newCount === 0) next.delete(confusionParagraphIdx)
            else next.set(confusionParagraphIdx, newCount)
            return next
          })
          setUserConfusionFlags((prev) => {
            const next = new Set(prev)
            if (newIsSet) next.add(confusionParagraphIdx)
            else next.delete(confusionParagraphIdx)
            return next
          })
        }}
        onStartThinkingTogether={handleStartThinkingTogether}
      />

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

      {/* Floating Workspace button removed in chunk 3b piece 2a — gear /
          notebook icons in ChapterTopToolbar replace it. The slide-over
          ConceptsNotesModal (above) replaces the old ReadingToolbar
          slide-over. */}

      {/* Back to top */}
      <BackToTop />

      {/* Reading guide — scoped to reading pages only */}
      <ReadingGuide />
    </div>
  )
}
