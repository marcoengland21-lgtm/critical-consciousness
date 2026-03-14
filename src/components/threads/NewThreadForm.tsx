'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QuoteFromReadingModal from './QuoteFromReadingModal'
import { threadTypeConfig } from './ThreadTypeBadge'
import type { ThreadType } from '@/types/database'

interface Week {
  id: string
  week_number: number
  title: string
}

const DRAFT_KEY = 'ccp-thread-draft'

export default function NewThreadForm({ weeks }: { weeks: Week[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Initialize from URL params (from reading page "Start Thread") or saved draft
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [threadType, setThreadType] = useState<ThreadType>('discussion')
  const [weekId, setWeekId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)

  // Load from URL params or localStorage draft on mount
  useEffect(() => {
    const quoteParam = searchParams.get('quote')
    const bodyParam = searchParams.get('body')
    const typeParam = searchParams.get('type') as ThreadType | null
    const chapterParam = searchParams.get('chapter')
    const sectionParam = searchParams.get('section')
    const chapterIdParam = searchParams.get('chapter_id')
    const annotationIdParam = searchParams.get('annotation_id')

    if (quoteParam || bodyParam) {
      // Came from reading page — pre-fill with quote
      if (bodyParam) {
        // Use full body from params (e.g., when promoting annotation)
        setBody(bodyParam)
      } else {
        // Legacy: just quote param
        const sectionInfo = sectionParam ? ` (Section ${chapterParam}: ${sectionParam})` : ''
        setBody(`> ${quoteParam}\n\n`)
      }
      if (typeParam) setThreadType(typeParam)
      const displayQuote = quoteParam || bodyParam?.slice(0, 60)
      setTitle(`On: "${displayQuote && displayQuote.length > 60 ? displayQuote.slice(0, 60) + '…' : displayQuote}"`)

      // Store chapter_id and annotation_id in sessionStorage for later use during thread creation
      if (chapterIdParam) sessionStorage.setItem('_temp_chapter_id', chapterIdParam)
      if (annotationIdParam) sessionStorage.setItem('_temp_annotation_id', annotationIdParam)
    } else {
      // Try to restore draft from localStorage
      try {
        const draft = localStorage.getItem(DRAFT_KEY)
        if (draft) {
          const parsed = JSON.parse(draft)
          if (parsed.title) setTitle(parsed.title)
          if (parsed.body) setBody(parsed.body)
          if (parsed.threadType) setThreadType(parsed.threadType)
          if (parsed.weekId) setWeekId(parsed.weekId)
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [searchParams])

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    if (!title && !body) return
    const timer = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ title, body, threadType, weekId })
      )
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 1000)
    return () => clearTimeout(timer)
  }, [title, body, threadType, weekId])

  // Auto-expand textarea
  const autoResize = useCallback(() => {
    const el = bodyRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.max(200, el.scrollHeight) + 'px'
    }
  }, [])

  // Handle quote insertion
  function handleQuoteSelected(quote: string) {
    const el = bodyRef.current
    if (!el) return

    const start = el.selectionStart
    const end = el.selectionEnd
    const newBody = body.slice(0, start) + quote + '\n\n' + body.slice(end)

    setBody(newBody)
    // Schedule focus and cursor positioning after state update
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + quote.length + 2, start + quote.length + 2)
    }, 0)
  }

  useEffect(() => {
    autoResize()
  }, [body, autoResize])

  const threadTypes = (Object.entries(threadTypeConfig) as [ThreadType, typeof threadTypeConfig[ThreadType]][]).map(
    ([value, config]) => ({ value, ...config })
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('[CCP Debug] Thread submit', { title: title.slice(0, 40), threadType, weekId, bodyLength: body.length })
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.')
      return
    }

    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[CCP Debug] Thread submit auth', { userId: user?.id || 'none' })

    // TODO: RE-ENABLE AUTH — Restore this check when reviewer access is no longer needed
    if (!user) {
      setError('You must be logged in to post. Guest posting coming soon.')
      setSubmitting(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('threads')
      .insert({
        title: title.trim(),
        body: body.trim(),
        thread_type: threadType,
        author_id: user.id,
        week_id: weekId || null,
      })
      .select('id')
      .single()

    console.log('[CCP Debug] Thread insert result', { data, error: insertError })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // If this was created from an annotation, update the annotation with the thread_id
    const annotationId = sessionStorage.getItem('_temp_annotation_id')
    if (annotationId && data) {
      await supabase
        .from('annotations')
        .update({ thread_id: data.id })
        .eq('id', annotationId)
    }

    // Clean up temporary storage
    sessionStorage.removeItem('_temp_chapter_id')
    sessionStorage.removeItem('_temp_annotation_id')

    // Clear draft on successful publish
    localStorage.removeItem(DRAFT_KEY)
    router.push(`/threads/${data.id}`)
  }

  return (
    <>
      {showQuoteModal && (
        <QuoteFromReadingModal
          onQuoteSelected={handleQuoteSelected}
          onClose={() => setShowQuoteModal(false)}
        />
      )}
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-soft)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)' }}>
          {error}
        </div>
      )}

      {/* Thread Type */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Thread Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {threadTypes.map((t) => {
            const isSelected = threadType === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setThreadType(t.value)}
                className="p-3 rounded-lg border text-left transition-all text-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: isSelected ? t.color : 'var(--border-default)',
                  borderWidth: isSelected ? '2px' : '1px',
                }}
              >
                <span className="font-medium" style={{ color: isSelected ? t.color : 'var(--text-primary)' }}>
                  {t.label}
                </span>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{t.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Week Association (optional) */}
      {weeks.length > 0 && (
        <div>
          <label htmlFor="week" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Related Week (optional)
          </label>
          <select
            id="week"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          >
            <option value="">No specific week</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                Week {w.week_number}: {w.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 'The double character of the commodity' or 'Question about abstract labour'"
          className="w-full px-4 py-3 rounded-lg border text-sm transition-colors focus:outline-none"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          required
        />
      </div>

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="body" className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Body
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Supports **bold**, *italic*, &gt; blockquotes
              {draftSaved && (
                <span className="ml-2 text-xs" style={{ color: 'var(--bg-soft)' }}>
                  Draft saved
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowQuoteModal(true)}
              className="px-2 py-1 text-xs font-medium rounded transition-colors"
              style={{
                backgroundColor: 'var(--bg-soft)',
                color: 'var(--accent-red)',
                border: '1px solid var(--accent-purple)',
              }}
            >
              Quote from reading
            </button>
          </div>
        </div>
        <textarea
          id="body"
          ref={bodyRef}
          value={body}
          onChange={(e) => { setBody(e.target.value); autoResize() }}
          placeholder="Share your thoughts, questions, or reflections on the reading..."
          rows={10}
          className="w-full px-4 py-3 rounded-lg border text-sm resize-none transition-colors focus:outline-none"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', lineHeight: '1.85', minHeight: '200px' }}
          required
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent-red)',
            color: 'var(--text-inverse)',
          }}
        >
          {submitting ? 'Publishing...' : 'Share with the Group'}
        </button>
      </div>
    </form>
    </>
  )
}
