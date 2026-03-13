'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
          style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)' }}
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
        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border space-y-3" style={{ backgroundColor: 'white', borderColor: '#e5e1d8' }}>
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Term (e.g., Commodity Fetishism)"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)' }}
            required
          />
          <textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Definition..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border text-sm resize-y"
            style={{ borderColor: '#e5e1d8', color: 'var(--color-dark-brown)' }}
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
              style={{ color: 'var(--color-deep-red)', backgroundColor: 'white', border: '1px solid #e5e1d8' }}
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
              <h2 className="text-2xl font-bold mb-3 pb-1 border-b" style={{ color: 'var(--color-deep-red)', borderColor: '#e5e1d8' }}>
                {letter}
              </h2>
              <div className="space-y-4">
                {grouped[letter].map((entry) => (
                  <div key={entry.id} className="p-4 rounded-lg border" style={{ backgroundColor: 'white', borderColor: '#e5e1d8' }}>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-dark-brown)' }}>
                      {entry.term}
                    </h3>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-warm-gray)', lineHeight: '1.75' }}>
                      {entry.definition}
                    </p>
                    {entry.related_terms && entry.related_terms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.related_terms.map((rt) => (
                          <span key={rt} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e8ddd0', color: '#5c4a3a' }}>
                            {rt}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-xs" style={{ color: 'var(--color-warm-gray)' }}>
                      Added by {entry.creator?.display_name || 'Unknown'}
                      {entry.first_appearance_week && ` · First appears: Week ${entry.first_appearance_week}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
