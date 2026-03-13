'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ThreadType } from '@/types/database'

interface Week {
  id: string
  week_number: number
  title: string
}

export default function NewThreadForm({ weeks }: { weeks: Week[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [threadType, setThreadType] = useState<ThreadType>('discussion')
  const [weekId, setWeekId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const threadTypes: { value: ThreadType; label: string; description: string }[] = [
    { value: 'discussion', label: 'Discussion', description: 'Open-ended discussion on a topic' },
    { value: 'reflection', label: 'Reflection', description: 'Personal reflection on the reading' },
    { value: 'summary', label: 'Summary', description: 'Summary of key points from the reading' },
    { value: 'passage_pick', label: 'Passage Pick', description: 'Highlight and discuss a specific passage' },
    { value: 'connection', label: 'Connection', description: 'Connect the reading to current events or other texts' },
    { value: 'general', label: 'General', description: 'General conversation or announcements' },
  ]

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

    // TODO: RE-ENABLE AUTH — Restore this check when reviewer access is no longer needed
    // For now, allow guest posting with a fallback author
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

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    router.push(`/threads/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#fef2f2', color: 'var(--color-deep-red)', border: '1px solid var(--color-deep-red)' }}>
          {error}
        </div>
      )}

      {/* Thread Type */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-dark-brown)' }}>
          Thread Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {threadTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setThreadType(t.value)}
              className="p-3 rounded-lg border text-left transition-all text-sm"
              style={{
                backgroundColor: threadType === t.value ? 'var(--color-dark-brown)' : 'white',
                color: threadType === t.value ? 'var(--color-warm-cream)' : 'var(--color-dark-brown)',
                borderColor: threadType === t.value ? 'var(--color-dark-brown)' : '#e5e1d8',
              }}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs mt-0.5 opacity-70">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Week Association (optional) */}
      {weeks.length > 0 && (
        <div>
          <label htmlFor="week" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-dark-brown)' }}>
            Related Week (optional)
          </label>
          <select
            id="week"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)' }}
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
        <label htmlFor="title" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-dark-brown)' }}>
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 'The double character of the commodity' or 'Question about abstract labour'"
          className="w-full px-4 py-3 rounded-lg border text-sm transition-colors focus:outline-none"
          style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)' }}
          required
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="body" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-dark-brown)' }}>
          Body
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts, questions, or reflections on the reading..."
          rows={10}
          className="w-full px-4 py-3 rounded-lg border text-sm resize-y transition-colors focus:outline-none"
          style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)', lineHeight: '1.85' }}
          required
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: '#e5e1d8', color: 'var(--color-warm-gray)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-deep-red)',
            color: 'var(--color-warm-cream)',
          }}
        >
          {submitting ? 'Publishing...' : 'Publish Thread'}
        </button>
      </div>
    </form>
  )
}