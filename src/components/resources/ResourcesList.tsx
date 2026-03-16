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

// Reusable resource card component
function ResourceCard({ resource }: { resource: ResourceData }) {
  const typeInfo = typeConfig[resource.resource_type] || typeConfig.other
  const domain = resource.url ? getDomain(resource.url) : null

  return (
    <div
      className="card-base p-4 transition-all card-hover flex flex-col"
    >
      {/* Type badge + week */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full leading-none"
          style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
        >
          <span className="text-[10px]">{typeInfo.icon}</span>
          {typeInfo.label}
        </span>
        {resource.week && (
          <span
            className="text-xs px-2 py-1 rounded-full leading-none"
            style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
          >
            Week {resource.week.week_number}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--text-primary)' }}
          >
            {resource.title}
          </a>
        ) : (
          resource.title
        )}
      </h3>

      {/* Description */}
      {resource.description && (
        <p
          className="text-xs mb-3 flex-1"
          style={{
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            display: '-webkit-box',
            WebkitLineClamp: 3,
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
            className={`filter-pill ${!filter ? 'filter-pill-active' : ''}`}
          >
            All
          </button>
          {Object.entries(typeConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`filter-pill ${filter === key ? 'filter-pill-active' : ''}`}
            >
              {config.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm whitespace-nowrap"
        >
          {showForm ? 'Cancel' : 'Add Resource'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-base card-body mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title" className="input-base text-sm" required />
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (optional)" className="input-base text-sm" />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)" rows={2} className="input-base text-sm w-full resize-y" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value as ResourceType)}
              className="input-base text-sm">
              {Object.entries(typeConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select value={weekId} onChange={(e) => setWeekId(e.target.value)}
              className="input-base text-sm">
              <option value="">No specific week</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>Week {w.week_number}: {w.title}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={submitting}
            className="btn-primary text-sm disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Resource'}
          </button>
        </form>
      )}

      {/* Resource list */}
      {filtered.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Companion texts, lecture videos, and tools to help with the reading will be collected here.
        </p>
      ) : filter ? (
        /* Flat grid when a specific type is filtered */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        /* Grouped by type when showing "All" */
        <div className="space-y-10">
          {(Object.entries(typeConfig) as [ResourceType, typeof typeConfig[ResourceType]][]).map(([type, config]) => {
            const typeResources = resources.filter((r) => r.resource_type === type)
            if (typeResources.length === 0) return null
            return (
              <section key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">{config.icon}</span>
                  <h2
                    className="text-base font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {config.sectionTitle}
                  </h2>
                  <span
                    className="text-xs px-2 py-1 rounded-full leading-none"
                    style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                  >
                    {typeResources.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
