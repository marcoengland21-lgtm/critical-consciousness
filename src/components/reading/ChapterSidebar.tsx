'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ChapterSidebarProps {
  chapters: { chapter_number: number; title: string }[]
  currentChapter: number
  slug: string
}

/** Map chapter_number to Marx's chapter label */
function getChapterLabel(chapterNumber: number): string {
  if (chapterNumber <= 4) return `Ch 1, \u00A7${chapterNumber}`
  return `Ch ${chapterNumber - 3}`
}

/** Map chapter_number to Part number */
function getPartNumber(chapterNumber: number): number {
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

const partTitles: Record<number, string> = {
  1: 'Commodities and Money',
  2: 'Transformation of Money into Capital',
  3: 'Production of Absolute Surplus-Value',
  4: 'Production of Relative Surplus-Value',
  5: 'Production of Absolute and Relative Surplus-Value',
  6: 'Wages',
  7: 'The Process of Accumulation of Capital',
  8: 'So-Called Primitive Accumulation',
}

export default function ChapterSidebar({ chapters, currentChapter, slug }: ChapterSidebarProps) {
  // Group chapters by part
  const parts = new Map<number, typeof chapters>()
  for (const ch of chapters) {
    const part = getPartNumber(ch.chapter_number)
    if (!parts.has(part)) parts.set(part, [])
    parts.get(part)!.push(ch)
  }

  const currentPart = getPartNumber(currentChapter)

  // Track which parts are expanded — current part open by default
  const [expandedParts, setExpandedParts] = useState<Set<number>>(() => new Set([currentPart]))

  const togglePart = (part: number) => {
    setExpandedParts((prev) => {
      const next = new Set(prev)
      if (next.has(part)) {
        next.delete(part)
      } else {
        next.add(part)
      }
      return next
    })
  }

  return (
    <aside
      className="hidden lg:block fixed top-0 overflow-y-auto"
      style={{
        width: '200px',
        height: '100vh',
        paddingTop: '2rem',
        paddingBottom: '2rem',
        paddingLeft: '0.5rem',
        paddingRight: '0.5rem',
        marginLeft: 'var(--sidebar-width, 0px)',
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Chapters
      </p>

      <nav className="space-y-1" aria-label="Chapter navigation">
        {Array.from(parts.entries()).map(([partNum, partChapters]) => {
          const isExpanded = expandedParts.has(partNum)
          return (
            <div key={partNum}>
              {/* Part header */}
              <button
                onClick={() => togglePart(partNum)}
                className="w-full text-left px-2 py-1.5 text-xs font-medium rounded flex items-center gap-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span
                  className="transition-transform"
                  style={{
                    display: 'inline-block',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    fontSize: '10px',
                  }}
                >
                  ▶
                </span>
                <span className="truncate">
                  Part {partNum}
                </span>
              </button>

              {/* Chapter list within part */}
              {isExpanded && (
                <div className="ml-3 space-y-0.5">
                  {partChapters.map((ch) => {
                    const isCurrent = ch.chapter_number === currentChapter
                    return (
                      <Link
                        key={ch.chapter_number}
                        href={`/reading/${slug}/${ch.chapter_number}`}
                        className="block px-2 py-1 text-xs rounded truncate"
                        style={{
                          color: isCurrent ? 'var(--accent-purple)' : 'var(--text-secondary)',
                          backgroundColor: isCurrent ? 'var(--bg-soft)' : 'transparent',
                          fontWeight: isCurrent ? 600 : 400,
                        }}
                        title={`${getChapterLabel(ch.chapter_number)}: ${ch.title}`}
                      >
                        {getChapterLabel(ch.chapter_number)}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
