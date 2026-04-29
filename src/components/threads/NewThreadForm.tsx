'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QuoteFromReadingModal from './QuoteFromReadingModal'
import { threadTypeConfig } from './ThreadTypeBadge'
import { getChapterLabel } from '@/lib/chapter-utils'
import type { ThreadType } from '@/types/database'

interface Chapter {
  id: string
  chapter_number: number
  title: string
  sort_order: number
}

// Per-type placeholder text — guides the writer toward the thread type's purpose
const placeholderByType: Record<ThreadType, string> = {
  discussion: "What question came up for you while reading this chapter?",
  reflection: "What stood out to you? What challenged your thinking?",
  summary: "What were the key points from this chapter?",
  passage_pick: "Which passage do you want the group to look at closely? Use 'Quote from reading' to insert it.",
  connection: "How does this chapter connect to something outside the text?",
  general: "What's on your mind?",
}

const DRAFT_KEY = 'ccp-thread-draft'

interface NewThreadFormProps {
  chapters: Chapter[]
  /** The group's current chapter id, from the resolver. Defaults the
   *  chapter selector to "auto-anchor" the thread to whatever the
   *  group is reading right now. NULL when the host hasn't set a
   *  current chapter yet — selector starts unset in that case. */
  currentChapterId: string | null
  /** Active group id (chunk 3b L1). Inserted on the new thread row. */
  groupId: string
}

export default function NewThreadForm({ chapters, currentChapterId, groupId }: NewThreadFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Initialize from URL params (from reading page "Start Thread") or saved draft
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [threadType, setThreadType] = useState<ThreadType>('discussion')
  // Auto-anchor: default to the group's current chapter. Host can
  // override via the chapter selector below if they're starting a
  // thread about a different chapter (going back to revisit, jumping
  // ahead, etc.).
  const [chapterId, setChapterId] = useState<string>(currentChapterId || '')
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

      // Reading page passes the source chapter_id directly — override
      // the current-chapter auto-anchor with the actual chapter the
      // user was reading when they started the thread. This handles
      // the case where the user is reading ahead of the group's
      // current chapter and starts a thread on the chapter they're in.
      if (chapterIdParam) setChapterId(chapterIdParam)
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
          if (parsed.chapterId) setChapterId(parsed.chapterId)
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
        JSON.stringify({ title, body, threadType, chapterId })
      )
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 1000)
    return () => clearTimeout(timer)
  }, [title, body, threadType, chapterId])

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
        // 008: anchor to chapter (NULL if no current chapter and user
        // hasn't picked one). week_id stays NULL for new recurring-mode
        // threads — only legacy / future bounded mode populates it.
        chapter_id: chapterId || null,
        // Chunk 3b L1: scope to active group
        group_id: groupId,
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
      {/* Chapter context banner — shown anchor for honesty about
          platform behavior (the chapter_id getting written gets
          surfaced here so the user sees what's happening). Updates
          live as the user changes the chapter selector below. Renders
          only when a chapter is selected; in the rare pre-seed case
          (no current_chapter_id, user hasn't picked one) the banner
          omits cleanly rather than showing a half-state. */}
      {chapterId && (() => {
        const selectedChapter = chapters.find((c) => c.id === chapterId)
        if (!selectedChapter) return null
        const { label } = getChapterLabel(selectedChapter.chapter_number)
        return (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--bg-badge)',
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ color: 'var(--accent-purple)' }}>📖</span>
            <span>
              This thread is about:{' '}
              <strong>
                {label}: {selectedChapter.title}
              </strong>
            </span>
          </div>
        )
      })()}

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

        {/* Chapter anchor (008). Defaulted to the group's current
            chapter so the common case is no-decision-required for
            the user. Override here to anchor to a different chapter
            (going back to revisit, jumping ahead while reading
            independently, etc.). The banner above updates live when
            the selection changes. */}
        {chapters.length > 0 && (
          <div>
            <label htmlFor="chapter" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Chapter
            </label>
            <select
              id="chapter"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="input-base text-sm w-full"
            >
              <option value="">No specific chapter</option>
              {chapters.map((c) => {
                const { label } = getChapterLabel(c.chapter_number)
                return (
                  <option key={c.id} value={c.id}>
                    {label}: {c.title}
                  </option>
                )
              })}
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
