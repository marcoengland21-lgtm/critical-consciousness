'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { threadTypeConfig } from './ThreadTypeBadge'
import type { ThreadType } from '@/types/database'

interface BranchThreadFormProps {
  /** The thread we're branching FROM */
  parentThreadId: string
  parentThreadTitle: string
  /** The specific reply we're branching from, if any. Null when branching from the OP. */
  parentReplyId: string | null
  /** Author + body of the source — used to pre-populate a blockquote in the new thread. */
  parentExcerpt: {
    author: string
    body: string
  }
  /** Called after a successful branch (also fires before navigation). */
  onSuccess?: () => void
  /** Called when the user cancels — used by the parent to collapse the form. */
  onCancel: () => void
  /** Active group context (L1). Required to scope new thread + branch link. */
  groupId: string
}

/**
 * Inline form for branching a thread off another thread/reply.
 * Per IMPROVEMENTS_PLAN §4.3 — opens INLINE (not as a modal) so the
 * conversation flow isn't broken.
 *
 * On submit it:
 *   1. Inserts a new thread (body pre-populated with a blockquote of the parent).
 *   2. Inserts a thread_branches row linking parent → child.
 *   3. Redirects to the new thread page.
 */
export default function BranchThreadForm({
  parentThreadId,
  parentThreadTitle,
  parentReplyId,
  parentExcerpt,
  onSuccess,
  onCancel,
  groupId,
}: BranchThreadFormProps) {
  const router = useRouter()
  const titleRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [threadType, setThreadType] = useState<ThreadType>('discussion')
  const [body, setBody] = useState(() => {
    // Pre-populate with a blockquote of the parent reply so the connection
    // is visible in the body, not just metadata. Per §4.3.
    const quoted = parentExcerpt.body
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    return `${quoted}\n\n— ${parentExcerpt.author}\n\n`
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Autofocus the title input on mount — the writer should land at the
  // first thing they need to fill in.
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const threadTypes = (Object.entries(threadTypeConfig) as [ThreadType, typeof threadTypeConfig[ThreadType]][]).map(
    ([value, config]) => ({ value, ...config })
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setError('Title and opening message are required.')
      return
    }

    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to branch.')
      setSubmitting(false)
      return
    }

    // Step 1: create the new thread
    const { data: newThread, error: threadError } = await supabase
      .from('threads')
      .insert({
        title: title.trim(),
        body: body.trim(),
        thread_type: threadType,
        author_id: user.id,
        // L1: branched thread inherits the parent's group; trigger
        // additionally enforces parity for thread_branches.
        group_id: groupId,
      })
      .select('id')
      .single()

    if (threadError || !newThread) {
      setError(threadError?.message || 'Failed to create thread.')
      setSubmitting(false)
      return
    }

    // Step 2: link the new thread to its parent via thread_branches.
    // If this fails, the new thread still exists — the user can either
    // delete it or just let it sit (it'll appear without the branch link).
    // We don't roll back because Supabase doesn't support client-side
    // transactions; the thread itself is still useful content.
    const { error: branchError } = await supabase
      .from('thread_branches')
      .insert({
        parent_thread_id: parentThreadId,
        parent_reply_id: parentReplyId,
        child_thread_id: newThread.id,
        branched_by: user.id,
        // L1: scope the link row to the active group; trigger enforces
        // it matches both parent and child group_id.
        group_id: groupId,
      })

    if (branchError) {
      // Surface the error but still navigate — the thread exists.
      console.error('[CCP] Branch link failed (thread created OK):', branchError)
    }

    onSuccess?.()
    router.push(`/threads/${newThread.id}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-4 rounded-lg space-y-3"
      style={{
        backgroundColor: 'var(--bg-card-alt)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header — what we're branching from */}
      <div>
        <p className="text-eyebrow mb-1">
          Branching from {parentReplyId ? 'this reply' : 'this thread'}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          in <em>{parentThreadTitle}</em>
        </p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="branch-title" className="text-xs font-medium block mb-1" style={{ color: 'var(--text-primary)' }}>
          Title
        </label>
        <input
          id="branch-title"
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's this sub-conversation about?"
          className="input-base w-full text-sm"
          maxLength={200}
        />
      </div>

      {/* Type select — keep compact, not the full card grid the new-thread form uses */}
      <div>
        <label htmlFor="branch-type" className="text-xs font-medium block mb-1" style={{ color: 'var(--text-primary)' }}>
          Type
        </label>
        <select
          id="branch-type"
          value={threadType}
          onChange={(e) => setThreadType(e.target.value as ThreadType)}
          className="input-base w-full text-sm"
        >
          {threadTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Opening message — pre-populated with the parent quote */}
      <div>
        <label htmlFor="branch-body" className="text-xs font-medium block mb-1" style={{ color: 'var(--text-primary)' }}>
          Opening message
        </label>
        <textarea
          id="branch-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What do you want the group to think about?"
          rows={6}
          className="input-base w-full text-sm font-mono"
          style={{ fontFamily: '"SF Mono", Menlo, monospace', fontSize: '0.85rem' }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Supports <strong>**bold**</strong>, <em>*italic*</em>, &gt; blockquotes
        </p>
      </div>

      {error && (
        <div className="alert-error text-xs">{error}</div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="btn-ghost text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim()}
          className="btn-primary text-xs"
        >
          {submitting ? 'Branching…' : 'Branch into new thread'}
        </button>
      </div>
    </form>
  )
}
