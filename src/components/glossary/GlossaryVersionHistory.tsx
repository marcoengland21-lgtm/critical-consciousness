'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Version {
  id: string
  definition: string
  updated_by: string
  created_at: string
  author?: { display_name: string }
}

interface GlossaryVersionHistoryProps {
  entryId: string
  term: string
  onClose: () => void
}

export default function GlossaryVersionHistory({ entryId, term, onClose }: GlossaryVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadVersions() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('glossary_versions')
          .select(
            `
            id,
            definition,
            updated_by,
            created_at,
            author:profiles!updated_by(display_name)
          `
          )
          .eq('entry_id', entryId)
          .order('created_at', { ascending: false })

        if (!error && data) {
          setVersions(data as unknown as Version[])
        } else if (error) {
          console.error('[CCP Debug] Failed to load version history:', error)
        }
      } catch (error) {
        console.error('[CCP Debug] Failed to load version history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVersions()
  }, [entryId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div
          className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto"
          style={{ backgroundColor: 'var(--color-warm-cream)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ color: 'var(--color-warm-gray)' }}>Loading version history...</p>
        </div>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div
          className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto"
          style={{ backgroundColor: 'var(--color-warm-cream)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-dark-brown)' }}>
              Version History: {term}
            </h3>
          </div>
          <p style={{ color: 'var(--color-warm-gray)' }}>No previous versions found.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-deep-red)',
              color: 'var(--text-inverse)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto"
        style={{ backgroundColor: 'var(--color-warm-cream)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-dark-brown)' }}>
            Version History: {term}
          </h3>

          <div className="space-y-4">
            {versions.map((version, idx) => (
              <div key={version.id} className="relative pb-4">
                {/* Timeline dot */}
                <div className="absolute left-0 top-0 w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--color-muted-gold)' }} />

                {/* Timeline line (not on last item) */}
                {idx < versions.length - 1 && (
                  <div
                    className="absolute left-1.5 top-4 w-0.5 h-12"
                    style={{ backgroundColor: 'var(--border-default)' }}
                  />
                )}

                {/* Version content */}
                <div className="ml-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-deep-red)' }}>
                      {formatDate(version.created_at)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                      Updated by {version.author?.display_name || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-warm-gray)' }}>
                    {version.definition}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
          style={{
            backgroundColor: 'var(--color-deep-red)',
            color: 'var(--text-inverse)',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
