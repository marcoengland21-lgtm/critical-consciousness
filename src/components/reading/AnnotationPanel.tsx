'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import TimeAgo from '@/components/ui/TimeAgo'

const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

interface Reply {
  id: string
  body: string
  created_at: string
  author?: { id: string; display_name: string }
}

interface Annotation {
  id: string
  chapter_id: string
  author_id: string
  body: string
  quote_exact: string
  position_start: number
  position_end: number
  created_at: string
  thread_id?: string | null
  author?: { id: string; display_name: string }
  replies?: Reply[]
}

interface Props {
  annotation: Annotation
  userId: string | null
  chapterId: string
  onClose: () => void
}

export default function AnnotationPanel({ annotation, userId, chapterId, onClose }: Props) {
  const router = useRouter()
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-resize reply textarea as content grows
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyBody.trim()) return
    setSubmitting(true)

    const supabase = createClient()
    const authorId = userId || GUEST_ID

    const { error } = await supabase.from('annotation_replies').insert({
      annotation_id: annotation.id,
      author_id: authorId,
      body: replyBody.trim(),
    })

    if (!error) {
      setReplyBody('')
      router.refresh()
    }
    setSubmitting(false)
  }

  const replies = annotation.replies || []

  return (
    <>
      {/* Backdrop — subtle darkening */}
      <div
        className="fixed inset-0 z-40 animate-backdrop"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Annotation detail"
        aria-modal="true"
        className="chrome-scoped fixed right-0 top-0 h-full w-full sm:w-96 z-50 shadow-2xl overflow-y-auto animate-slide-in-right"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-default)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 py-4 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
        >
          <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Annotation
          </h3>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full hover-bg-themed transition-colors text-lg"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close annotation panel"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Quoted passage */}
          <div
            className="px-4 py-3 rounded-lg border-l-3"
            style={{
              backgroundColor: 'rgba(107, 76, 154, 0.08)',
              borderLeft: '3px solid var(--accent-purple)',
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.875rem',
              lineHeight: '1.7',
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
            }}
          >
            &ldquo;{annotation.quote_exact}&rdquo;
          </div>

          {/* Annotation body */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AuthorBadge name={annotation.author?.display_name || 'Guest'} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <TimeAgo date={annotation.created_at} />
              </span>
            </div>
            <p
              className="annotation-body"
              style={{
                color: 'var(--text-primary)',
                lineHeight: '1.7',
              }}
            >
              {annotation.body}
            </p>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="space-y-3 pl-3 border-l-2" style={{ borderColor: 'var(--border-default)' }}>
              <h4 className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
              </h4>
              {replies.map((reply) => (
                <div key={reply.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <AuthorBadge name={reply.author?.display_name || 'Guest'} size="sm" />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <TimeAgo date={reply.created_at} />
                    </span>
                  </div>
                  <p
                    className="annotation-body"
                    style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}
                  >
                    {reply.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Continue in thread button (shows when annotation has 2+ replies or already has a thread_id) */}
          {(replies.length >= 2 || annotation.thread_id) && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
              {annotation.thread_id ? (
                <button
                  onClick={() => router.push(`/threads/${annotation.thread_id}`)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-medium btn-transition flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--bg-soft)',
                    color: 'var(--accent-red)',
                    border: '1px solid var(--accent-purple)',
                  }}
                >
                  View in thread →
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Build summary of top replies for thread body
                    const replySummary = replies
                      .slice(0, 2)
                      .map((r) => `> ${r.body}`)
                      .join('\n\n')

                    const threadBody = `${annotation.body}\n\n${replySummary}`

                    const params = new URLSearchParams({
                      quote: annotation.quote_exact,
                      body: threadBody,
                      type: 'passage_pick',
                      chapter_id: annotation.chapter_id,
                      annotation_id: annotation.id,
                    })

                    router.push(`/threads/new?${params.toString()}`)
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm font-medium btn-transition flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--bg-soft)',
                    color: 'var(--accent-red)',
                    border: '1px solid var(--accent-purple)',
                  }}
                >
                  Continue in a thread →
                </button>
              )}
            </div>
          )}

          {/* Reply form */}
          <form onSubmit={handleReply} className="pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <label htmlFor="annotation-reply" className="sr-only">Reply to annotation</label>
            <textarea
              id="annotation-reply"
              value={replyBody}
              onChange={(e) => { setReplyBody(e.target.value); autoResize(e.target) }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder={userId ? 'Reply to this annotation...' : 'Reply as Guest...'}
              rows={2}
              className="input-base text-sm w-full"
              style={{ resize: 'none', lineHeight: '1.6' }}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !replyBody.trim()}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Reply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

/** Small colored initial badge for authors */
function AuthorBadge({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  // Generate a consistent color from the name
  const colors = [
    '#a31545', '#2e7d6e', '#6b4c9a', '#7b6b3d',
    '#6B4C7D', '#2D7A8A', '#8A4B3D', '#4A7B4F',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = colors[Math.abs(hash) % colors.length]
  const initial = name.charAt(0).toUpperCase()

  const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
        {name}
      </span>
    </span>
  )
}
