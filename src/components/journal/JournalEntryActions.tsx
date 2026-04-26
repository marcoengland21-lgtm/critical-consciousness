'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface JournalEntryActionsProps {
  entryId: string
}

/**
 * Actions row for a single journal entry — currently just delete. Lives
 * top-right of the entry editor page. RLS enforces that only the owner
 * can delete (auth.uid() = user_id), but we double-check the confirm
 * dialog because journal entries are private and unrecoverable.
 */
export default function JournalEntryActions({ entryId }: JournalEntryActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this journal entry? This cannot be undone.')) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('private_notes').delete().eq('id', entryId)
    if (error) {
      alert('Failed to delete: ' + error.message)
      setDeleting(false)
      return
    }
    router.push('/journal')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs font-medium px-3 py-1.5 rounded border transition-colors disabled:opacity-50"
      style={{
        borderColor: 'var(--accent-red)',
        color: 'var(--accent-red)',
      }}
    >
      {deleting ? 'Deleting…' : 'Delete entry'}
    </button>
  )
}
