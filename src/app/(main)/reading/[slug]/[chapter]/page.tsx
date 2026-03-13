import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ChapterReader from '@/components/reading/ChapterReader'

interface Props {
  params: Promise<{ slug: string; chapter: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug, chapter } = await params
  // Use admin client to bypass RLS for server-side rendering
  // TODO: RE-ENABLE AUTH — switch to cookie-based client once RLS policies are set
  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('text_documents')
    .select('title')
    .eq('slug', slug)
    .single()

  const { data: ch } = await supabase
    .from('text_chapters')
    .select('title')
    .eq('chapter_number', parseInt(chapter))
    .single()

  return {
    title: ch
      ? `${ch.title} | ${doc?.title || 'Reading'} | Critical Consciousness`
      : 'Reading | Critical Consciousness',
  }
}

export default async function ChapterPage({ params }: Props) {
  const { slug, chapter } = await params
  const chapterNum = parseInt(chapter)

  // Cookie-based client for auth check only
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  // Admin client for data fetching (bypasses RLS)
  // TODO: RE-ENABLE AUTH — switch to cookie-based client once RLS policies are set
  const supabase = createAdminClient()

  // Get the document
  const { data: doc } = await supabase
    .from('text_documents')
    .select('id, title, slug')
    .eq('slug', slug)
    .single()

  if (!doc) notFound()

  // Get the chapter
  const { data: chapterData } = await supabase
    .from('text_chapters')
    .select('*')
    .eq('document_id', doc.id)
    .eq('chapter_number', chapterNum)
    .single()

  if (!chapterData) notFound()

  // Get all chapters for navigation
  const { data: allChapters } = await supabase
    .from('text_chapters')
    .select('id, chapter_number, title, sort_order')
    .eq('document_id', doc.id)
    .order('sort_order', { ascending: true })

  const chapters = allChapters || []
  const currentIndex = chapters.findIndex((c) => c.chapter_number === chapterNum)
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null

  // Get existing annotations for this chapter
  const { data: annotations } = await supabase
    .from('annotations')
    .select(`
      *,
      author:profiles!author_id(id, display_name),
      replies:annotation_replies(
        id, body, created_at,
        author:profiles!author_id(id, display_name)
      )
    `)
    .eq('chapter_id', chapterData.id)
    .order('position_start', { ascending: true })

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
        <span style={{ color: 'var(--text-primary)' }}>§{chapterNum}</span>
      </div>

      {/* Section navigation tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {chapters.map((ch) => (
          <Link
            key={ch.id}
            href={`/reading/${slug}/${ch.chapter_number}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: ch.chapter_number === chapterNum ? 'var(--text-primary)' : 'var(--bg-card)',
              color: ch.chapter_number === chapterNum ? 'var(--bg-page)' : 'var(--text-primary)',
              border: '1px solid',
              borderColor: ch.chapter_number === chapterNum ? 'var(--text-primary)' : 'var(--border-default)',
            }}
          >
            §{ch.chapter_number}: {ch.title.length > 30 ? ch.title.slice(0, 30) + '…' : ch.title}
          </Link>
        ))}
      </div>

      {/* Chapter title */}
      <div className="mb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--accent-purple)' }}>
          Section {chapterNum}
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
        userId={user?.id || null}
        documentSlug={slug}
      />

      {/* Chapter navigation footer */}
      <div className="mt-16 pt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
        {prevChapter ? (
          <Link
            href={`/reading/${slug}/${prevChapter.chapter_number}`}
            className="group flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--accent-red)' }}
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Previous</p>
              <p>§{prevChapter.chapter_number}: {prevChapter.title}</p>
            </div>
          </Link>
        ) : (
          <div />
        )}
        {nextChapter ? (
          <Link
            href={`/reading/${slug}/${nextChapter.chapter_number}`}
            className="group flex items-center gap-2 text-sm font-medium text-right"
            style={{ color: 'var(--accent-red)' }}
          >
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Next</p>
              <p>§{nextChapter.chapter_number}: {nextChapter.title}</p>
            </div>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
