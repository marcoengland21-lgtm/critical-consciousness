'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import JournalEditor from '@/components/journal/JournalEditor'

/**
 * /journal/new — fresh entry editor.
 *
 * Client component because it needs to swap to /journal/[id] as soon as
 * autosave creates the row (so a refresh doesn't create a duplicate empty
 * entry). The JournalEditor calls onCreatedRedirect with the new id.
 *
 * Chunk 3b piece 2c-ii: accepts a `?chapter_id=...` URL param. When
 * present, the new note inherits that chapter context (the
 * `private_notes.chapter_id` column reserved at chunk 2 specifically
 * for chunk 3 work). Used by the ConceptsNotesModal's "+ Start a note
 * on this chapter" CTA so the note shows up in that chapter's notes
 * list, not just the global /journal index.
 */
export default function NewJournalEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chapterId = searchParams?.get('chapter_id') ?? null
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
      else router.replace('/login')
    })
  }, [router])

  if (!userId) {
    return (
      <div className="text-sm py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
        Loading…
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/journal"
        className="inline-flex items-center text-sm mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        ← Back to journal
      </Link>

      <div className="mb-4">
        <p className="text-eyebrow">New entry · Private</p>
      </div>

      <JournalEditor
        initialId={null}
        initialTitle=""
        initialBodyJson={{ type: 'doc', content: [] }}
        initialChapterId={chapterId}
        userId={userId}
        showTitle
        bodyPlaceholder="Start writing…"
        minHeight={500}
        onCreatedRedirect={(id) => {
          // Replace URL with the entry id so a refresh doesn't make a new row.
          window.history.replaceState(null, '', `/journal/${id}`)
        }}
      />
    </div>
  )
}
