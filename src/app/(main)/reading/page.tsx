import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CollapsiblePart from '@/components/reading/CollapsiblePart'

// Dynamic page — uses cookies() via Supabase client.
// Removed ISR to prevent stale empty-state caching on deploy.

export const metadata = {
  title: 'Reading | Capital Study Group',
}

/**
 * Map internal chapter_number to Marx's actual structure.
 * chapter_number 1-4 = Chapter 1 sections
 * chapter_number 5+ = Chapters 2-33 (formula: marxChapter = chapterNumber - 3)
 */
interface MarxChapter {
  marxChapter: number
  part: number
  partTitle: string
  isSection?: boolean
  parentLabel?: string
}

/** Marx's Chapter -> Part mapping */
const PART_MAP: Record<number, { part: number; title: string }> = {}
function setPart(chapters: number[], part: number, title: string) {
  for (const ch of chapters) PART_MAP[ch] = { part, title }
}
setPart([1, 2, 3], 1, 'Commodities and Money')
setPart([4, 5, 6], 2, 'The Transformation of Money into Capital')
setPart([7, 8, 9, 10], 3, 'The Production of Absolute Surplus-Value')
setPart([11, 12, 13, 14, 15], 4, 'Production of Relative Surplus-Value')
setPart([16, 17, 18], 5, 'The Production of Absolute and Relative Surplus-Value')
setPart([19, 20, 21, 22], 6, 'Wages')
setPart([23, 24, 25], 7, 'The Accumulation of Capital')
setPart([26, 27, 28, 29, 30, 31, 32, 33], 8, 'The So-Called Primitive Accumulation')

function getChapterMapping(chapterNumber: number): MarxChapter | null {
  // Ch1 sections (chapter_number 1-4)
  if (chapterNumber >= 1 && chapterNumber <= 4) {
    return {
      marxChapter: 1,
      part: 1,
      partTitle: 'Commodities and Money',
      isSection: true,
      parentLabel: 'Chapter 1: Commodities',
    }
  }
  // Chapters 2-33 (chapter_number 5-36)
  const marxChapter = chapterNumber - 3
  const partInfo = PART_MAP[marxChapter]
  if (!partInfo) return null
  return {
    marxChapter,
    part: partInfo.part,
    partTitle: partInfo.title,
  }
}

// Query-specific join shapes for Supabase responses
interface ChapterWeek {
  week_number: number
  title: string
}

interface ChapterRow {
  id: string
  chapter_number: number
  title: string
  sort_order: number
  week_id: string | null
  week: ChapterWeek | null
}

interface DocumentWithChapters {
  id: string
  title: string
  slug: string
  chapters: ChapterRow[] | null
}

interface ChapterWithMapping extends ChapterRow {
  mapping: MarxChapter
}

interface PartGroup {
  part: number
  partTitle: string
  items: ChapterWithMapping[]
}

export default async function ReadingPage() {
  const supabase = await createClient()

  const now = new Date().toISOString()

  // All queries in parallel — FLAT queries to avoid nested join RLS failures.
  // Previous approach nested reading_schedule inside text_chapters inside text_documents,
  // which fails silently if RLS blocks any level. Now we fetch each table independently.
  const [currentWeekResult, documentsResult, chaptersResult, weeksResult, annotationCountsResult] = await Promise.all([
    supabase
      .from('reading_schedule')
      .select('id')
      .gte('due_date', now)
      .order('due_date', { ascending: true })
      .limit(1),
    // Documents — flat, no joins
    supabase
      .from('text_documents')
      .select('id, title, slug')
      .order('created_at', { ascending: true }),
    // Chapters — flat, no nested week join
    supabase
      .from('text_chapters')
      .select('id, document_id, chapter_number, title, sort_order, week_id'),
    // Weeks — flat lookup for week labels
    supabase
      .from('reading_schedule')
      .select('id, week_number, title'),
    // Count annotations per chapter for badges
    supabase
      .from('annotations')
      .select('chapter_id'),
  ])

  if (documentsResult.error) {
    console.error('[CCP] Reading page — text_documents query error:', documentsResult.error)
  }
  if (chaptersResult.error) {
    console.error('[CCP] Reading page — text_chapters query error:', chaptersResult.error)
  }
  if (weeksResult.error) {
    console.error('[CCP] Reading page — reading_schedule query error:', weeksResult.error)
  }
  if (annotationCountsResult.error) {
    console.error('[CCP] Reading page — annotations query error:', annotationCountsResult.error)
  }

  const currentWeekId = currentWeekResult.data?.[0]?.id || null

  // Build week lookup: id -> { week_number, title }
  const weekMap = new Map<string, ChapterWeek>()
  if (weeksResult.data) {
    for (const w of weeksResult.data) {
      weekMap.set(w.id, { week_number: w.week_number, title: w.title })
    }
  }

  // Build annotation count map: chapter_id -> count
  const annotationCounts = new Map<string, number>()
  if (annotationCountsResult.data) {
    for (const ann of annotationCountsResult.data) {
      annotationCounts.set(ann.chapter_id, (annotationCounts.get(ann.chapter_id) || 0) + 1)
    }
  }

  // Merge chapters with their week data and group by document
  const rawDocs = (documentsResult.data || []) as { id: string; title: string; slug: string }[]
  const rawChapters = (chaptersResult.data || []) as { id: string; document_id: string; chapter_number: number; title: string; sort_order: number; week_id: string | null }[]

  const typedDocuments: DocumentWithChapters[] = rawDocs.map((doc) => ({
    ...doc,
    chapters: rawChapters
      .filter((ch) => ch.document_id === doc.id)
      .map((ch) => ({
        ...ch,
        week: ch.week_id ? weekMap.get(ch.week_id) || null : null,
      })),
  }))

  if (typedDocuments.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <p className="text-eyebrow mb-2">The Text</p>
          <h1 className="text-display-lg" style={{ color: 'var(--text-primary)' }}>
            Reading
          </h1>
        </div>
        <div className="text-center py-16">
          <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
            The text is coming
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            The text will appear here with social annotation — highlight passages, leave questions, and see what others are thinking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-eyebrow mb-2">33 Chapters · 8 Parts</p>
        <h1 className="text-display-lg mb-2" style={{ color: 'var(--text-primary)' }}>
          Reading
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
          Read the text and annotate together — highlight passages, leave questions, and see what the group is thinking.
        </p>
      </div>

      <div className="space-y-8">
        {typedDocuments.map((doc) => {
          const chapters = (doc.chapters || []).sort((a: ChapterRow, b: ChapterRow) => a.sort_order - b.sort_order)

          // Group chapters by Part
          const parts: PartGroup[] = []
          let currentPart: PartGroup | null = null

          for (const chapter of chapters) {
            const mapping = getChapterMapping(chapter.chapter_number)
            if (!mapping) continue

            if (!currentPart || currentPart.part !== mapping.part) {
              currentPart = { part: mapping.part, partTitle: mapping.partTitle, items: [] }
              parts.push(currentPart)
            }

            currentPart.items.push({ ...chapter, mapping })
          }

          return (
            <div key={doc.id}>
              {/* Document header */}
              <div
                className="rounded-t-lg px-6 py-5"
                style={{ backgroundColor: 'var(--bg-nav)' }}
              >
                <h2
                  className="text-2xl font-bold mb-1"
                  style={{
                    color: 'var(--text-inverse)',
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                >
                  {doc.title}
                </h2>
                <p className="text-sm" style={{ color: 'var(--accent-purple)' }}>
                  Karl Marx
                </p>
              </div>

              {/* Parts and chapters */}
              <div
                className="rounded-b-lg border border-t-0 overflow-hidden"
                style={{ borderColor: 'var(--border-default)' }}
              >
                {parts.map((partGroup, partIdx) => {
                  // Group Ch1 sections together under a parent label
                  const ch1Sections = partGroup.items.filter((item: ChapterWithMapping) => item.mapping.isSection)
                  const standaloneChapters = partGroup.items.filter((item: ChapterWithMapping) => !item.mapping.isSection)

                  // First 3 parts open by default, rest collapsed
                  const hasCurrentWeek = partGroup.items.some((item: ChapterWithMapping) => item.week_id === currentWeekId)
                  const defaultOpen = hasCurrentWeek || partGroup.part <= 3

                  return (
                    <div key={partGroup.part} style={{ borderTop: partIdx > 0 ? '1px solid var(--border-default)' : 'none' }}>
                      <CollapsiblePart
                        partNumber={partGroup.part}
                        partTitle={partGroup.partTitle}
                        defaultOpen={defaultOpen}
                      >

                      {/* Chapter 1 sections (grouped) */}
                      {ch1Sections.length > 0 && (
                        <div>
                          {/* Chapter 1 parent label */}
                          <div
                            className="px-6 py-3 flex items-center gap-3"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderBottom: '1px solid var(--border-default)',
                            }}
                          >
                            <span
                              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--text-secondary)' }}
                            >
                              1
                            </span>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: 'var(--text-primary)', fontFamily: "'Lora', Georgia, serif" }}
                            >
                              Commodities
                            </p>
                          </div>

                          {/* Individual sections of Ch1 */}
                          {ch1Sections.map((chapter: ChapterWithMapping, i: number) => {
                            const isCurrentWeek = chapter.week_id === currentWeekId
                            const isLast = i === ch1Sections.length - 1 && standaloneChapters.length === 0
                            const sectionLabel = `Read Chapter 1, Section ${chapter.chapter_number}: ${chapter.title}`
                            return (
                              <Link
                                key={chapter.id}
                                href={`/reading/${doc.slug}/${chapter.chapter_number}`}
                                aria-label={sectionLabel}
                                className="flex items-center justify-between px-6 pl-16 py-3 transition-all hover-bg-themed group"
                                style={{
                                  backgroundColor: isCurrentWeek ? 'var(--bg-soft)' : 'var(--bg-card)',
                                  borderBottom: isLast ? 'none' : '1px solid var(--border-default)',
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs"
                                    style={{
                                      backgroundColor: isCurrentWeek ? 'var(--accent-purple)' : 'var(--bg-soft)',
                                      color: isCurrentWeek ? 'var(--text-inverse)' : 'var(--text-secondary)',
                                    }}
                                  >
                                    {chapter.chapter_number}
                                  </span>
                                  <div>
                                    <h3
                                      className="font-medium text-sm group-hover:underline"
                                      style={{
                                        color: 'var(--text-primary)',
                                        fontFamily: "'Lora', Georgia, serif",
                                      }}
                                    >
                                      {chapter.title}
                                    </h3>
                                    {chapter.week && (
                                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                        Week {chapter.week.week_number}: {chapter.week.title}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Annotation count badge */}
                                  {(annotationCounts.get(chapter.id) || 0) > 0 && (
                                    <span
                                      className="text-[10px] font-medium px-1.5 py-1 rounded-full leading-none"
                                      style={{
                                        backgroundColor: 'rgba(var(--accent-purple-rgb), 0.1)',
                                        color: 'var(--accent-purple)',
                                      }}
                                    >
                                      {annotationCounts.get(chapter.id)} notes
                                    </span>
                                  )}
                                  {isCurrentWeek && (
                                    <span
                                      className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                                      style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-inverse)' }}
                                    >
                                      This Week
                                    </span>
                                  )}
                                  <span
                                    className="text-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                    style={{ color: 'var(--accent-red)' }}
                                  >
                                    Read →
                                  </span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      )}

                      {/* Standalone chapters (Ch 2+) */}
                      {standaloneChapters.map((chapter: ChapterWithMapping, i: number) => {
                        const isCurrentWeek = chapter.week_id === currentWeekId
                        const isLast = i === standaloneChapters.length - 1
                        const chapterLabel = `Read Chapter ${chapter.mapping.marxChapter}: ${chapter.title}`
                        return (
                          <Link
                            key={chapter.id}
                            href={`/reading/${doc.slug}/${chapter.chapter_number}`}
                            aria-label={chapterLabel}
                            className="flex items-center justify-between px-6 py-4 transition-all hover-bg-themed group"
                            style={{
                              backgroundColor: isCurrentWeek ? 'var(--bg-soft)' : 'var(--bg-card)',
                              borderBottom: isLast ? 'none' : '1px solid var(--border-default)',
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <span
                                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                style={{
                                  backgroundColor: isCurrentWeek ? 'var(--accent-purple)' : 'var(--bg-soft)',
                                  color: isCurrentWeek ? 'var(--text-inverse)' : 'var(--text-secondary)',
                                }}
                              >
                                {chapter.mapping.marxChapter}
                              </span>
                              <div>
                                <h3
                                  className="font-medium text-sm group-hover:underline"
                                  style={{
                                    color: 'var(--text-primary)',
                                    fontFamily: "'Lora', Georgia, serif",
                                  }}
                                >
                                  {chapter.title}
                                </h3>
                                {chapter.week && (
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    Week {chapter.week.week_number}: {chapter.week.title}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Annotation count badge */}
                              {(annotationCounts.get(chapter.id) || 0) > 0 && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-1 rounded-full leading-none"
                                  style={{
                                    backgroundColor: 'rgba(var(--accent-purple-rgb), 0.1)',
                                    color: 'var(--accent-purple)',
                                  }}
                                >
                                  {annotationCounts.get(chapter.id)} notes
                                </span>
                              )}
                              {isCurrentWeek && (
                                <span
                                  className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                                  style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-inverse)' }}
                                >
                                  This Week
                                </span>
                              )}
                              <span
                                className="text-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                style={{ color: 'var(--accent-red)' }}
                              >
                                Read →
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                      </CollapsiblePart>
                    </div>
                  )
                })}

                {/* Attribution */}
                <div
                  className="px-6 py-3 text-center"
                  style={{
                    borderTop: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-card)',
                  }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Text from the{' '}
                    <a
                      href="https://www.marxists.org/archive/marx/works/1867-c1/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: 'var(--accent-purple)' }}
                    >
                      Marxists Internet Archive
                    </a>
                    {' '}— Moore &amp; Aveling translation, edited by Engels
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
