'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { ResourceType, ResourceUseCategory } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResourceData {
  id: string
  title: string
  url: string | null
  description: string | null
  resource_type: ResourceType
  /** Optional purpose-driven grouping per IMPROVEMENTS_PLAN §7.1.
      When null, falls back to the resource_type group. */
  use_category: ResourceUseCategory | null
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

const typeConfig: Record<ResourceType, { label: string; sectionTitle: string }> = {
  primary_text: { label: 'Primary Text', sectionTitle: 'Primary Texts' },
  companion: { label: 'Companion', sectionTitle: 'Companion Texts' },
  lecture: { label: 'Lecture', sectionTitle: 'Lectures' },
  article: { label: 'Article', sectionTitle: 'Articles' },
  tool: { label: 'Tool', sectionTitle: 'Tools' },
  other: { label: 'Other', sectionTitle: 'Other' },
}

/**
 * Use-category groupings — IMPROVEMENTS_PLAN §7.1.
 * Ordered intentionally — newcomer-first.
 */
const useCategoryConfig: Record<
  ResourceUseCategory,
  { label: string; description: string }
> = {
  start_here: {
    label: 'Start here',
    description: 'Best entry-point resources for someone new to the text.',
  },
  for_going_deeper: {
    label: 'For going deeper',
    description: 'More rigorous companions for after the basics.',
  },
  when_stuck: {
    label: "When you're stuck on a passage",
    description: 'Chapter-keyed companion guides.',
  },
  for_today: {
    label: 'For thinking about today',
    description: 'Contemporary applications, current-events lenses.',
  },
  tools_references: {
    label: 'Tools & references',
    description: 'Search engines, archives, the primary text itself.',
  },
}

const USE_CATEGORY_ORDER: ResourceUseCategory[] = [
  'start_here',
  'for_going_deeper',
  'when_stuck',
  'for_today',
  'tools_references',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return ''
  }
}

// ── Resource card ────────────────────────────────────────────────────────────

/**
 * Lighter card per §7.2 — no card-base box, just a hairline above + type
 * label as small text element + Lora italic title + footer row with domain
 * and 'Open →'.
 */
function ResourceCard({ resource }: { resource: ResourceData }) {
  const typeInfo = typeConfig[resource.resource_type] || typeConfig.other
  const domain = resource.url ? getDomain(resource.url) : null

  return (
    <div
      className="flex flex-col py-4 px-2 transition-colors hover-bg-themed"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      {/* Type eyebrow */}
      <p className="text-eyebrow mb-1.5">{typeInfo.label}</p>

      {/* Title */}
      <h3
        className="mb-1.5"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Lora', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: '1.0625rem',
          lineHeight: 1.3,
        }}
      >
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
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resource.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 text-xs">
        {domain && (
          <span className="truncate" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
            {domain}
          </span>
        )}
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium shrink-0 transition-colors"
            style={{ color: 'var(--accent-red)' }}
          >
            Open →
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ResourcesList({
  resources,
  weeks,
  currentUserId,
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
  const [useCategory, setUseCategory] = useState<ResourceUseCategory | ''>('')
  const [weekId, setWeekId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(
    () => (filter ? resources.filter((r) => r.resource_type === filter) : resources),
    [resources, filter]
  )

  // Group by use_category (default view). Resources whose use_category is
  // null fall into a "More resources" bucket grouped by type — backward-compat
  // for existing rows that haven't been categorised yet.
  const groupedByUseCategory = useMemo(() => {
    const byCat = new Map<ResourceUseCategory, ResourceData[]>()
    const uncategorised: ResourceData[] = []
    for (const r of resources) {
      if (r.use_category) {
        const arr = byCat.get(r.use_category) || []
        arr.push(r)
        byCat.set(r.use_category, arr)
      } else {
        uncategorised.push(r)
      }
    }
    return { byCat, uncategorised }
  }, [resources])

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
      use_category: useCategory || null,
      week_id: weekId || null,
      created_by: currentUserId,
    })

    if (!error) {
      setTitle(''); setUrl(''); setDescription(''); setWeekId(''); setUseCategory('')
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value as ResourceType)}
              className="input-base text-sm">
              {Object.entries(typeConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={useCategory}
              onChange={(e) => setUseCategory(e.target.value as ResourceUseCategory | '')}
              className="input-base text-sm"
              title="When would someone want this resource?"
            >
              <option value="">— Use category (optional) —</option>
              {USE_CATEGORY_ORDER.map((k) => (
                <option key={k} value={k}>{useCategoryConfig[k].label}</option>
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
        /* Flat grid when a specific TYPE is selected — refinement view.
           Uses the lighter hairline cards in a 1/2/3 column grid. */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        /* Default view: grouped by USE_CATEGORY with a fallback bucket
           for resources that haven't been tagged yet (per §7.1). */
        <div className="space-y-12">
          {USE_CATEGORY_ORDER.map((cat) => {
            const list = groupedByUseCategory.byCat.get(cat) || []
            if (list.length === 0) return null
            const cfg = useCategoryConfig[cat]
            return (
              <section key={cat}>
                <div className="mb-4">
                  <p className="text-eyebrow mb-2">
                    {cfg.label} — {list.length}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
                    {cfg.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
                  {list.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </section>
            )
          })}

          {/* Uncategorised — fallback to type-based grouping for back-compat */}
          {groupedByUseCategory.uncategorised.length > 0 && (
            <section>
              <div className="mb-4">
                <p className="text-eyebrow mb-2">
                  More resources — {groupedByUseCategory.uncategorised.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '60ch' }}>
                  Resources that haven&apos;t been tagged with a use category yet.
                </p>
              </div>
              <div className="space-y-8">
                {(Object.entries(typeConfig) as [ResourceType, typeof typeConfig[ResourceType]][]).map(([type, config]) => {
                  const typeResources = groupedByUseCategory.uncategorised.filter((r) => r.resource_type === type)
                  if (typeResources.length === 0) return null
                  return (
                    <div key={type}>
                      <p className="text-eyebrow mb-2">
                        {config.sectionTitle}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
                        {typeResources.map((resource) => (
                          <ResourceCard key={resource.id} resource={resource} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
