/**
 * Chapter numbering utilities for Marx's Capital.
 *
 * Marx's Capital Chapter 1 has 4 sections. In the database:
 * - chapter_number 1-4 = Chapter 1, Sections 1-4
 * - chapter_number 5-36 = Chapters 2-33 (formula: marxChapter = chapterNumber - 3)
 *
 * Shared between server components (page.tsx) and client components (ReadingBubble).
 */

/** Map internal chapter_number to Marx's actual structure */
export function getChapterLabel(chapterNumber: number): { label: string; shortLabel: string } {
  if (chapterNumber <= 4) {
    return {
      label: `Chapter 1, Section ${chapterNumber}`,
      shortLabel: `Ch 1, Sec ${chapterNumber}`,
    }
  }
  const marxChapter = chapterNumber - 3
  return {
    label: `Chapter ${marxChapter}`,
    shortLabel: `Ch ${marxChapter}`,
  }
}

/** Get the Part number for a given internal chapter_number */
export function getPartNumber(chapterNumber: number): number {
  const marxChapter = chapterNumber <= 4 ? 1 : chapterNumber - 3
  if (marxChapter <= 3) return 1
  if (marxChapter <= 6) return 2
  if (marxChapter <= 10) return 3
  if (marxChapter <= 15) return 4
  if (marxChapter <= 18) return 5
  if (marxChapter <= 22) return 6
  if (marxChapter <= 25) return 7
  return 8
}

/** Part titles from Capital's structure */
export const partTitles: Record<number, string> = {
  1: 'Commodities and Money',
  2: 'Transformation of Money into Capital',
  3: 'Production of Absolute Surplus-Value',
  4: 'Production of Relative Surplus-Value',
  5: 'Production of Absolute and Relative Surplus-Value',
  6: 'Wages',
  7: 'The Process of Accumulation of Capital',
  8: 'So-Called Primitive Accumulation',
}
