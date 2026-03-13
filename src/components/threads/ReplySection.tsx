'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TimeAgo from '@/components/ui/TimeAgo'

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
      <div key={reply.id} className={depth > 0 ? 'ml-6 pl-4 border-l-2' : ''} style={{ borderColor: depth > 0 ? '#e5e1d8' : undefined }}>
        <div className="py-4">
          <div className="flex items-center gap-2 mb-2 text-sm">
            <span className="font-medium" style={{ color: 'var(--color-dark-brown)' }}>
              {reply.author?.display_name}
            </span>
            {reply.author?.role === 'admin' && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-soft-sage)', color: 'white' }}>
                admin
              </span>
            )}
            <span style={{ color: 'var(--color-warm-gray)' }}>·</span>
            <TimeAgo date={reply.created_at} />
            {reply.updated_at !== reply.created_at && (
              <span className="text-xs italic" style={{ color: 'var(--color-warm-gray)' }}>(edited)</span>
            )}
          </div>

          {editingId === reply.id ? (
            <div className="space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
                style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateReply(reply.id)}
                  disabled={submitting}
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: 'var(--color-deep-red)', color: 'var(--color-warm-cream)' }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditBody('') }}
                  className="px-3 py-1 rounded text-xs font-medium border"
                  style={{ borderColor: '#e5e1d8', color: 'var(--color-warm-gray)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm" style={{ color: 'var(--color-dark-brown)', lineHeight: '1.75' }}>
              {reply.body}
            </p>
          )}

          {/* Reply actions */}
          {editingId !== reply.id && (
            <div className="flex items-center gap-3 mt-2">
              {depth < 3 && (
                <button
                  onClick={() => { setReplyingTo(replyingTo === reply.id ? null : reply.id); setNestedReplyBody('') }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--color-warm-gray)' }}
                >
                  Reply
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => { setEditingId(reply.id); setEditBody(reply.body) }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--color-warm-gray)' }}
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => deleteReply(reply.id)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--color-deep-red)' }}
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
                value={nestedReplyBody}
                onChange={(e) => setNestedReplyBody(e.target.value)}
                placeholder={`Replying to ${reply.author?.display_name}...`}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
                style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)' }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => submitReply(reply.id)}
                  disabled={submitting || !nestedReplyBody.trim()}
                  className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-deep-red)', color: 'var(--color-warm-cream)' }}
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
                <button
                  onClick={() => { setReplyingTo(null); setNestedReplyBody('') }}
                  className="px-3 py-1 rounded text-xs font-medium border"
                  style={{ borderColor: '#e5e1d8', color: 'var(--color-warm-gray)' }}
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
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-dark-brown)' }}>
        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
      </h2>

      {/* Top-level reply form */}
      <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: 'white', borderColor: '#e5e1d8' }}>
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Join the conversation..."
          rows={4}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-y mb-3"
          style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)', lineHeight: '1.75' }}
        />
        <div className="flex justify-end">
          <button
            onClick={() => submitReply(null)}
            disabled={submitting || !replyBody.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--color-deep-red)', color: 'var(--color-warm-cream)' }}
          >
            {submitting ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      </div>

      {/* Reply tree */}
      <div className="divide-y" style={{ borderColor: '#e5e1d8' }}>
        {topLevelReplies.map((reply) => renderReply(reply, 0))}
      </div>

      {replies.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: 'var(--color-warm-gray)' }}>
          No replies yet. Be the first to respond.
        </p>
      )}
    </div>
  )
}