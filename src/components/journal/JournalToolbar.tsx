'use client'

/**
 * JournalToolbar — small markdown formatting toolbar for the journal editor.
 *
 * Wraps the current selection in the textarea with markdown syntax. Doesn't
 * use a rich-text engine — entries are stored as markdown and rendered via
 * the existing MarkdownBody component when displayed.
 *
 * Visual reference: the test-news writer-studio editor's top toolbar
 * (bold / italic / underline / link / list / blockquote etc) — but lighter,
 * since this is a thinking space not a publishing tool.
 */

import { type RefObject } from 'react'

interface JournalToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  /** When true, hide actions other than bold / italic / link — used in the
      compact dashboard quick-capture variant per chunk 2 part 2. */
  compact?: boolean
}

export default function JournalToolbar({ textareaRef, onChange, compact = false }: JournalToolbarProps) {
  function wrap(before: string, after: string = before) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = el.value
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    // Restore selection inside the wrapped region after re-render.
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  function prefixLines(prefix: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = el.value
    // Expand selection to whole lines
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndIdx = value.indexOf('\n', end)
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
    const block = value.slice(lineStart, lineEnd)
    const prefixed = block
      .split('\n')
      .map((line) => (line.length === 0 ? line : prefix + line))
      .join('\n')
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
    onChange(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(lineStart, lineStart + prefixed.length)
    }, 0)
  }

  function insertLink() {
    const el = textareaRef.current
    if (!el) return
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const value = el.value
    const selected = value.slice(start, end) || 'link text'
    const next = value.slice(0, start) + `[${selected}](${url})` + value.slice(end)
    onChange(next)
    setTimeout(() => el.focus(), 0)
  }

  // Shared button styling — matches the platform's btn-ghost look.
  const Btn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="px-2 py-1 rounded transition-colors btn-transition"
      style={{
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
        minHeight: '32px',
        minWidth: '32px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {children}
    </button>
  )

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="toolbar"
      aria-label="Formatting"
    >
      <Btn onClick={() => wrap('**')} label="Bold (Cmd+B)">
        <span className="font-bold">B</span>
      </Btn>
      <Btn onClick={() => wrap('*')} label="Italic (Cmd+I)">
        <span className="italic">I</span>
      </Btn>
      <Btn onClick={insertLink} label="Insert link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </Btn>
      {!compact && (
        <>
          <span className="mx-1" style={{ color: 'var(--border-default)' }} aria-hidden>|</span>
          <Btn onClick={() => prefixLines('> ')} label="Blockquote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
            </svg>
          </Btn>
          <Btn onClick={() => prefixLines('- ')} label="Bulleted list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </Btn>
          <Btn onClick={() => prefixLines('1. ')} label="Numbered list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <path d="M4 6h1v4" />
              <path d="M4 10h2" />
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
            </svg>
          </Btn>
        </>
      )}
    </div>
  )
}
