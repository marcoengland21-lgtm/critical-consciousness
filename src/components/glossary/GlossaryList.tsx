'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import GlossaryVersionHistory from './GlossaryVersionHistory'
import { findGlossaryTermMatches } from '@/lib/glossary-utils'

interface GlossaryEntry {
  id: string
  term: string
  definition: string
  first_appearance_week: number | null
  related_terms: string[] | null
  created_by: string
  creator?: { display_name: string }
  created_at: string
}

interface GlossaryListProps {
  entries: GlossaryEntry[]
  currentUserId: string
  isAdmin: boolean
}

export default function GlossaryList({ entries, currentUserId, isAdmin }: GlossaryListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDef, setEditingDef] = useState('')
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null)

  const filtered = entries.filter(
    (e) =>
      e.term.toLowerCase().includes(search.toLowerCase()) ||
      e.definition.toLowerCase().includes(search.toLowerCase())
  )

  // Group by first letter
  const grouped = filtered.reduce((acc: Record<string, GlossaryEntry[]>, entry) => {
    const letter = entry.term[0]?.toUpperCase() || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(entry)
    return acc
  }, {})

  const letters = Object.keys(grouped).sort()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!term.trim() || !definition.trim()) return
    setSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.from('glossary_entries').insert({
      term: term.trim(),
      definition: definition.trim(),
      created_by: currentUserId,
    })

    if (!error) {
      setTerm('')
      setDefinition('')
      setShowForm(false)
      router.refresh()
    }
    setSubmitting(false)
  }

  async function handleEditSubmit(e: React.FormEvent, entryId: string) {
    e.preventDefault()
    if (!editingDef.trim()) return
    setSubmitting(true)

    const supabase = createClient()

    // Get the current definition before updating
    const currentEntry = entries.find((e) => e.id === entryId)
    if (!currentEntry) {
      setSubmitting(false)
      return
    }

    // Save the old definition to version history
    if (currentEntry.definition !== editingDef.trim()) {
      await supabase.from('glossary_versions').insert({
        entry_id: entryId,
        definition: currentEntry.definition,
        updated_by: currentUserId,
      })
    }

    // Update the entry
    const { error } = await supabase
      .from('glossary_entries')
      .update({
        definition: editingDef.trim(),
        updated_by: currentUserId,
      })
      .eq('id', entryId)

    if (!error) {
      setEditingId(null)
      setEditingDef('')
      router.refresh()
    }
    setSubmitting(false)
  }

  // Render definition with cross-linked glossary terms
  function renderDefinitionWithLinks(definition: string, allTerms: GlossaryEntry[], currentTermId: string) {
    // Find other terms that appear in this definition
    const otherTerms = allTerms.filter((e) => e.id !== currentTermId)
    const matches = findGlossaryTermMatches(definition, otherTerms)

    if (matches.length === 0) {
      return <span>{definition}</span>
    }

    const segments: React.ReactNode[] = []
    let lastEnd = 0

    for (const match of matches) {
      // Add text before match
      if (lastEnd < match.start) {
        segments.push(<span key={`text-${lastEnd}`}>{definition.slice(lastEnd, match.start)}</span>)
      }

      // Add linked term
      segments.push(
        <button
          key={`term-${match.start}`}
          onClick={() => {
            // Scroll to the term in the glossary
            const element = document.getElementById(`glossary-term-${match.term}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
          className="border-b border-dotted transition-colors"
          style={{
            borderColor: 'var(--color-muted-gold)',
            color: 'var(--color-deep-red)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            padding: '0',
            font: 'inherit',
            textDecoration: 'none',
          }}
          title={`Click to see definition of "${match.term}"`}
        >
          {definition.slice(match.start, match.end)}
        </button>
      )

      lastEnd = match.end
    }

    // Add remaining text
    if (lastEnd < definition.length) {
      segments.push(<span key={`text-${lastEnd}`}>{definition.slice(lastEnd)}</span>)
    }

    return segments
  }

  return (
    <div>
      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms..."
          className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#dee2e6', color: 'var(--color-dark-brown)' }}
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          style={{
            backgroundColor: 'var(--color-deep-red)',
            color: 'var(--color-warm-cream)',
          }}
        >
          {showForm ? 'Cancel' : 'Add Term'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border space-y-3" style={{ backgroundColor: 'white', borderColor: '#dee2e6' }}>
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Term (e.g., Commodity Fetishism)"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: '#dee2e6', color: 'var(--color-dark-brown)' }}
            required
          />
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Definition..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
            style={{ borderColor: '#dee2e6', color: 'var(--color-dark-brown)' }}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-deep-red)', color: 'var(--color-warm-cream)' }}
          >
            {submitting ? 'Saving...' : 'Save Term'}
          </button>
        </form>
      )}

      {/* Letter index */}
      {letters.length > 3 && (
        <div className="flex flex-wrap gap-1 mb-6">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors"
              style={{ color: 'var(--color-deep-red)', backgroundColor: 'white', border: '1px solid #dee2e6' }}
            >
              {letter}
            </a>
          ))}
        </div>
      )}

      {/* Entries */}
      {letters.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--color-warm-gray)' }}>
          {search ? 'No terms match your search.' : 'As we work through Capital together, we\'ll build a shared vocabulary here. Stumbled on a term? Add it.'}
        </p>
      ) : (
        <div className="space-y-8">
          {letters.map((letter) => (
            <div key={letter} id={`letter-${letter}`}>
              <h2 className="text-2xl font-bold mb-3 pb-1 border-b" style={{ color: 'var(--color-deep-red)', borderColor: '#dee2e6' }}>
                {letter}
              </h2>
              <div className="space-y-4">
                {grouped[letter].map((entry) => (
                  <div
                    key={entry.id}
                    id={`glossary-term-${entry.term}`}
                    className="p-4 rounded-lg border transition-colors scroll-mt-16"
                    style={{ backgroundColor: 'white', borderColor: '#dee2e6' }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-dark-brown)' }}>
                        {entry.term}
                      </h3>
                      <div className="flex gap-2">
                        {editingId !== entry.id && (
                          <button
                            onClick={() => {
                              setEditingId(entry.id)
                              setEditingDef(entry.definition)
                            }}
                            className="text-xs px-2 py-1 rounded transition-colors"
                            style={{
                              backgroundColor: '#f0f0f0',
                              color: 'var(--color-warm-gray)',
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => setShowVersionHistory(entry.id)}
                          className="text-xs px-2 py-1 rounded transition-colors"
                          style={{
                            backgroundColor: '#e8ddd0',
                            color: 'var(--color-warm-gray)',
                          }}
                        >
                          History
                        </button>
                      </div>
                    </div>

                    {editingId === entry.id ? (
                      <form onSubmit={(e) => handleEditSubmit(e, entry.id)} className="space-y-3">
                        <textarea
                          value={editingDef}
                          onChange={(e) => setEditingDef(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
                          style={{ borderColor: '#dee2e6', color: 'var(--color-dark-brown)' }}
                          required
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50"
                            style={{ backgroundColor: 'var(--color-deep-red)', color: 'var(--color-warm-cream)' }}
                          >
                            {submitting ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null)
                              setEditingDef('')
                            }}
                            className="px-3 py-1 rounded-lg text-sm font-medium"
                            style={{ backgroundColor: '#f0f0f0', color: 'var(--color-warm-gray)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-warm-gray)', lineHeight: '1.75' }}>
                        {renderDefinitionWithLinks(entry.definition, entries, entry.id)}
                      </p>
                    )}

                    {!editingId && entry.related_terms && entry.related_terms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.related_terms.map((rt) => (
                          <span key={rt} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e8ddd0', color: '#5c4a3a' }}>
                            {rt}
                          </span>
                        ))}
                      </div>
                    )}

                    {!editingId && (
                      <div className="mt-2 text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                        Added by {entry.creator?.display_name || 'Unknown'}
                        {entry.first_appearance_week && ` · First appears: Week ${entry.first_appearance_week}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Version history modal */}
      {showVersionHistory && (
        <GlossaryVersionHistory
          entryId={showVersionHistory}
          term={entries.find((e) => e.id === showVersionHistory)?.term || ''}
          onClose={() => setShowVersionHistory(null)}
        />
      )}
    </div>
  )
}
