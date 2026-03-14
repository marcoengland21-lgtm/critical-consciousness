'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { ResourceType } from '@/types/database'

interface ResourceData {
  id: string
  title: string
  url: string | null
  description: string | null
  resource_type: ResourceType
  week_id: string | null
  created_by: string
  creator?: { display_name: string }
  week?: { week_number: number; title: string }
  created_at: string
}

interface Week {
  id: string
  week_number: number
  title: string
}

const typeLabels: Record<ResourceType, { label: string }> = {
  primary_text: { label: 'Primary Text' },
  companion: { label: 'Companion' },
  lecture: { label: 'Lecture' },
  article: { label: 'Article' },
  tool: { label: 'Tool' },
  other: { label: 'Other' },
}

export default function ResourcesList({
  resources,
  weeks,
  currentUserId,
  isAdmin,
}: {
  resources: ResourceData[]
  weeks: Week[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [resourceType, setResourceType] = useState<ResourceType>('article')
  const [weekId, setWeekId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filtered = filter
    ? resources.filter((r) => r.resource_type === filter)
    : resources

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.from('resources').insert({
      title: title.trim(),
      url: url.trim() || null,
      description: description.trim() || null,
      resource_type: resourceType,
      week_id: weekId || null,
      created_by: currentUserId,
    })

    if (!error) {
      setTitle(''); setUrl(''); setDescription(''); setWeekId('')
      setShowForm(false)
      router.refresh()
    }
    setSubmitting(false)
  }

  return (
    <div>
      {/* Filters and Add */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex flex-wrap gap-2 flex-1">
          <button
            onClick={() => setFilter('')}
            className="px-3 py-1 rounded-full text-sm font-medium border transition-colors"
            style={{
              backgroundColor: !filter ? 'var(--text-primary)' : 'var(--bg-card)',
              color: !filter ? 'var(--bg-page)' : 'var(--text-primary)',
              borderColor: 'var(--text-secondary)',
            }}
          >
            All
          </button>
          {Object.entries(typeLabels).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1 rounded-full text-sm font-medium border transition-colors"
              style={{
                backgroundColor: filter === key ? 'var(--text-primary)' : 'var(--bg-card)',
                color: filter === key ? 'var(--bg-page)' : 'var(--text-primary)',
                borderColor: 'var(--text-secondary)',
              }}
            >
              {config.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
        >
          {showForm ? 'Cancel' : 'Add Resource'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title" className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} required />
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (optional)" className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)" rows={2} className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value as ResourceType)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              {Object.entries(typeLabels).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select value={weekId} onChange={(e) => setWeekId(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
              <option value="">No specific week</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>Week {w.week_number}: {w.title}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}>
            {submitting ? 'Saving...' : 'Save Resource'}
          </button>
        </form>
      )}

      {/* Resource list */}
      {filtered.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Companion texts, lecture videos, and tools to help with the reading will be collected here.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((resource) => {
            const typeInfo = typeLabels[resource.resource_type] || typeLabels.other
            return (
              <div key={resource.id} className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                <div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                      {resource.url ? (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline"
                          style={{ color: 'var(--accent-red)' }}>
                          {resource.title}
                        </a>
                      ) : resource.title}
                    </h3>
                    {resource.description && (
                      <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {resource.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-badge)' }}>
                        {typeInfo.label}
                      </span>
                      {resource.week && (
                        <span>Week {resource.week.week_number}</span>
                      )}
                      <span>by {resource.creator?.display_name || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
