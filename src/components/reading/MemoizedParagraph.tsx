'use client'

/**
 * MemoizedParagraph — a single paragraph in a chapter, with annotations,
 * glossary highlights, footnote markers, and a confusion-flag heatmap strip.
 *
 * Extracted from ChapterReader.tsx per IMPROVEMENTS_PLAN §14. Rendering logic
 * unchanged — this is a pure file split.
 */

import React, { memo } from 'react'
import ConfusionHeatmap from './ConfusionHeatmap'
import {
  buildSegments,
  buildMergedSegments,
  renderTextWithFootnotes,
  type ChapterAnnotation,
  type ChapterFootnote,
} from './chapter-text-utils'
import { findGlossaryTermMatches, buildGlossarySegments, type GlossaryTerm } from '@/lib/glossary-utils'

interface ParagraphProps {
  pIdx: number
  paragraph: string
  pStart: number
  pEnd: number
  annotations: ChapterAnnotation[]
  glossaryTerms: GlossaryTerm[]
  footnoteMap: Map<number, ChapterFootnote>
  focusedMode: boolean
  chapterId: string
  confusionCount: number
  isUserFlagged: boolean
  keywordFilter: { matching: Set<string> }
  showKeywordStats: boolean
  footnotesExpanded: boolean
  onAnnotationClick: (anns: ChapterAnnotation[]) => void
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

export default MemoizedParagraph
