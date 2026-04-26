'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Editor } from '@tiptap/react'
import { getChapterLabel } from '@/lib/chapter-utils'

interface ReferenceModalProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  /** Optional initial query (used when triggered by `@` typing in the editor). */
  initialQuery?: string
}

interface ChapterRow {
  id: string
  chapter_number: number
  title: string
  content: string
  document: { slug: string } | { slug: string }[] | null
}

interface MatchResult {
  chapterNumber: number
  chapterTitle: string
  documentSlug: string
  matchedText: string  // The matching paragraph
  matchOffset: number  // Position in the chapter for highlight
  contextBefore: string
  contextAfter: string
}

/**
 * Reference modal — chunk 2.5 §5.
 *
 * Search across Capital chapter content and insert the matched passage
 * into the journal entry as a Tiptap blockquote with a citation footer.
 * Or insert just a link to the chapter.
 *
 * Triggered from: toolbar Reference button OR `@` character (Tiptap
 * suggestion plugin — wired in TiptapEditor when this modal is provided).
 */
export default function ReferenceModal({ editor, isOpen, onClose, initialQuery = '' }: ReferenceModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // Fetch all chapters once. Capital is small enough (~30 chapters, ~150kb each)
  // that client-side string match is fast and avoids a server endpoint.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('text_chapters')
      .select('id, chapter_number, title, content, document:text_documents!document_id(slug)')
      .order('chapter_number', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setChapters((data || []) as unknown as ChapterRow[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [isOpen])

  useEffect(() => { setQuery(initialQuery) }, [initialQuery])

  // Keep selection sticky on result change.
  useEffect(() => { setSelectedIdx(null) }, [query])

  // Search — scan each chapter's text for paragraphs containing the query.
  const matches = useMemo<MatchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 2) return []
    const out: MatchResult[] = []
    for (const ch of chapters) {
      const slug = Array.isArray(ch.document) ? ch.document[0]?.slug : ch.document?.slug
      if (!slug) continue
      const text = ch.content
      const paragraphs = text.split(/\n\n+/)
      for (const para of paragraphs) {
        const lower = para.toLowerCase()
        const idx = lower.indexOf(q)
        if (idx === -1) continue
        out.push({
          chapterNumber: ch.chapter_number,
          chapterTitle: ch.title,
          documentSlug: slug,
          matchedText: para.trim(),
          matchOffset: idx,
          contextBefore: '',
          contextAfter: '',
        })
        if (out.length >= 30) break
      }
      if (out.length >= 30) break
    }
    return out
  }, [chapters, query])

  const insertQuote = useCallback((m: MatchResult) => {
    const label = getChapterLabel(m.chapterNumber).label
    const html = `<blockquote><p>${escapeHtml(m.matchedText)}</p><p class="reference-cite">— Capital, Vol I, ${label}</p></blockquote><p></p>`
    editor.chain().focus().insertContent(html).run()
    onClose()
  }, [editor, onClose])

  const insertLink = useCallback((m: MatchResult) => {
    const label = getChapterLabel(m.chapterNumber).label
    const url = `/reading/${m.documentSlug}/${m.chapterNumber}`
    editor
      .chain()
      .focus()
      .insertContent(`<a href="${url}">${escapeHtml(label)}</a> `)
      .run()
    onClose()
  }, [editor, onClose])

  if (!isOpen) return null

  return (
    <Modal title="Reference a passage" onClose={onClose}>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Capital — try 'use-value', 'commodity', 'fetishism'…"
        className="input-base w-full text-sm mb-4"
      />

      {loading && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          Loading chapters…
        </p>
      )}

      {!loading && query.trim().length < 2 && (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          Type at least 2 characters to search.
        </p>
      )}

      {!loading && query.trim().length >= 2 && matches.length === 0 && (
        <p className="text-xs text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          No passages match &ldquo;{query}&rdquo;.
        </p>
      )}

      {!loading && matches.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {matches.map((m, idx) => {
            const label = getChapterLabel(m.chapterNumber).label
            const expanded = selectedIdx === idx
            return (
              <div
                key={idx}
                className="px-3 py-2.5 rounded-md cursor-pointer transition-colors"
                style={{
                  backgroundColor: expanded ? 'var(--bg-card-alt)' : 'transparent',
                  border: '1px solid ' + (expanded ? 'var(--accent-purple)' : 'var(--border-subtle)'),
                }}
                onClick={() => setSelectedIdx(expanded ? null : idx)}
              >
                <p className="text-eyebrow mb-1.5">{label}</p>
                <p
                  className={'text-sm leading-relaxed ' + (expanded ? '' : 'line-clamp-3')}
                  style={{ color: 'var(--text-primary)', fontFamily: "'Lora', Georgia, serif" }}
                >
                  {highlightMatch(m.matchedText, query)}
                </p>
                {expanded && (
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); insertLink(m) }}
                      className="btn-secondary text-xs"
                    >
                      Insert link only
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); insertQuote(m) }}
                      className="btn-primary text-xs"
                    >
                      Insert quote
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim()
  if (!q) return text
  const lower = text.toLowerCase()
  const lq = q.toLowerCase()
  const parts: React.ReactNode[] = []
  let pos = 0
  while (pos < text.length) {
    const idx = lower.indexOf(lq, pos)
    if (idx === -1) {
      parts.push(text.slice(pos))
      break
    }
    if (idx > pos) parts.push(text.slice(pos, idx))
    parts.push(
      <mark key={`m-${idx}`} style={{ backgroundColor: 'rgba(var(--accent-amber-rgb), 0.35)', color: 'inherit' }}>
        {text.slice(idx, idx + lq.length)}
      </mark>
    )
    pos = idx + lq.length
  }
  return <>{parts}</>
}

// ── Shared Modal shell ──────────────────────────────────────────────────────

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg shadow-2xl animate-scale-in"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          marginTop: '5vh',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <h3
            className="text-display-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
