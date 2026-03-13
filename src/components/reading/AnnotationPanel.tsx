'use client'

import { useState, useEffect, useRef } from 'react'
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
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full sm:w-96 z-50 shadow-2xl overflow-y-auto"
        style={{
          backgroundColor: 'white',
          borderLeft: '1px solid #e5e1d8',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 py-4 border-b flex items-center justify-between"
          style={{ backgroundColor: 'white', borderColor: '#e5e1d8' }}
        >
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-dark-brown)' }}>
            Annotation
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-lg"
            style={{ color: 'var(--color-warm-gray)' }}
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Quoted passage */}
          <div
            className="px-4 py-3 rounded-lg border-l-3"
            style={{
              backgroundColor: 'rgba(196, 163, 90, 0.08)',
              borderLeft: '3px solid var(--color-muted-gold)',
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.875rem',
              lineHeight: '1.7',
              fontStyle: 'italic',
              color: 'var(--color-warm-gray)',
            }}
          >
            &ldquo;{annotation.quote_exact}&rdquo;
          </div>

          {/* Annotation body */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AuthorBadge name={annotation.author?.display_name || 'Guest'} />
              <span className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                <TimeAgo date={annotation.created_at} />
              </span>
            </div>
            <p
              className="text-sm"
              style={{
                color: 'var(--color-dark-brown)',
                lineHeight: '1.7',
              }}
            >
              {annotation.body}
            </p>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="space-y-3 pl-3 border-l-2" style={{ borderColor: '#e5e1d8' }}>
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-warm-gray)' }}>
                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
              </h4>
              {replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <AuthorBadge name={reply.author?.display_name || 'Guest'} size="sm" />
                    <span className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                      <TimeAgo date={reply.created_at} />
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-dark-brown)', lineHeight: '1.6' }}>
                    {reply.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Reply form */}
          <form onSubmit={handleReply} className="pt-3 border-t" style={{ borderColor: '#e5e1d8' }}>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={userId ? 'Reply to this annotation...' : 'Reply as Guest...'}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{
                borderColor: '#e5e1d8',
                color: 'var(--color-dark-brown)',
                lineHeight: '1.6',
              }}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !replyBody.trim()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: 'var(--color-deep-red)',
                  color: 'var(--color-warm-cream)',
                }}
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
    '#8B2635', '#2C6B4F', '#4A5899', '#8A6B3D',
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
      <span className="text-xs font-medium" style={{ color: 'var(--color-dark-brown)' }}>
        {name}
      </span>
    </span>
  )
}
