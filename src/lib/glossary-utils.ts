/**
 * Glossary utilities for term matching and detection
 * Optimized: pre-compiles a single regex from all terms for O(n) matching
 */

export interface GlossaryTerm {
  id: string
  term: string
  definition: string
}

export interface TermMatch {
  term: string
  definition: string
  start: number
  end: number
}

/**
 * Finds all matches of glossary terms in text (case-insensitive, whole-word)
 * Uses a single compiled regex for all terms — much faster than searching each term individually.
 * Returns matches sorted by position in text.
 */
export function findGlossaryTermMatches(
  text: string,
  glossaryTerms: GlossaryTerm[]
): TermMatch[] {
  if (glossaryTerms.length === 0 || !text) return []

  // Sort terms by length (longest first) so longer matches take priority
  const sortedTerms = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length)

  // Build a single regex that matches any glossary term with word boundaries
  // Escape special regex characters in terms
  const escapedTerms = sortedTerms.map((t) =>
    t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )

  // Use word boundaries for whole-word matching
  const pattern = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi')

  // Build a lookup map from lowercase term -> original glossary entry
  const termLookup = new Map<string, GlossaryTerm>()
  for (const gt of sortedTerms) {
    const key = gt.term.toLowerCase()
    if (!termLookup.has(key)) {
      termLookup.set(key, gt)
    }
  }

  const matches: TermMatch[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const matchedText = match[1].toLowerCase()
    const glossaryEntry = termLookup.get(matchedText)

    if (glossaryEntry) {
      const start = match.index
      const end = start + match[0].length

      // Check for overlap with existing matches (longer terms win)
      const isOverlapping = matches.some(
        (m) => start < m.end && end > m.start
      )

      if (!isOverlapping) {
        matches.push({
          term: glossaryEntry.term,
          definition: glossaryEntry.definition,
          start,
          end,
        })
      }
    }
  }

  // Sort by position
  matches.sort((a, b) => a.start - b.start)
  return matches
}

/**
 * Split text into segments with glossary term information
 */
export function buildGlossarySegments(
  text: string,
  matches: TermMatch[]
): {
  start: number
  end: number
  text: string
  isGlossaryTerm: boolean
  termData?: { term: string; definition: string }
}[] {
  if (matches.length === 0) {
    return [{ start: 0, end: text.length, text, isGlossaryTerm: false }]
  }

  const segments: {
    start: number
    end: number
    text: string
    isGlossaryTerm: boolean
    termData?: { term: string; definition: string }
  }[] = []

  let currentPos = 0

  for (const match of matches) {
    if (currentPos < match.start) {
      segments.push({
        start: currentPos,
        end: match.start,
        text: text.slice(currentPos, match.start),
        isGlossaryTerm: false,
      })
    }

    segments.push({
      start: match.start,
      end: match.end,
      text: text.slice(match.start, match.end),
      isGlossaryTerm: true,
      termData: { term: match.term, definition: match.definition },
    })

    currentPos = match.end
  }

  if (currentPos < text.length) {
    segments.push({
      start: currentPos,
      end: text.length,
      text: text.slice(currentPos),
      isGlossaryTerm: false,
    })
  }

  return segments
}
