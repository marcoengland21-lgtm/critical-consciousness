'use client'

import { useState, useCallback } from 'react'

interface SessionWarmupProps {
  weekTitle: string
  prompt: string
  existingResponse?: string
  onSubmit?: (response: string) => Promise<void>
}

/**
 * Session Warmup Prompt
 *
 * Shows 24-48 hours before a session with a focused question and
 * single textarea. Lowest-barrier participation — write one thought
 * before arriving.
 *
 * Why this matters: Maria (50, never posted online) writes one private
 * thought before the session. By the time she arrives, she has something
 * to say. The warmup transforms passive attendance into prepared engagement.
 */
export default function SessionWarmup({
  weekTitle,
  prompt,
  existingResponse,
  onSubmit,
}: SessionWarmupProps) {
  const [response, setResponse] = useState(existingResponse || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingResponse)

  const handleSubmit = useCallback(async () => {
    if (!response.trim() || !onSubmit) return
    setIsSubmitting(true)
    try {
      await onSubmit(response.trim())
      setSubmitted(true)
    } catch (error) {
      console.error('Failed to save warmup:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [response, onSubmit])

  return (
    <div
      className="card-base overflow-hidden"
      style={{
        borderLeft: '3px solid var(--accent-amber)',
        backgroundColor: 'rgba(var(--accent-amber-rgb), 0.03)',
      }}
    >
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{
              backgroundColor: 'rgba(var(--accent-amber-rgb), 0.12)',
              color: 'var(--accent-amber)',
            }}
          >
            🔥
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Session Warmup
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {weekTitle} — prepare a thought before we meet
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="card-body pt-0">
        {/* Prompt */}
        <p
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}
        >
          {prompt}
        </p>

        {submitted ? (
          /* Submitted state */
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: 'rgba(var(--accent-green-rgb), 0.06)',
              border: '1px solid rgba(var(--accent-green-rgb), 0.15)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-green)' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-xs font-medium" style={{ color: 'var(--accent-green)' }}>
                Ready for the session
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              &ldquo;{response}&rdquo;
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 text-[11px] btn-transition"
              style={{ color: 'var(--text-secondary)' }}
            >
              Edit response
            </button>
          </div>
        ) : (
          /* Input state */
          <>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write a thought, question, or observation..."
              className="input-base w-full text-sm resize-none"
              rows={3}
              style={{ lineHeight: 1.6 }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Only you and the group will see this
              </span>
              <button
                onClick={handleSubmit}
                disabled={!response.trim() || isSubmitting}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
