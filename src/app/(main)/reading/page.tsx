import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata = {
  title: 'Reading | Critical Consciousness',
}

export default async function ReadingPage() {
  // Use admin client to bypass RLS for server-side rendering
  // TODO: RE-ENABLE AUTH — switch to cookie-based client once RLS policies are set
  const supabase = createAdminClient()

  // Get current week to determine default section
  const now = new Date().toISOString()
  const { data: currentWeekData } = await supabase
    .from('reading_schedule')
    .select('id')
    .gte('due_date', now)
    .order('due_date', { ascending: true })
    .limit(1)

  const currentWeekId = currentWeekData?.[0]?.id || null

  const { data: documents } = await supabase
    .from('text_documents')
    .select(`
      *,
      chapters:text_chapters(
        id, chapter_number, title, sort_order, week_id,
        week:reading_schedule!week_id(week_number, title)
      )
    `)
    .order('created_at', { ascending: true })

  if (!documents || documents.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-deep-red)' }}>
          Reading
        </h1>
        <div className="text-center py-16">
          <p className="text-lg mb-2" style={{ color: 'var(--color-dark-brown)' }}>
            The text is coming
          </p>
          <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
            The text will appear here with social annotation — highlight passages, leave questions, and see what others are thinking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-deep-red)' }}>
          Reading
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
          Read the text and annotate together — highlight passages, leave questions, and see what the group is thinking.
        </p>
      </div>

      <div className="space-y-8">
        {documents.map((doc: any) => {
          const chapters = doc.chapters?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

          return (
            <div key={doc.id}>
              {/* Document header */}
              <div
                className="rounded-t-lg px-6 py-5"
                style={{ backgroundColor: 'var(--color-dark-brown)' }}
              >
                <h2
                  className="text-2xl font-bold mb-1"
                  style={{
                    color: 'var(--color-warm-cream)',
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                >
                  {doc.title}
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-muted-gold)' }}>
                  Chapter 1 · {chapters.length} section{chapters.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Chapter/section list */}
              {chapters.length > 0 ? (
                <div
                  className="rounded-b-lg border border-t-0 overflow-hidden"
                  style={{ borderColor: '#e2dfe8' }}
                >
                  {chapters.map((chapter: any, i: number) => {
                    const isCurrentWeek = chapter.week_id === currentWeekId
                    return (
                      <Link
                        key={chapter.id}
                        href={`/reading/${doc.slug}/${chapter.chapter_number}`}
                        className="flex items-center justify-between px-6 py-4 transition-all hover:bg-gray-50 group"
                        style={{
                          backgroundColor: isCurrentWeek ? '#faf6ee' : 'white',
                          borderBottom: i < chapters.length - 1 ? '1px solid #e2dfe8' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{
                              backgroundColor: isCurrentWeek ? 'var(--color-muted-gold)' : '#e8ddd0',
                              color: isCurrentWeek ? 'var(--color-dark-brown)' : 'var(--color-warm-gray)',
                            }}
                          >
                            {chapter.chapter_number}
                          </span>
                          <div>
                            <h3
                              className="font-medium text-sm group-hover:underline"
                              style={{
                                color: 'var(--color-dark-brown)',
                                fontFamily: "'Lora', Georgia, serif",
                              }}
                            >
                              {chapter.title}
                            </h3>
                            {chapter.week && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--color-warm-gray)' }}>
                                Week {chapter.week.week_number}: {chapter.week.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCurrentWeek && (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: 'var(--color-muted-gold)',
                                color: 'var(--color-dark-brown)',
                              }}
                            >
                              This Week
                            </span>
                          )}
                          <span
                            className="text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--color-deep-red)' }}
                          >
                            Read →
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div
                  className="rounded-b-lg border border-t-0 px-6 py-4"
                  style={{ borderColor: '#e2dfe8', backgroundColor: 'white' }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
                    Chapters will appear here as they&apos;re added to the reading schedule.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
