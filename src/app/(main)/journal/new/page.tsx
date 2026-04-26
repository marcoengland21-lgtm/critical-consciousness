'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import JournalEditor from '@/components/journal/JournalEditor'

/**
 * /journal/new — fresh entry editor.
 *
 * Client component because it needs to swap to /journal/[id] as soon as
 * autosave creates the row (so a refresh doesn't create a duplicate empty
 * entry). The JournalEditor calls onCreatedRedirect with the new id.
 */
export default function NewJournalEntryPage() {
  const router = useRouter()
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
        initialBody=""
        userId={userId}
        showTitle
        bodyPlaceholder="Start writing…"
        minRows={16}
        onCreatedRedirect={(id) => {
          // Replace URL with the entry id so a refresh doesn't make a new row.
          // history.replaceState avoids the soft-navigation flash that
          // router.replace can cause and keeps editor state intact.
          window.history.replaceState(null, '', `/journal/${id}`)
        }}
      />
    </div>
  )
}
