'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Editor } from '@tiptap/react'
import { Modal } from './ReferenceModal'

interface GlossaryModalProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  initialQuery?: string
}

interface GlossaryRow {
  id: string
  term: string
  definition: string
  related_terms: string[] | null
  first_appearance_week: string | null
}

interface WeekRow {
  id: string
  week_number: number
}

/**
 * Glossary modal — chunk 2.5 §5.
 *
 * Search across glossary terms (term + definition) and either insert a
 * link to /glossary?term=X or insert the definition as a blockquote with
 * the term name as attribution.
 *
 * Triggered from: toolbar Glossary button OR `#` character (suggestion plugin).
 */
export default function GlossaryModal({ editor, isOpen, onClose, initialQuery = '' }: GlossaryModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [entries, setEntries] = useState<GlossaryRow[]>([])
  const [weeks, setWeeks] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      supabase
        .from('glossary_entries')
        .select('id, term, definition, related_terms, first_appearance_week')
        .order('term', { ascending: true }),
      supabase
        .from('reading_schedule')
        .select('id, week_number'),
    ]).then(([entriesRes, weeksRes]) => {
      if (cancelled) return
      setEntries((entriesRes.data || []) as GlossaryRow[])
      const wm = new Map<string, number>()
      for (const w of (weeksRes.data || []) as WeekRow[]) wm.set(w.id, w.week_number)
      setWeeks(wm)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [isOpen])

  useEffect(() => { setQuery(initialQuery) }, [initialQuery])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries.slice(0, 30) // show all when query empty
    return entries.filter((e) =>
      e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)
    ).slice(0, 30)
  }, [entries, query])

  const insertLink = useCallback((entry: GlossaryRow) => {
    const url = `/glossary?term=${encodeURIComponent(entry.term.toLowerCase())}`
    editor
      .chain()
      .focus()
      .insertContent(`<a href="${url}">${escapeHtml(entry.term)}</a> `)
      .run()
    onClose()
  }, [editor, onClose])

  const insertQuote = useCallback((entry: GlossaryRow) => {
    const html = `<blockquote><p>${escapeHtml(entry.definition)}</p><p class="reference-cite">— ${escapeHtml(entry.term)} (group glossary)</p></blockquote><p></p>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }, [editor, onClose])

  if (!isOpen) return null

  return (
    <Modal title="Reference a glossary term" onClose={onClose}>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search glossary terms…"
        className="input-base w-full text-sm mb-4"
      />

      {loading && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          Loading glossary…
        </p>
      )}

      {!loading && matches.length === 0 && (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          {query ? `No terms match "${query}"` : 'No terms in the glossary yet.'}
        </p>
      )}

      {!loading && matches.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {matches.map((entry) => {
            const expanded = selectedId === entry.id
            const week = entry.first_appearance_week ? weeks.get(entry.first_appearance_week) : null
            return (
              <div
                key={entry.id}
                className="px-3 py-2.5 rounded-md cursor-pointer transition-colors"
                style={{
                  backgroundColor: expanded ? 'var(--bg-card-alt)' : 'transparent',
                  border: '1px solid ' + (expanded ? 'var(--accent-purple)' : 'var(--border-subtle)'),
                }}
                onClick={() => setSelectedId(expanded ? null : entry.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: "'Lora', Georgia, serif",
                      fontStyle: 'italic',
                    }}
                  >
                    {entry.term}
                  </span>
                  {week && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full leading-none"
                      style={{ backgroundColor: 'var(--bg-badge)', color: 'var(--text-secondary)' }}
                    >
                      W{week}
                    </span>
                  )}
                </div>
                <p
                  className={'text-sm leading-relaxed ' + (expanded ? '' : 'line-clamp-2')}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {entry.definition}
                </p>
                {expanded && entry.related_terms && entry.related_terms.length > 0 && (
                  <p className="text-[11px] mt-2" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                    Related: {entry.related_terms.join(', ')}
                  </p>
                )}
                {expanded && (
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); insertQuote(entry) }}
                      className="btn-secondary text-xs"
                    >
                      Insert as quote
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); insertLink(entry) }}
                      className="btn-primary text-xs"
                    >
                      Insert link
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
