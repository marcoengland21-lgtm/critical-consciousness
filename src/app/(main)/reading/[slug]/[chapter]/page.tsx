import { createClient, getSessionUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ChapterReader from '@/components/reading/ChapterReader'

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

export async function generateMetadata({ params }: Props) {
  const { slug, chapter } = await params
  const supabase = await createClient()

  // Parallel metadata fetch
  const [{ data: doc }, { data: ch }] = await Promise.all([
    supabase.from('text_documents').select('title').eq('slug', slug).single(),
    supabase.from('text_chapters').select('title, chapter_number').eq('chapter_number', parseInt(chapter)).single(),
  ])

  if (!ch) return { title: 'Reading | Critical Consciousness' }

  const { label } = getChapterLabel(ch.chapter_number)
  return {
    title: `${ch.title} | ${label} | ${doc?.title || 'Reading'} | Critical Consciousness`,
  }
}

export default async function ChapterPage({ params }: Props) {
  const { slug, chapter } = await params
  const chapterNum = parseInt(chapter)

  const user = await getSessionUser()
  const supabase = await createClient()

  // PHASE 1: 3 independent queries in parallel
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
      .select('*')
      .eq('chapter_number', chapterNum)
      .single(),
    supabase.from('text_chapters')
      .select('id, chapter_number, title, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  if (!doc || !chapterData) notFound()

  // PHASE 2: Footnotes + annotations in parallel (need chapterData.id)
  const [
    { data: footnotes },
    { data: annotations },
  ] = await Promise.all([
    supabase.from('text_footnotes')
      .select('*')
      .eq('chapter_id', chapterData.id)
      .order('footnote_number', { ascending: true }),
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
    <div>
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

      {/* Section navigation — only show Ch1 section tabs when reading a Ch1 section */}
      {isChapter1Section && (
        <div className="flex flex-wrap gap-2 mb-10">
          {ch1Sections.map((ch) => {
            const isActive = ch.chapter_number === chapterNum
            return (
              <Link
                key={ch.id}
                href={`/reading/${slug}/${ch.chapter_number}`}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
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
        footnotes={footnotes || []}
        userId={user?.id || null}
        documentSlug={slug}
      />

      {/* Cross-feature prompt */}
      <div className="mt-12 p-5 rounded-lg border text-center" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Finished reading? Share your thoughts with the group.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/threads/new?chapter=${chapterNum}&section=${encodeURIComponent(chapterData.title)}&chapter_id=${chapterData.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
          >
            Start a Thread
          </Link>
          <Link
            href="/threads"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
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
    </div>
  )
}
