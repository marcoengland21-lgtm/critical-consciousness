'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TimeAgo from '@/components/ui/TimeAgo'
import MarkdownBody from '@/components/ui/MarkdownBody'

interface ReplyData {
  id: string
  thread_id: string
  parent_reply_id: string | null
  body: string
  author_id: string
  created_at: string
  updated_at: string
  author: {
    id: string
    display_name: string
    role: string
  }
}

interface ReplySectionProps {
  threadId: string
  replies: ReplyData[]
  currentUserId: string
  isAdmin: boolean
}

export default function ReplySection({ threadId, replies: initialReplies, currentUserId, isAdmin }: ReplySectionProps) {
  const [replies, setReplies] = useState<ReplyData[]>(initialReplies)
  const [replyBody, setReplyBody] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [nestedReplyBody, setNestedReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const mainReplyRef = useRef<HTMLTextAreaElement>(null)
  const nestedReplyRefs = useRef<Record<string, HTMLTextAreaElement>>({})
  const editReplyRefs = useRef<Record<string, HTMLTextAreaElement>>({})

  // Auto-expand textarea on input
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.max(80, el.scrollHeight) + 'px'
    }
  }, [])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`replies:${threadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'replies', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new reply with author
            const { data } = await supabase
              .from('replies')
              .select('*, author:profiles!author_id(id, display_name, role)')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setReplies((prev) => [...prev, data])
            }
          } else if (payload.eventType === 'DELETE') {
            setReplies((prev) => prev.filter((r) => r.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setReplies((prev) =>
              prev.map((r) => r.id === payload.new.id ? { ...r, body: payload.new.body, updated_at: payload.new.updated_at } : r)
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [threadId])

  async function submitReply(parentReplyId: string | null = null) {
    const body = parentReplyId ? nestedReplyBody : replyBody
    if (!body.trim()) return

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('replies')
      .insert({
        thread_id: threadId,
        parent_reply_id: parentReplyId,
        body: body.trim(),
        author_id: currentUserId,
      })

    if (!error) {
      if (parentReplyId) {
        setNestedReplyBody('')
        setReplyingTo(null)
      } else {
        setReplyBody('')
      }
    } else {
      console.error('[CCP Debug] Reply submit failed', error)
    }
    setSubmitting(false)
  }

  async function deleteReply(replyId: string) {
    if (!confirm('Delete this reply?')) return
    const supabase = createClient()
    await supabase.from('replies').delete().eq('id', replyId)
  }

  async function updateReply(replyId: string) {
    if (!editBody.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    await supabase.from('replies').update({ body: editBody.trim() }).eq('id', replyId)
    setEditingId(null)
    setEditBody('')
    setSubmitting(false)
  }

  // Build nested reply tree
  const topLevelReplies = replies.filter((r) => !r.parent_reply_id)
  const childReplies = (parentId: string) => replies.filter((r) => r.parent_reply_id === parentId)

  function renderReply(reply: ReplyData, depth: number = 0) {
    const children = childReplies(reply.id)
    const canEdit = reply.author_id === currentUserId
    const canDelete = reply.author_id === currentUserId || isAdmin

    return (
      <div key={reply.id} className={depth > 0 ? 'ml-6 pl-4 border-l-2' : ''} style={{ borderColor: depth > 0 ? 'var(--border-default)' : undefined }}>
        <div className="py-4">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {reply.author?.display_name}
            </span>
            {reply.author?.role === 'admin' && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--bg-card)' }}>
                admin
              </span>
            )}
            <span style={{ color: 'var(--text-secondary)' }}>·</span>
            <TimeAgo date={reply.created_at} />
            {reply.updated_at !== reply.created_at && (
              <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>(edited)</span>
            )}
          </div>

          {editingId === reply.id ? (
            <div className="space-y-2">
              <textarea
                ref={(el) => { if (el) editReplyRefs.current[reply.id] = el }}
                value={editBody}
                onChange={(e) => { setEditBody(e.target.value); autoResize(e.target) }}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none transition-all"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', minHeight: '80px' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateReply(reply.id)}
                  disabled={submitting}
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditBody('') }}
                  className="px-3 py-1 rounded text-xs font-medium border"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <MarkdownBody content={reply.body} className="text-sm" />
          )}

          {/* Reply actions */}
          {editingId !== reply.id && (
            <div className="flex items-center gap-3 mt-2">
              {depth < 3 && (
                <button
                  onClick={() => { setReplyingTo(replyingTo === reply.id ? null : reply.id); setNestedReplyBody('') }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Reply
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => { setEditingId(reply.id); setEditBody(reply.body) }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => deleteReply(reply.id)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent-red)' }}
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Nested reply form */}
          {replyingTo === reply.id && (
            <div className="mt-3 ml-2">
              <textarea
                ref={(el) => { if (el) { nestedReplyRefs.current[reply.id] = el; el.focus() } }}
                value={nestedReplyBody}
                onChange={(e) => { setNestedReplyBody(e.target.value); autoResize(e.target) }}
                placeholder={`Replying to ${reply.author?.display_name}...`}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-none transition-all"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', minHeight: '80px' }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => submitReply(reply.id)}
                  disabled={submitting || !nestedReplyBody.trim()}
                  className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
                <button
                  onClick={() => { setReplyingTo(null); setNestedReplyBody('') }}
                  className="px-3 py-1 rounded text-xs font-medium border"
                  style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Render children */}
        {children.map((child) => renderReply(child, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
      </h2>

      {/* Top-level reply form */}
      <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
        <textarea
          ref={mainReplyRef}
          value={replyBody}
          onChange={(e) => { setReplyBody(e.target.value); autoResize(e.target) }}
          placeholder="Join the conversation..."
          rows={4}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none transition-all mb-3"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', lineHeight: '1.75', minHeight: '120px' }}
        />
        <div className="flex justify-end">
          <button
            onClick={() => submitReply(null)}
            disabled={submitting || !replyBody.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
          >
            {submitting ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      </div>

      {/* Reply tree */}
      <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
        {topLevelReplies.map((reply) => renderReply(reply, 0))}
      </div>

      {replies.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No replies yet. Be the first to respond.
        </p>
      )}
    </div>
  )
}