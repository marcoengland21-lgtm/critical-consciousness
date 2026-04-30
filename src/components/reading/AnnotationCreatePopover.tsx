'use client'

/**
 * AnnotationCreatePopover — chunk 3b piece 2c-i.
 *
 * Triggered when the reader picks "Annotate" from the SelectionActionBar.
 * Per frame 11D: the create flow is paragraph-anchored (gutter +
 * connector via the shared <ParagraphAnchoredPopover> primitive) and
 * now defaults annotations to PUBLIC (Mars 30 April 2026 — Freirean
 * reading: dialogue between equals as the default; private-by-default
 * leaked toward "secret notes that *could* be shared with the expert"
 * banking-model flavour). The author keeps a thought to themselves
 * deliberately by toggling the switch off into "Private to you."
 *
 *   ✏ NEW ANNOTATION                                              ¶ N
 *   "But this utility is not a thing of air…"                  (quote)
 *
 *   {textarea — body}
 *
 *   ⚙ Shared with the group         The group will see this on save  ●
 *      Toggle off to keep this private.
 *
 *   Cancel                                            [ Save annotation ]
 *
 * Composer formatting (chunk 3b piece 2c-i, Mars's #6 answer): light
 * markdown buttons (B / I / " / list / link) that insert markdown
 * syntax into the textarea. Annotation body stays a string; render
 * path stays MarkdownBody. Tiptap is overkill for short marginalia —
 * journal-weight writing has the rich editor; annotations are quick.
 *
 * Privacy framing: this is DRAFT-STATE privacy (saved-but-not-sent
 * email-draft level). Not structural anonymity. Toggle copy stays
 * voice-aligned with the design pack — don't drift toward suggesting
 * database-level privacy guarantees this schema doesn't provide.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ParagraphAnchoredPopover } from '@/components/overlay'

interface AnnotationCreatePopoverProps {
  open: boolean
  onClose: () => void
  paragraphRef: React.RefObject<HTMLElement | null>
  /** The selected text being annotated. */
  selectedText: string
  /** 1-indexed paragraph number for the eyebrow ("¶ 4"). */
  paragraphNumber: number
  /** Persist the annotation. is_public reflects the toggle state. */
  onSave: (body: string, isPublic: boolean) => Promise<void>
  /** Whether the current author is acting as Guest (no login). Affects
      the placeholder and the toggle copy slightly — guests can't
      really publish a draft "later" since they have no account. */
  isGuest: boolean
}

const QUOTE_TRUNCATE = 240

export default function AnnotationCreatePopover({
  open,
  onClose,
  paragraphRef,
  selectedText,
  paragraphNumber,
  onSave,
  isGuest,
}: AnnotationCreatePopoverProps) {
  const [body, setBody] = useState('')
  // Default: PUBLIC. See header comment for the Freirean reasoning.
  // Author toggles off into private-draft state for thoughts they
  // want to keep to themselves (or polish first).
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset on open.
  useEffect(() => {
    if (!open) return
    setBody('')
    setIsPublic(true)
    setSaving(false)
    // Focus the textarea after mount.
    const t = setTimeout(() => textareaRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  const handleSave = useCallback(async () => {
    if (!body.trim() || saving) return
    setSaving(true)
    try {
      await onSave(body.trim(), isPublic)
      // Parent closes the popover via state — no need to call onClose
      // from here unless the save succeeded silently.
    } finally {
      setSaving(false)
    }
  }, [body, isPublic, onSave, saving])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave]
  )

  // Markdown insert helpers — wraps the current selection in the
  // textarea with markdown syntax (chunk 3b piece 2c-i, Mars's #6).
  const wrapSelection = useCallback((before: string, after: string = before) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.slice(start, end)
    const next = body.slice(0, start) + before + selected + after + body.slice(end)
    setBody(next)
    // Restore caret after the React commit.
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + selected.length
    })
  }, [body])

  const insertLinePrefix = useCallback((prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    // Find the start of the current line.
    const lineStart = body.lastIndexOf('\n', start - 1) + 1
    const next = body.slice(0, lineStart) + prefix + body.slice(lineStart)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + prefix.length
    })
  }, [body])

  const insertLink = useCallback(() => {
    const url = window.prompt('Link URL:')
    if (!url) return
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.slice(start, end) || 'link text'
    const linkMarkdown = `[${selected}](${url})`
    const next = body.slice(0, start) + linkMarkdown + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + 1
      ta.selectionEnd = start + 1 + selected.length
    })
  }, [body])

  // Truncate quote display, but make sure we always end at a word
  // boundary if we cut.
  const displayQuote =
    selectedText.length > QUOTE_TRUNCATE
      ? selectedText.slice(0, QUOTE_TRUNCATE).replace(/\s+\S*$/, '') + '…'
      : selectedText

  return (
    <ParagraphAnchoredPopover
      open={open}
      onClose={onClose}
      paragraphRef={paragraphRef}
      scope="body"
      width={420}
      ariaLabel="Create annotation"
    >
      <div className="px-5 py-4 space-y-3">
        {/* Header: pencil glyph + eyebrow + paragraph number */}
        <div className="flex items-center justify-between gap-3">
          <p
            className="text-eyebrow flex items-center gap-1.5"
            style={{ color: 'var(--accent-purple)' }}
          >
            <PencilIcon /> New annotation
          </p>
          <span
            className="text-eyebrow"
            style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
          >
            ¶ {paragraphNumber}
          </span>
        </div>

        {/* Quoted selection — italic Lora with purple left border */}
        <blockquote
          style={{
            borderLeft: '3px solid var(--accent-purple)',
            paddingLeft: '0.875rem',
            color: 'var(--text-secondary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '0.95rem',
            lineHeight: 1.55,
          }}
        >
          &ldquo;{displayQuote}&rdquo;
        </blockquote>

        {/* Markdown formatting toolbar */}
        <div className="flex items-center gap-0.5">
          <FormatBtn label="Bold (⌘B)" onClick={() => wrapSelection('**')}>
            <strong>B</strong>
          </FormatBtn>
          <FormatBtn label="Italic (⌘I)" onClick={() => wrapSelection('*')}>
            <em>I</em>
          </FormatBtn>
          <FormatBtn label="Quote" onClick={() => insertLinePrefix('> ')}>
            &ldquo;
          </FormatBtn>
          <FormatBtn label="Bulleted list" onClick={() => insertLinePrefix('- ')}>
            <ListIcon />
          </FormatBtn>
          <FormatBtn label="Link" onClick={insertLink}>
            <LinkIcon />
          </FormatBtn>
        </div>

        {/* Body textarea */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isGuest
              ? 'Share your thoughts (as Guest)…'
              : 'Share your thoughts on this passage…'
          }
          rows={4}
          className="w-full rounded-md border text-sm p-3 resize-vertical"
          style={{
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            lineHeight: 1.6,
          }}
        />

        {/* Privacy toggle row — frame 11D. Default: PUBLIC (Mars 30 Apr 2026
            — see header comment). Toggle resized to standard 44×24 track
            with 20px knob — previous 36×20 / 16px knob proportions left
            the white knob looking off-axis even when the math was right. */}
        <div
          className="flex items-start justify-between gap-3 rounded-md p-3"
          style={{
            backgroundColor: 'var(--bg-card-alt)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-start gap-2 min-w-0">
            <span
              className="mt-0.5 flex-shrink-0"
              style={{
                color: isPublic ? 'var(--accent-purple)' : 'var(--text-secondary)',
              }}
            >
              {isPublic ? <UsersIcon /> : <LockIcon />}
            </span>
            <div className="min-w-0">
              <div
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {isPublic ? 'Shared with the group' : 'Private to you'}
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}
              >
                {isPublic
                  ? 'The group will see this when you save. Toggle off to keep it private.'
                  : "Only you'll see this. Share later when you're ready."}
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label="Share with group"
            onClick={() => setIsPublic((v) => !v)}
            className="relative shrink-0 rounded-full transition-colors duration-200 mt-1"
            style={{
              width: '44px',
              height: '24px',
              backgroundColor: isPublic
                ? 'var(--accent-purple)'
                : 'var(--border-strong)',
            }}
          >
            <span
              className="absolute rounded-full transition-transform duration-200 shadow-sm"
              style={{
                top: '2px',
                left: '0',
                width: '20px',
                height: '20px',
                backgroundColor: '#fff',
                transform: isPublic ? 'translateX(22px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xs px-3 py-2 rounded-md transition-colors hover-bg-themed disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!body.trim() || saving}
            className="text-xs font-medium px-3 py-2 rounded-md btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save annotation'}
          </button>
        </div>
      </div>
    </ParagraphAnchoredPopover>
  )
}

// ── Tiny presentational helpers ────────────────────────────────────────

function FormatBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      className="w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors hover-bg-themed"
      style={{ color: 'var(--text-secondary)' }}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
