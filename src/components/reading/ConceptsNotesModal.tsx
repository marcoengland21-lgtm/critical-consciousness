'use client'

/**
 * ConceptsNotesModal — chunk 3b piece 2c-ii.
 *
 * Triggered by the notebook icon in the chapter top toolbar (frame 02).
 * Centered modal — NOT a slide-over (that pattern was rejected per the
 * design pack). Two columns at desktop, tabs at mobile (frame 09D).
 *
 *   CHAPTER 1, §1 · WORKSPACE                                  [ × ]
 *   Concepts & notes
 *
 *   CONCEPTS IN THIS SECTION  · 3 INTRODUCED   YOUR PRIVATE NOTES · …
 *   commodity                            →     Nothing here yet.
 *   introduced here · 6 connections             {empty-state copy}
 *   use-value                            →     [+ Start a note on this chapter]
 *   introduced here · 4 connections             NOTES ARE PRIVATE…
 *   exchange-value                       →
 *   introduced here · 5 connections
 *   Earlier terms — wealth, mode of
 *   production — live in the glossary,
 *   where the cross-chapter map belongs.
 *
 *   📖 You've stepped away from reading.            ESC TO CLOSE
 *   Close to return — the chapter is right where you left it.
 *
 * Concept item click → opens the GlossaryPopover anchored to the
 * clicked button. The popover stacks above the modal (per the
 * stacking rule fix in chunk 3b piece 2c-ii: same-kind chains
 * forbidden, lighter-on-heavier always allowed).
 *
 * "+ Start a note on this chapter" → routes to
 * /journal/new?chapter_id=X. The new entry inherits chapter_id at
 * insert time so it shows up in this modal's right column when the
 * user reopens it.
 *
 * Body scope (modal default).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Modal, useMediaQuery } from '@/components/overlay'
import { createClient } from '@/lib/supabase/client'
import GlossaryPopover from './GlossaryPopover'

interface ConceptsNotesModalProps {
  open: boolean
  onClose: () => void
  /** UUID of the current chapter — drives the notes filter. */
  chapterId: string
  /** UUID of the chapter's reading week — drives the concepts filter
      via `glossary_entries.first_appearance_week`. May be null when
      the chapter is unscheduled (modal then shows an empty concepts
      column with a helpful note). */
  weekId: string | null
  /** "Chapter 1, §1" — used in the modal eyebrow. */
  chapterLabel: string
  /** Current user. Notes are filtered by user_id; null = guest, no
      notes column at all. */
  userId: string | null
}

interface ConceptRow {
  id: string
  term: string
  connectionCount: number
}

interface NoteRow {
  id: string
  title: string | null
  body_text: string
  word_count: number
  created_at: string
  updated_at: string
}

const MOBILE_BREAKPOINT = '(max-width: 479px)'

export default function ConceptsNotesModal({
  open,
  onClose,
  chapterId,
  weekId,
  chapterLabel,
  userId,
}: ConceptsNotesModalProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const [activeTab, setActiveTab] = useState<'concepts' | 'notes'>('concepts')

  // Glossary popover state — concept click opens popover anchored to
  // the clicked item. Popover stacks ABOVE the modal per piece 1
  // stacking rule (same-kind chains forbidden; lighter-on-heavier
  // always allowed).
  const conceptAnchorRef = useRef<HTMLElement | null>(null)
  const [glossaryOpen, setGlossaryOpen] = useState<{ term: string } | null>(null)

  // Fetched data
  const [concepts, setConcepts] = useState<ConceptRow[] | null>(null)
  const [notes, setNotes] = useState<NoteRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch on open. Re-fetch if chapter or user changes.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const supabase = createClient()

    async function fetchAll() {
      // Concepts: glossary entries where first_appearance_week matches
      // the current chapter's week_id. Connection counts come from
      // concept_edges (counted as undirected — either direction).
      let conceptRows: ConceptRow[] = []
      if (weekId) {
        const { data: terms, error: termsError } = await supabase
          .from('glossary_entries')
          .select('id, term')
          .eq('first_appearance_week', weekId)
          .order('term', { ascending: true })

        if (termsError) {
          console.error('[CCP] Concepts fetch failed:', termsError)
        } else if (terms && terms.length > 0) {
          // For each term, count edges (undirected).
          const termIds = (terms as { id: string }[]).map((t) => t.id)
          const { data: edges } = await supabase
            .from('concept_edges')
            .select('from_term_id, to_term_id')
            .or(
              `from_term_id.in.(${termIds.join(',')}),to_term_id.in.(${termIds.join(',')})`
            )

          const counts = new Map<string, number>()
          for (const id of termIds) counts.set(id, 0)
          if (edges) {
            for (const e of edges as { from_term_id: string; to_term_id: string }[]) {
              if (counts.has(e.from_term_id)) {
                counts.set(e.from_term_id, (counts.get(e.from_term_id) ?? 0) + 1)
              }
              if (counts.has(e.to_term_id) && e.to_term_id !== e.from_term_id) {
                counts.set(e.to_term_id, (counts.get(e.to_term_id) ?? 0) + 1)
              }
            }
          }
          conceptRows = (terms as { id: string; term: string }[]).map((t) => ({
            id: t.id,
            term: t.term,
            connectionCount: counts.get(t.id) ?? 0,
          }))
        }
      }

      // Notes: private_notes for this chapter + user. RLS already
      // enforces user_id; the explicit .eq is defence-in-depth.
      let noteRows: NoteRow[] = []
      if (userId) {
        const { data: ns, error: nsError } = await supabase
          .from('private_notes')
          .select('id, title, body_text, word_count, created_at, updated_at')
          .eq('user_id', userId)
          .eq('chapter_id', chapterId)
          .order('updated_at', { ascending: false })

        if (nsError) {
          console.error('[CCP] Notes fetch failed:', nsError)
        } else if (ns) {
          noteRows = ns as NoteRow[]
        }
      }

      if (!cancelled) {
        setConcepts(conceptRows)
        setNotes(noteRows)
        setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [open, chapterId, weekId, userId])

  const handleConceptClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, term: string) => {
      conceptAnchorRef.current = e.currentTarget
      setGlossaryOpen({ term })
    },
    []
  )

  const conceptsCount = concepts?.length ?? 0
  const notesCount = notes?.length ?? 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      scope="body"
      eyebrow={`${chapterLabel} · Workspace`}
      title="Concepts & notes"
      maxWidth={840}
      ariaLabel="Concepts and notes for this chapter"
      showEscIndicator
      footer={
        <span
          className="text-xs flex items-center gap-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <BookIcon />
          You&apos;ve stepped away from reading. Close to return — the chapter is right where you left it.
        </span>
      }
    >
      {/* Mobile tabs */}
      {isMobile && (
        <div
          className="flex gap-1 px-4 pt-3 pb-2 sticky top-0"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <TabButton
            active={activeTab === 'concepts'}
            onClick={() => setActiveTab('concepts')}
            label={`Concepts (${conceptsCount})`}
          />
          <TabButton
            active={activeTab === 'notes'}
            onClick={() => setActiveTab('notes')}
            label={`Your notes (${notesCount})`}
          />
        </div>
      )}

      <div
        className={
          isMobile
            ? 'p-5'
            : 'grid grid-cols-2 gap-8 px-6 py-6'
        }
      >
        {/* Concepts column */}
        {(!isMobile || activeTab === 'concepts') && (
          <ConceptsColumn
            concepts={concepts}
            loading={loading}
            onConceptClick={handleConceptClick}
          />
        )}

        {/* Notes column */}
        {(!isMobile || activeTab === 'notes') && (
          <NotesColumn
            notes={notes}
            loading={loading}
            chapterId={chapterId}
            onClose={onClose}
            isGuest={!userId}
          />
        )}
      </div>

      {/* Glossary popover stacked ABOVE the modal — concept click
          opens it anchored to the clicked button. */}
      {glossaryOpen && (
        <GlossaryPopover
          open={!!glossaryOpen}
          onClose={() => setGlossaryOpen(null)}
          anchor={conceptAnchorRef}
          initialTerm={glossaryOpen.term}
        />
      )}
    </Modal>
  )
}

// ── Concepts column ────────────────────────────────────────────────────

function ConceptsColumn({
  concepts,
  loading,
  onConceptClick,
}: {
  concepts: ConceptRow[] | null
  loading: boolean
  onConceptClick: (e: React.MouseEvent<HTMLButtonElement>, term: string) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-eyebrow">Concepts in this section</p>
        {concepts && concepts.length > 0 && (
          <p className="text-eyebrow" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
            {concepts.length} introduced
          </p>
        )}
      </div>

      {loading && !concepts && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading…
        </p>
      )}

      {concepts && concepts.length === 0 && !loading && (
        <p
          className="text-sm italic"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          No concepts introduced in this section yet.
        </p>
      )}

      {concepts && concepts.length > 0 && (
        <div className="space-y-3">
          {concepts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={(e) => onConceptClick(e, c.term)}
              className="w-full text-left p-3 rounded-md transition-colors hover-bg-themed flex items-center justify-between gap-3"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <div className="min-w-0">
                <h3
                  className="mb-0.5"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: '1.125rem',
                    lineHeight: 1.2,
                  }}
                >
                  {c.term}
                </h3>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  introduced here · {c.connectionCount}{' '}
                  {c.connectionCount === 1 ? 'connection' : 'connections'}
                </p>
              </div>
              <span
                className="flex-shrink-0"
                style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
                aria-hidden="true"
              >
                <ArrowRightIcon />
              </span>
            </button>
          ))}
        </div>
      )}

      {concepts && concepts.length > 0 && (
        <p
          className="text-xs mt-4 italic"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}
        >
          Earlier terms — wealth, mode of production — live in the glossary, where the cross-chapter map belongs.
        </p>
      )}
    </div>
  )
}

// ── Notes column ───────────────────────────────────────────────────────

function NotesColumn({
  notes,
  loading,
  chapterId,
  onClose,
  isGuest,
}: {
  notes: NoteRow[] | null
  loading: boolean
  chapterId: string
  onClose: () => void
  isGuest: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-eyebrow">Your private notes</p>
        <p className="text-eyebrow" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
          Visible only to you
        </p>
      </div>

      {isGuest && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Sign in to keep private notes on this chapter.
        </p>
      )}

      {!isGuest && loading && !notes && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading…
        </p>
      )}

      {!isGuest && notes && notes.length === 0 && !loading && (
        <div className="space-y-4">
          <h3
            style={{
              color: 'var(--text-primary)',
              fontFamily: "'Lora', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '1.5rem',
              lineHeight: 1.2,
            }}
          >
            Nothing here yet.
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Notes on a chapter live here — half-formed thoughts, things to bring to the next session, the question you almost forgot.
          </p>
          <Link
            href={`/journal/new?chapter_id=${encodeURIComponent(chapterId)}`}
            onClick={onClose}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <PlusIcon />
            Start a note on this chapter
          </Link>
          <p className="text-eyebrow mt-4" style={{ color: 'var(--text-secondary)', opacity: 0.7, lineHeight: 1.4 }}>
            Notes are private. Annotations on a passage are how you talk to the group.
          </p>
        </div>
      )}

      {!isGuest && notes && notes.length > 0 && (
        <div className="space-y-3">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/journal/${n.id}`}
              onClick={onClose}
              className="block p-3 rounded-md transition-colors hover-bg-themed"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <h4
                className="mb-1"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: "'Lora', Georgia, serif",
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: '1.0625rem',
                  lineHeight: 1.3,
                }}
              >
                {n.title || `Untitled — ${formatDate(n.updated_at)}`}
              </h4>
              {n.body_text && (
                <p
                  className="text-sm"
                  style={{
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.body_text.slice(0, 180)}
                  {n.body_text.length > 180 ? '…' : ''}
                </p>
              )}
              <p
                className="text-eyebrow mt-2"
                style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
              >
                {timeAgo(n.updated_at)}
                {n.word_count > 0 && (
                  <> · {n.word_count} {n.word_count === 1 ? 'word' : 'words'}</>
                )}
              </p>
            </Link>
          ))}
          <Link
            href={`/journal/new?chapter_id=${encodeURIComponent(chapterId)}`}
            onClick={onClose}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 mt-2"
          >
            <PlusIcon />
            New note on this chapter
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-colors btn-transition"
      style={{
        backgroundColor: active ? 'var(--bg-soft)' : 'transparent',
        color: active ? 'var(--accent-purple)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  )
}

// ── Date helpers ───────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Pacific/Auckland',
  })
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} ${min === 1 ? 'minute' : 'minutes'} ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ${hr === 1 ? 'hour' : 'hours'} ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} ${day === 1 ? 'day' : 'days'} ago`
  return formatDate(iso)
}

// ── Icons ──────────────────────────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
