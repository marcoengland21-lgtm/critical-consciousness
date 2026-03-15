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

const typeConfig: Record<ResourceType, { label: string; icon: string; sectionTitle: string }> = {
  primary_text: { label: 'Primary Text', icon: '📕', sectionTitle: 'Primary Texts' },
  companion: { label: 'Companion', icon: '📗', sectionTitle: 'Companion Texts' },
  lecture: { label: 'Lecture', icon: '🎓', sectionTitle: 'Lectures' },
  article: { label: 'Article', icon: '📰', sectionTitle: 'Articles' },
  tool: { label: 'Tool', icon: '🔧', sectionTitle: 'Tools' },
  other: { label: 'Other', icon: '📎', sectionTitle: 'Other' },
}

// Extract domain from URL for display
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return ''
  }
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
          {Object.entries(typeConfig).map(([key, config]) => (
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
              {Object.entries(typeConfig).map(([key, config]) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource) => {
            const typeInfo = typeConfig[resource.resource_type] || typeConfig.other
            const domain = resource.url ? getDomain(resource.url) : null
            return (
              <div
                key={resource.id}
                className="p-4 rounded-xl border transition-all card-hover flex flex-col"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
              >
                {/* Type icon + badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{typeInfo.icon}</span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                  >
                    {typeInfo.label}
                  </span>
                  {resource.week && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                    >
                      Week {resource.week.week_number}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {resource.title}
                </h3>

                {/* Description */}
                {resource.description && (
                  <p
                    className="text-xs mb-3 flex-1"
                    style={{
                      color: 'var(--text-secondary)',
                      lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {resource.description}
                  </p>
                )}

                {/* Footer: domain + open link */}
                <div className="flex items-center justify-between mt-auto pt-2">
                  {domain && (
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                      {domain}
                    </span>
                  )}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium shrink-0 transition-colors"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      Open →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
