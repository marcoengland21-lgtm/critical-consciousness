'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TimeAgo from '@/components/ui/TimeAgo'
import MarkdownBody from '@/components/ui/MarkdownBody'

// ── Types ───────────────────────────────────────────────────────────────────

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
  threadTitle: string
  replies: ReplyData[]
  currentUserId: string
  isAdmin: boolean
}

// ── Author Avatar ───────────────────────────────────────────────────────────

import { hashColor } from '@/lib/author-colors'

function AuthorAvatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: hashColor(name),
        fontSize: size < 28 ? '10px' : '11px',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ReplySection({
  threadId,
  threadTitle,
  replies: initialReplies,
  currentUserId,
  isAdmin,
}: ReplySectionProps) {
  const [replies, setReplies] = useState<ReplyData[]>(initialReplies)
  const [replyBody, setReplyBody] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyingToAuthor, setReplyingToAuthor] = useState('')
  const [nestedReplyBody, setNestedReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const mainReplyRef = useRef<HTMLTextAreaElement>(null)
  const nestedReplyRefs = useRef<Record<string, HTMLTextAreaElement>>({})
  const editReplyRefs = useRef<Record<string, HTMLTextAreaElement>>({})
  const repliesEndRef = useRef<HTMLDivElement>(null)

  // Auto-expand textarea on input
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.max(44, el.scrollHeight) + 'px'
    }
  }, [])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`replies:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'replies',
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('replies')
              .select('*, author:profiles!author_id(id, display_name, role)')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setReplies((prev) => [...prev, data])
              // Scroll to new reply with smooth animation
              setTimeout(() => {
                repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }
          } else if (payload.eventType === 'DELETE') {
            setReplies((prev) => prev.filter((r) => r.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setReplies((prev) =>
              prev.map((r) =>
                r.id === payload.new.id
                  ? { ...r, body: payload.new.body, updated_at: payload.new.updated_at }
                  : r
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId])

  async function submitReply(parentReplyId: string | null = null) {
    const body = parentReplyId ? nestedReplyBody : replyBody
    if (!body.trim()) return

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('replies').insert({
      thread_id: threadId,
      parent_reply_id: parentReplyId,
      body: body.trim(),
      author_id: currentUserId,
    })

    if (!error) {
      if (parentReplyId) {
        setNestedReplyBody('')
        setReplyingTo(null)
        setReplyingToAuthor('')
      } else {
        setReplyBody('')
        // Reset textarea height
        if (mainReplyRef.current) {
          mainReplyRef.current.style.height = '44px'
        }
      }
    } else {
      console.error('[CCP] Reply submit failed', error)
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
    await supabase
      .from('replies')
      .update({ body: editBody.trim() })
      .eq('id', replyId)
    setEditingId(null)
    setEditBody('')
    setSubmitting(false)
  }

  // Build nested reply tree
  const topLevelReplies = replies.filter((r) => !r.parent_reply_id)
  const childReplies = (parentId: string) =>
    replies.filter((r) => r.parent_reply_id === parentId)

  function renderReply(reply: ReplyData, depth: number = 0) {
    const children = childReplies(reply.id)
    const canEdit = reply.author_id === currentUserId
    const canDelete = reply.author_id === currentUserId || isAdmin
    const authorName = reply.author?.display_name || 'Guest'

    return (
      <div
        key={reply.id}
        className="animate-fade-in"
        style={{
          marginLeft: depth > 0 ? '20px' : 0,
          paddingLeft: depth > 0 ? '12px' : 0,
          borderLeft: depth > 0 ? '2px solid var(--border-default)' : 'none',
        }}
      >
        {/* Discord-style reply layout: avatar left, content right */}
        <div className="flex gap-2.5 py-2 group">
          {/* Avatar */}
          <div className="pt-0.5">
            <AuthorAvatar name={authorName} size={depth > 0 ? 24 : 28} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author line */}
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-sm font-semibold"
                style={{ color: hashColor(authorName) }}
              >
                {authorName}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <TimeAgo date={reply.created_at} />
              </span>
              {reply.updated_at !== reply.created_at && (
                <span
                  className="text-xs italic"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  (edited)
                </span>
              )}
            </div>

            {/* Reply body or edit form */}
            {editingId === reply.id ? (
              <div className="space-y-2 mt-1">
                <textarea
                  ref={(el) => {
                    if (el) editReplyRefs.current[reply.id] = el
                  }}
                  value={editBody}
                  onChange={(e) => {
                    setEditBody(e.target.value)
                    autoResize(e.target)
                  }}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      updateReply(reply.id)
                    }
                  }}
                  rows={2}
                  className="input-base text-sm w-full"
                  style={{ resize: 'none', minHeight: '44px' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateReply(reply.id)}
                    disabled={submitting}
                    className="btn-primary text-xs px-3 py-1"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setEditBody('')
                    }}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <MarkdownBody content={reply.body} className="text-sm" />
            )}

            {/* Actions — show on hover or always on mobile */}
            {editingId !== reply.id && (
              <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-60">
                {depth < 2 && (
                  <button
                    onClick={() => {
                      setReplyingTo(replyingTo === reply.id ? null : reply.id)
                      setReplyingToAuthor(authorName)
                      setNestedReplyBody('')
                    }}
                    className="text-xs font-medium transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Reply
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingId(reply.id)
                      setEditBody(reply.body)
                    }}
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
              <div className="mt-2">
                <div
                  className="text-xs mb-1.5 px-2 py-1 rounded inline-block"
                  style={{
                    backgroundColor: 'var(--bg-badge)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Replying to {replyingToAuthor}
                </div>
                <textarea
                  ref={(el) => {
                    if (el) {
                      nestedReplyRefs.current[reply.id] = el
                      el.focus()
                    }
                  }}
                  value={nestedReplyBody}
                  onChange={(e) => {
                    setNestedReplyBody(e.target.value)
                    autoResize(e.target)
                  }}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      submitReply(reply.id)
                    }
                    if (e.key === 'Escape') {
                      setReplyingTo(null)
                      setNestedReplyBody('')
                    }
                  }}
                  placeholder={`Reply to ${replyingToAuthor}...`}
                  rows={2}
                  className="input-base text-sm w-full"
                  style={{ resize: 'none', minHeight: '44px' }}
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => submitReply(reply.id)}
                    disabled={submitting || !nestedReplyBody.trim()}
                    className="btn-primary text-xs px-3 py-1 disabled:opacity-50"
                  >
                    {submitting ? 'Posting...' : 'Post Reply'}
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setNestedReplyBody('')
                    }}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render children */}
        {children.map((child) => renderReply(child, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      {/* Reply count */}
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
      </h2>

      {/* Reply tree — compact, Discord-style */}
      <div className="space-y-0.5">
        {topLevelReplies.map((reply) => renderReply(reply, 0))}
      </div>

      {/* Scroll anchor */}
      <div ref={repliesEndRef} />

      {replies.length === 0 && (
        <p
          className="text-center py-10 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          No replies yet. Be the first to respond.
        </p>
      )}

      {/* Fixed reply input at bottom — Discord-style message bar */}
      <div
        className="sticky bottom-0 mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-t"
        style={{
          backgroundColor: 'var(--bg-page)',
          borderColor: 'var(--border-default)',
        }}
      >
        {/* Context label */}
        <div className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Replying to thread
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            ref={mainReplyRef}
            value={replyBody}
            onChange={(e) => {
              setReplyBody(e.target.value)
              autoResize(e.target)
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submitReply(null)
              }
            }}
            placeholder="Join the conversation... (⌘+Enter to send)"
            rows={1}
            className="input-base text-sm flex-1"
            style={{ resize: 'none', lineHeight: '1.5', minHeight: '44px', maxHeight: '200px' }}
          />
          <button
            onClick={() => submitReply(null)}
            disabled={submitting || !replyBody.trim()}
            className="btn-primary text-sm px-4 disabled:opacity-50 shrink-0"
            style={{ height: '44px' }}
          >
            {submitting ? '...' : 'Post'}
          </button>
        </div>

        {/* Markdown hint */}
        <div
          className="text-xs mt-1.5"
          style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
        >
          Supports **bold**, *italic*, &gt; blockquotes
        </div>
      </div>
    </div>
  )
}
