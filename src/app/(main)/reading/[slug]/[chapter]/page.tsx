import { createClient, createStaticClient, getSessionUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import ChapterReader from '@/components/reading/ChapterReader'
import ChapterSidebar from '@/components/reading/ChapterSidebar'

interface Props {
  params: Promise<{ slug: string; chapter: string }>
}

/**
 * Map internal chapter_number to Marx's actual structure.
 * chapter_number 1-4 = Chapter 1 sections, 5-36 = Chapters 2-33
 */
function getChapterLabel(chapterNumber: number): { label: string; shortLabel: string } {
  if (chapterNumber <= 4) {
    return {
      label: `Chapter 1, Section ${chapterNumber}`,
      shortLabel: `1.${chapterNumber}`,
    }
  }
  const marxChapter = chapterNumber - 3 // 5 -> 2, 6 -> 3, etc.
  return {
    label: `Chapter ${marxChapter}`,
    shortLabel: `Ch ${marxChapter}`,
  }
}

/** Get the Part number for a given Marx chapter number */
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

export async function generateMetadata({ params }: Props) {
  const { slug, chapter } = await params
  const supabase = await createClient()

  // Parallel metadata fetch
  const [{ data: doc }, { data: ch }] = await Promise.all([
    supabase.from('text_documents').select('title').eq('slug', slug).single(),
    supabase.from('text_chapters').select('title, chapter_number').eq('chapter_number', parseInt(chapter)).single(),
  ])

  if (!ch) return { title: 'Reading | Capital Study Group' }

  const { label } = getChapterLabel(ch.chapter_number)
  return {
    title: `${ch.title} | ${label} | ${doc?.title || 'Reading'} | Capital Study Group`,
  }
}

// Cache static chapter data — text content doesn't change, revalidate daily
// Uses createStaticClient (no cookies) because unstable_cache cannot access dynamic APIs
const getStaticChapterData = unstable_cache(
  async (slug: string, chapterNum: number) => {
    const supabase = createStaticClient()

    const [
      { data: doc },
      { data: chapterData },
      { data: allChapters },
    ] = await Promise.all([
      supabase.from('text_documents')
        .select('id, title, slug')
        .eq('slug', slug)
        .single(),
      supabase.from('text_chapters')
        .select('id, chapter_number, title, content, sort_order')
        .eq('chapter_number', chapterNum)
        .single(),
      supabase.from('text_chapters')
        .select('id, chapter_number, title, sort_order')
        .order('sort_order', { ascending: true }),
    ])

    return { doc, chapterData, allChapters }
  },
  ['chapter-static-data'],
  { revalidate: 86400 } // 24 hours
)

// Cache footnotes separately (also static, never change)
// Uses createStaticClient (no cookies) because unstable_cache cannot access dynamic APIs
const getFootnotes = unstable_cache(
  async (chapterId: string) => {
    const supabase = createStaticClient()
    const { data } = await supabase.from('text_footnotes')
      .select('id, footnote_number, content, author')
      .eq('chapter_id', chapterId)
      .order('footnote_number', { ascending: true })
    return data
  },
  ['chapter-footnotes'],
  { revalidate: 86400 }
)

export default async function ChapterPage({ params }: Props) {
  const { slug, chapter } = await params
  const chapterNum = parseInt(chapter)

  // Fetch user (instant local JWT read) and cached static data in parallel
  const [user, { doc, chapterData, allChapters }] = await Promise.all([
    getSessionUser(),
    getStaticChapterData(slug, chapterNum),
  ])

  if (!doc || !chapterData) notFound()

  // Footnotes (cached) + annotations (dynamic, always fresh) in parallel
  const supabase = await createClient()
  const [footnotes, { data: annotations }] = await Promise.all([
    getFootnotes(chapterData.id),
    supabase.from('annotations')
      .select(`
        *,
        author:profiles!author_id(id, display_name),
        replies:annotation_replies(
          id, body, created_at,
          author:profiles!author_id(id, display_name)
        )
      `)
      .eq('chapter_id', chapterData.id)
      .order('position_start', { ascending: true }),
  ])

  const chapters = allChapters || []
  const currentIndex = chapters.findIndex((c) => c.chapter_number === chapterNum)
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  const { label: currentLabel } = getChapterLabel(chapterNum)

  // Determine if we're in Ch1 sections or a standalone chapter
  const isChapter1Section = chapterNum <= 4
  const ch1Sections = chapters.filter(c => c.chapter_number <= 4)

  return (
    <div className="relative">
      {/* Floating Chapter Sidebar — desktop only */}
      <ChapterSidebar
        chapters={chapters}
        currentChapter={chapterNum}
        slug={slug}
      />

      {/* Chapter content — offset on large screens to clear sidebar */}
      <div className="lg:pl-56">

      {/* Breadcrumb navigation */}
      <div className="mb-6 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Link href="/reading" className="hover:underline" style={{ color: 'var(--accent-red)' }}>
          Reading
        </Link>
        <span>›</span>
        <Link href="/reading" className="hover:underline" style={{ color: 'var(--accent-red)' }}>
          {doc.title}
        </Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{currentLabel}</span>
      </div>

      {/* Reading progress bar */}
      {chapters.length > 0 && (
        <div className="mb-6 text-center">
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {currentLabel} of 33 · Part {getPartNumber(chapterNum)}
          </p>
          <div className="h-[3px] rounded-full max-w-xs mx-auto" style={{ backgroundColor: 'var(--bg-soft)' }}>
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: 'var(--accent-purple)',
                width: `${Math.round((currentIndex / (chapters.length - 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Section navigation — only show Ch1 section tabs when reading a Ch1 section */}
      {isChapter1Section && (
        <div className="flex gap-2 mb-10 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-2 sm:pb-0 scrollbar-hide">
          {ch1Sections.map((ch) => {
            const isActive = ch.chapter_number === chapterNum
            return (
              <Link
                key={ch.id}
                href={`/reading/${slug}/${ch.chapter_number}`}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium btn-transition"
                style={{
                  backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: isActive ? 'var(--bg-page)' : 'var(--text-primary)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--text-primary)' : 'var(--border-default)',
                }}
              >
                {ch.chapter_number}. {ch.title.length > 35 ? ch.title.slice(0, 35) + '...' : ch.title}
              </Link>
            )
          })}
        </div>
      )}

      {/* Chapter title */}
      <div className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-purple)' }}>
          {currentLabel}
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold mb-3"
          style={{
            color: 'var(--accent-red)',
            fontFamily: "'Lora', Georgia, serif",
          }}
        >
          {chapterData.title}
        </h1>
        <div className="w-16 h-0.5 mx-auto" style={{ backgroundColor: 'var(--accent-purple)' }} />
      </div>

      {/* Chapter text — the main reading experience */}
      <ChapterReader
        chapter={chapterData}
        annotations={annotations || []}
        footnotes={(footnotes as any[]) || []}
        userId={user?.id || null}
        documentSlug={slug}
      />

      {/* Cross-feature prompt */}
      <div className="mt-12 p-5 rounded-xl border text-center" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Finished reading? Share your thoughts with the group.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/threads/new?chapter=${chapterNum}&section=${encodeURIComponent(chapterData.title)}&chapter_id=${chapterData.id}`}
            className="btn-primary text-sm gap-1.5"
          >
            Start a Thread
          </Link>
          <Link
            href="/threads"
            className="btn-secondary text-sm gap-1.5"
          >
            View Discussions
          </Link>
        </div>
      </div>

      {/* Chapter navigation footer */}
      <div className="mt-8 pt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
        {prevChapter ? (
          <Link
            href={`/reading/${slug}/${prevChapter.chapter_number}`}
            className="group flex items-center gap-2 text-sm font-medium max-w-[45%]"
            style={{ color: 'var(--accent-red)' }}
          >
            <span className="transition-transform group-hover:-translate-x-1 flex-shrink-0">←</span>
            <div className="min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Previous</p>
              <p className="truncate">{getChapterLabel(prevChapter.chapter_number).label}: {prevChapter.title}</p>
            </div>
          </Link>
        ) : (
          <div />
        )}
        {nextChapter ? (
          <Link
            href={`/reading/${slug}/${nextChapter.chapter_number}`}
            className="group flex items-center gap-2 text-sm font-medium text-right max-w-[45%]"
            style={{ color: 'var(--accent-red)' }}
          >
            <div className="min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Next</p>
              <p className="truncate">{getChapterLabel(nextChapter.chapter_number).label}: {nextChapter.title}</p>
            </div>
            <span className="transition-transform group-hover:translate-x-1 flex-shrink-0">→</span>
          </Link>
        ) : (
          <div />
        )}
      </div>
      </div>{/* end lg:pl-56 */}
    </div>
  )
}
