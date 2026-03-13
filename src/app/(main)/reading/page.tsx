import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Reading | Critical Consciousness',
}

export default async function ReadingPage() {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('text_documents')
    .select(`
      *,
      chapters:text_chapters(
        id, chapter_number, title, sort_order,
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
          <p className="text-lg mb-2" style={{ color: 'var(--color-warm-gray)' }}>
            No texts uploaded yet
          </p>
          <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
            When the group's reading materials are added, they'll appear here with social annotation features.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-deep-red)' }}>
        Reading
      </h1>

      <div className="space-y-6">
        {documents.map((doc: any) => {
          const chapters = doc.chapters?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

          return (
            <div key={doc.id} className="rounded-lg border-2 overflow-hidden" style={{ borderColor: 'var(--color-muted-gold)' }}>
              <div className="px-6 py-4" style={{ backgroundColor: 'var(--color-dark-brown)' }}>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-warm-cream)' }}>
                  {doc.title}
                </h2>
              </div>
              {chapters.length > 0 ? (
                <div className="divide-y" style={{ borderColor: '#e5e1d8' }}>
                  {chapters.map((chapter: any) => (
                    <Link
                      key={chapter.id}
                      href={`/reading/${doc.slug}/${chapter.chapter_number}`}
                      className="block px-6 py-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-dark-brown)' }}>
                          Ch. {chapter.chapter_number}: {chapter.title}
                        </span>
                        {chapter.week && (
                          <span className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                            Week {chapter.week.week_number}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--color-warm-gray)' }}>
                    No chapters added yet.
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
