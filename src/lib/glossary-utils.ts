/**
 * Glossary utilities for term matching and detection
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
 * Returns matches sorted by position in text
 */
export function findGlossaryTermMatches(
  text: string,
  glossaryTerms: GlossaryTerm[]
): TermMatch[] {
  const matches: TermMatch[] = []

  // Sort terms by length (longest first) to match longer terms before shorter ones
  const sortedTerms = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length)

  for (const glossaryTerm of sortedTerms) {
    const term = glossaryTerm.term.toLowerCase()
    let searchText = text.toLowerCase()
    let startIndex = 0

    // Find all occurrences of this term in the text
    while (startIndex < searchText.length) {
      const index = searchText.indexOf(term, startIndex)
      if (index === -1) break

      // Check if it's a whole word match (not part of another word)
      const charBefore = index > 0 ? text[index - 1] : ' '
      const charAfter = index + term.length < text.length ? text[index + term.length] : ' '

      // Word boundary check: must be preceded/followed by whitespace or punctuation
      const isBoundaryBefore = /\s|[^\w]|^/.test(charBefore)
      const isBoundaryAfter = /\s|[^\w]|$/.test(charAfter)

      if (isBoundaryBefore && isBoundaryAfter) {
        // Check if this position overlaps with an existing match
        const isOverlapping = matches.some(
          (match) => (index < match.end && index + term.length > match.start)
        )

        if (!isOverlapping) {
          matches.push({
            term: glossaryTerm.term,
            definition: glossaryTerm.definition,
            start: index,
            end: index + term.length,
          })
        }
      }

      startIndex = index + 1
    }
  }

  // Sort matches by position in text
  matches.sort((a, b) => a.start - b.start)

  // Remove overlapping matches (keep the first one found)
  const finalMatches: TermMatch[] = []
  for (const match of matches) {
    const hasOverlap = finalMatches.some((m) => m.start < match.end && m.end > match.start)
    if (!hasOverlap) {
      finalMatches.push(match)
    }
  }

  return finalMatches
}

/**
 * Split text into segments with glossary term information
 * Used to build rendering segments that distinguish glossary terms from regular text
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
    // Add text before the match
    if (currentPos < match.start) {
      segments.push({
        start: currentPos,
        end: match.start,
        text: text.slice(currentPos, match.start),
        isGlossaryTerm: false,
      })
    }

    // Add the matched term
    segments.push({
      start: match.start,
      end: match.end,
      text: text.slice(match.start, match.end),
      isGlossaryTerm: true,
      termData: { term: match.term, definition: match.definition },
    })

    currentPos = match.end
  }

  // Add remaining text
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
