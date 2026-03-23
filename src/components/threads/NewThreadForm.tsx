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

// Per-type placeholder text — guides the writer toward the thread type's purpose
const placeholderByType: Record<ThreadType, string> = {
  discussion: "What question came up for you during this week's reading?",
  reflection: "What stood out to you? What challenged your thinking?",
  summary: "What were the key points from this week's session?",
  passage_pick: "Which passage do you want the group to look at closely? Use 'Quote from reading' to insert it.",
  connection: "How does this week's reading connect to something outside the text?",
  general: "What's on your mind?",
}

const DRAFT_KEY = 'ccp-thread-draft'

interface NewThreadFormProps {
  weeks: Week[]
  currentWeek?: Week | null
}

export default function NewThreadForm({ weeks, currentWeek }: NewThreadFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Initialize from URL params (from reading page "Start Thread") or saved draft
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [threadType, setThreadType] = useState<ThreadType>('discussion')
  const [weekId, setWeekId] = useState(currentWeek?.id || '')
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
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.')
      return
    }

    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in to post.')
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
      {/* Current week context banner */}
      {currentWeek && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--bg-badge)',
            color: 'var(--text-primary)',
          }}
        >
          <span style={{ color: 'var(--accent-purple)' }}>📖</span>
          <span>
            You&apos;re discussing:{' '}
            <strong>
              Week {currentWeek.week_number} — {currentWeek.title}
            </strong>
          </span>
        </div>
      )}

      {error && (
        <div className="alert-error">
          {error}
        </div>
      )}

      {/* Title — first, most important field */}
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
          className="input-base text-sm w-full"
          required
          autoFocus
        />
      </div>

      {/* Body — second most important */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="body" className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Body
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Supports **bold**, *italic*, &gt; blockquotes
            </span>
            {draftSaved && (
              <span className="text-xs font-medium" style={{ color: 'var(--accent-green)' }}>
                ✓ Draft saved
              </span>
            )}
          </div>
        </div>
        <textarea
          id="body"
          ref={bodyRef}
          value={body}
          onChange={(e) => { setBody(e.target.value); autoResize() }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder={placeholderByType[threadType] || "Share your thoughts, questions, or reflections on the reading..."}
          rows={10}
          className="input-base text-sm w-full"
          style={{ resize: 'none', lineHeight: '1.85', minHeight: '200px' }}
          required
        />
      </div>

      {/* Quote from reading */}
      <button
        type="button"
        onClick={() => setShowQuoteModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium btn-transition"
        style={{
          borderColor: 'var(--accent-purple)',
          borderStyle: 'dashed',
          color: 'var(--accent-purple)',
          backgroundColor: 'transparent',
        }}
      >
        📖 Quote from reading — insert a passage
      </button>

      {/* ── Optional metadata ── */}
      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1.5rem' }}>
        <p className="text-xs font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Optional</p>

        {/* Thread type — collapsed by default, shows current selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Thread type: <strong>{threadTypes.find(t => t.value === threadType)?.label || 'Discussion'}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('thread-type-grid')
                if (el) {
                  const isOpen = el.getAttribute('data-open') === 'true'
                  el.setAttribute('data-open', isOpen ? 'false' : 'true')
                }
              }}
              className="text-xs font-medium"
              style={{ color: 'var(--accent-purple)' }}
            >
              change
            </button>
          </div>
          <div id="thread-type-grid" className="collapsible-content" data-open="false">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {threadTypes.map((t) => {
                const isSelected = threadType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setThreadType(t.value)}
                    className="p-3 rounded-lg border text-left btn-transition text-sm"
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-soft)' : 'var(--bg-card)',
                      borderColor: isSelected ? t.color : 'var(--border-default)',
                      borderWidth: isSelected ? '2px' : '1px',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base" role="img" aria-hidden="true">{t.icon}</span>
                      <span className="font-medium" style={{ color: isSelected ? t.color : 'var(--text-primary)' }}>
                        {t.label}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Week Association */}
        {weeks.length > 0 && (
          <div>
            <label htmlFor="week" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Related Week
            </label>
            <select
              id="week"
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="input-base text-sm w-full"
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
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary text-sm px-6 disabled:opacity-50"
        >
          {submitting ? 'Publishing...' : 'Share with the Group'}
        </button>
      </div>
    </form>
    </>
  )
}
