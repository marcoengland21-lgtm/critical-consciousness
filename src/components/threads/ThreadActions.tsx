'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ThreadActionsProps {
  threadId: string
  isAuthor: boolean
  isAdmin: boolean
}

export default function ThreadActions({ threadId, isAuthor, isAdmin }: ThreadActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this thread? All replies will also be deleted.')) return

    setDeleting(true)
    const supabase = createClient()

    // Delete all replies first, then the thread
    await supabase.from('replies').delete().eq('thread_id', threadId)
    const { error } = await supabase.from('threads').delete().eq('id', threadId)

    if (!error) {
      router.push('/threads')
    } else {
      setDeleting(false)
      alert('Failed to delete thread: ' + error.message)
    }
  }

  return (
    <div className="flex items-center gap-3 mt-6 pt-4 border-t" style={{ borderColor: '#e5e1d8' }}>
      {isAuthor && (
        <a
          href={`/threads/${threadId}/edit`}
          className="text-xs font-medium px-3 py-1.5 rounded border transition-colors"
          style={{ borderColor: '#e5e1d8', color: 'var(--color-warm-gray)' }}
        >
          Edit
        </a>
      )}
      {(isAuthor || isAdmin) && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium px-3 py-1.5 rounded border transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--color-deep-red)', color: 'var(--color-deep-red)' }}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      )}
    </div>
  )
}