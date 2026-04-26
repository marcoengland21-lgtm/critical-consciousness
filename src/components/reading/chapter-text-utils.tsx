/**
 * Pure helpers for rendering chapter text with annotations + footnotes +
 * glossary highlights. Extracted from ChapterReader.tsx per IMPROVEMENTS_PLAN
 * §14 — keeps the orchestrator file smaller and lets these helpers be
 * tested in isolation.
 *
 * No state, no side effects. Just data → segments → React nodes.
 */

import React from 'react'
import FootnoteInline from './FootnoteInline'

// ── Types reused across helpers + MemoizedParagraph ─────────────────────────

export interface ChapterAnnotation {
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

export interface ChapterFootnote {
  id: string
  footnote_number: number
  content: string
  author: 'marx' | 'engels'
}

export interface AnnotationSegment {
  start: number
  end: number
  text: string
  annotations: ChapterAnnotation[]
}

export interface MergedSegment {
  start: number
  end: number
  text: string
  annotations: ChapterAnnotation[]
  isGlossaryTerm: boolean
  termData?: { term: string; definition: string }
}

interface GlossarySegmentInput {
  start: number
  end: number
  text: string
  isGlossaryTerm: boolean
  termData?: { term: string; definition: string }
}

// ── snapOutsideFootnoteMarker ───────────────────────────────────────────────

/**
 * Snap a character position so it doesn't fall inside a footnote marker [N].
 * If pos is inside a marker, move it to the start of that marker.
 */
export function snapOutsideFootnoteMarker(text: string, pos: number): number {
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

// ── buildSegments ───────────────────────────────────────────────────────────

/** Split text into annotated and unannotated segments */
export function buildSegments(text: string, annotations: ChapterAnnotation[]): AnnotationSegment[] {
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
  const segments: AnnotationSegment[] = []

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

// ── buildMergedSegments ─────────────────────────────────────────────────────

/** Merge annotation and glossary segments */
export function buildMergedSegments(
  annotationSegments: AnnotationSegment[],
  glossarySegments: GlossarySegmentInput[]
): MergedSegment[] {
  const merged: MergedSegment[] = []

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

// ── renderTextWithFootnotes ─────────────────────────────────────────────────

/** Split text on footnote markers [N] and return React nodes */
export function renderTextWithFootnotes(
  text: string,
  footnoteMap: Map<number, ChapterFootnote>,
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
