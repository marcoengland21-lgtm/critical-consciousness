'use client'

/**
 * Journal toolbar — lifted from /Users/marco/Documents/GitHub/test-news
 * src/components/writer-studio/CompactToolbar.tsx (chunk 2.6).
 *
 * Layout matches test-news exactly:
 *   LEFT:   Title
 *   CENTER: Undo Redo | StylesDropdown | Bold Italic Underline Strike |
 *           TextColor HighlightColor | Link Image | AlignDropdown |
 *           BulletList NumberedList Checklist | TableDropdown | Outdent Indent |
 *           LineSpacing | ClearFormatting
 *   RIGHT:  SaveStatus | Reference Glossary (CSG-specific, replaces test-news
 *           Research/Tools/Review drawers per chunk 2.5 §5)
 *
 * Stripped per chunk 2.6 brief: Submit, Review, Research panel, Tools panel,
 * grade level, Draft status badge (StatusChip), Save button (autosave runs),
 * EditModeToggle, MoreActions (preview).
 *
 * Colors lifted from test-news's zinc/violet palette and adapted to CSG's
 * CSS vars (--bg-card, --bg-hover, --accent-purple, etc.) so the toolbar
 * themes correctly in both light and dark mode.
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListChecks, Indent, Outdent, RemoveFormatting,
  Palette, Highlighter, ChevronDown,
  Cloud, CloudOff, Loader2, AlertCircle,
  Table2, Plus, Minus as MinusIcon, Trash2, Merge, Split, ToggleLeft,
  BookText, BookOpen,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export interface JournalToolbarProps {
  editor: Editor | null
  /** Current title (renders as inline EditableTitle). */
  title: string
  onTitleChange: (title: string) => void
  /** Current save status — 4-state per test-news (saved | saving | unsaved | error). */
  saveStatus: SaveStatus
  /** Last successful save timestamp — drives the 'Saved Xs ago' label. */
  lastSaved: Date | null
  /** Compact mode: bold / italic / link only. Used by dashboard quick-capture
      panel per chunk 2.5 §6 — modals and most formatting are hidden. */
  compact?: boolean
  /** Optional: open the Reference modal (Capital passages). */
  onOpenReference?: () => void
  /** Optional: open the Glossary modal. */
  onOpenGlossary?: () => void
  /** Optional: pick an image from the local file system (handled by parent). */
  onPickImage?: () => void
}

// ── Small primitives ────────────────────────────────────────────────────────

interface ToolbarBtnProps {
  icon: React.ElementType
  label: string
  isActive?: boolean
  onClick: () => void
  disabled?: boolean
}

const ToolbarBtn = memo(function ToolbarBtn({
  icon: Icon, label, isActive = false, onClick, disabled = false,
}: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
        color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
      }}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
})

const Divider = memo(function Divider() {
  return <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--border-subtle)' }} />
})

// ── Editable title (inline, on the left of the toolbar) ────────────────────

interface EditableTitleProps {
  title: string
  onChange: (title: string) => void
}

const EditableTitle = memo(function EditableTitle({ title, onChange }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!isEditing) setEditValue(title) }, [title, isEditing])
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (trimmed !== title) onChange(trimmed)
  }, [editValue, title, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); inputRef.current?.blur() }
    if (e.key === 'Escape') { setEditValue(title); setIsEditing(false) }
  }, [title])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="min-w-0 bg-transparent text-[14px] font-semibold border-b outline-none"
        style={{
          color: 'var(--text-primary)',
          borderBottomColor: 'var(--accent-purple)',
        }}
        placeholder="Untitled (optional)"
        aria-label="Document title"
        autoComplete="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-lt-active="false"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group flex min-w-0 items-center gap-1 truncate text-left text-[14px] font-semibold rounded px-1 -ml-1 transition-colors hover-bg-themed"
      style={{ color: title ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      title="Click to edit title"
    >
      <span className="truncate">{title || 'Untitled (optional)'}</span>
    </button>
  )
})

// ── Save status indicator ──────────────────────────────────────────────────

function formatLastSaved(date: Date | null): string {
  if (!date) return 'Not saved'
  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSecs < 10) return 'Saved'
  if (diffSecs < 60) return `${diffSecs}s ago`
  const mins = Math.floor(diffSecs / 60)
  if (mins < 60) return `${mins}m ago`
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const SaveStatusIndicator = memo(function SaveStatusIndicator({
  status, lastSaved,
}: { status: SaveStatus; lastSaved: Date | null }) {
  // Periodically re-render so 'Saved Xs ago' updates without user action.
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Saving...</span>
      </div>
    )
  }
  if (status === 'unsaved') {
    return (
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--accent-amber)', opacity: 0.85 }}>
        <CloudOff className="h-3 w-3" />
        <span>Unsaved changes</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--accent-red)', opacity: 0.85 }}>
        <AlertCircle className="h-3 w-3" />
        <span>Save failed</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--accent-green)', opacity: 0.85 }}>
      <Cloud className="h-3 w-3" />
      <span>{formatLastSaved(lastSaved)}</span>
    </div>
  )
})

// ── Styles dropdown (Normal text / H1-H6 / Quote / Code) ───────────────────

interface StyleOption {
  label: string
  value: string
  action: (editor: Editor) => void
  isActive: (editor: Editor) => boolean
  previewClass: string
}

const STYLE_OPTIONS: StyleOption[] = [
  { label: 'Normal text', value: 'paragraph',
    action: (e) => e.chain().focus().setParagraph().run(),
    isActive: (e) => e.isActive('paragraph') && !e.isActive('heading') && !e.isActive('blockquote') && !e.isActive('codeBlock'),
    previewClass: 'text-[13px] font-normal' },
  { label: 'Heading 1', value: 'h1',
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => e.isActive('heading', { level: 1 }),
    previewClass: 'text-[22px] font-bold leading-tight' },
  { label: 'Heading 2', value: 'h2',
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => e.isActive('heading', { level: 2 }),
    previewClass: 'text-[17px] font-semibold leading-tight' },
  { label: 'Heading 3', value: 'h3',
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (e) => e.isActive('heading', { level: 3 }),
    previewClass: 'text-[14px] font-semibold' },
  { label: 'Heading 4', value: 'h4',
    action: (e) => e.chain().focus().toggleHeading({ level: 4 }).run(),
    isActive: (e) => e.isActive('heading', { level: 4 }),
    previewClass: 'text-[13px] font-semibold' },
  { label: 'Heading 5', value: 'h5',
    action: (e) => e.chain().focus().toggleHeading({ level: 5 }).run(),
    isActive: (e) => e.isActive('heading', { level: 5 }),
    previewClass: 'text-[12px] font-semibold' },
  { label: 'Heading 6', value: 'h6',
    action: (e) => e.chain().focus().toggleHeading({ level: 6 }).run(),
    isActive: (e) => e.isActive('heading', { level: 6 }),
    previewClass: 'text-[11px] font-semibold uppercase tracking-wide' },
  { label: 'Quote', value: 'blockquote',
    action: (e) => e.chain().focus().toggleBlockquote().run(),
    isActive: (e) => e.isActive('blockquote'),
    previewClass: 'text-[13px] italic' },
  { label: 'Code', value: 'codeBlock',
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
    isActive: (e) => e.isActive('codeBlock'),
    previewClass: 'text-[12px] font-mono' },
]

const StylesDropdown = memo(function StylesDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const [currentLabel, setCurrentLabel] = useState('Normal text')

  useEffect(() => {
    if (!editor) { setCurrentLabel('Normal text'); return }
    const update = () => {
      for (const o of STYLE_OPTIONS) if (o.isActive(editor)) { setCurrentLabel(o.label); return }
      setCurrentLabel('Normal text')
    }
    update()
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => { editor.off('selectionUpdate', update); editor.off('transaction', update) }
  }, [editor])

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-[12px] rounded transition-colors min-w-[100px]"
        style={{
          backgroundColor: isOpen ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-primary)',
        }}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
        aria-label={`Block style: ${currentLabel}`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99999 }} onMouseDown={(e) => e.preventDefault()} onClick={() => setIsOpen(false)} />
          <div
            className="fixed min-w-[180px] rounded-md border py-1 shadow-xl"
            style={{
              top: pos.top, left: pos.left, zIndex: 100000,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            {STYLE_OPTIONS.map((o) => {
              const active = editor && o.isActive(editor)
              return (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { if (editor) o.action(editor); setIsOpen(false) }}
                  className={'w-full px-3 py-1.5 text-left transition-colors hover-bg-themed ' + o.previewClass}
                  style={{ color: active ? 'var(--accent-purple)' : 'var(--text-primary)' }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
})

// ── Color picker (text color + highlight) ──────────────────────────────────

const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
]

const ColorPicker = memo(function ColorPicker({
  editor, type,
}: { editor: Editor | null; type: 'text' | 'highlight' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const Icon = type === 'text' ? Palette : Highlighter
  const indicatorColor = type === 'text'
    ? (editor?.getAttributes('textStyle')['color'] as string) || 'var(--text-primary)'
    : '#fbbf24'

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [isOpen])

  const handleSelect = useCallback((c: string) => {
    if (!editor) return
    if (type === 'text') editor.chain().focus().setColor(c).run()
    else editor.chain().focus().toggleHighlight({ color: c }).run()
    setIsOpen(false)
  }, [editor, type])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
        disabled={!editor}
        className="relative p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isOpen ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => { if (!isOpen && !!editor) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
        title={type === 'text' ? 'Text color' : 'Highlight'}
        aria-label={type === 'text' ? 'Text color' : 'Highlight color'}
      >
        <Icon className="w-3.5 h-3.5" />
        <div
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full"
          style={{ backgroundColor: indicatorColor }}
        />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99999 }} onMouseDown={(e) => e.preventDefault()} onClick={() => setIsOpen(false)} />
          <div
            className="fixed p-2 rounded-md border shadow-xl"
            style={{
              top: pos.top, left: pos.left, zIndex: 100000,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="grid grid-cols-10 gap-0.5">
              {COLOR_PALETTE.map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(c)}
                  className="w-[18px] h-[18px] rounded-sm border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c, borderColor: c === '#000000' ? 'var(--border-strong)' : 'var(--border-subtle)' }}
                  title={c}
                />
              ))}
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (type === 'text') editor?.chain().focus().unsetColor().run()
                else editor?.chain().focus().unsetHighlight().run()
                setIsOpen(false)
              }}
              className="w-full mt-1.5 px-2 py-0.5 text-[11px] rounded transition-colors hover-bg-themed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {type === 'text' ? 'Remove color' : 'Remove highlight'}
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  )
})

// ── Alignment dropdown ─────────────────────────────────────────────────────

const AlignDropdown = memo(function AlignDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const alignments = [
    { icon: AlignLeft, value: 'left', label: 'Left' },
    { icon: AlignCenter, value: 'center', label: 'Center' },
    { icon: AlignRight, value: 'right', label: 'Right' },
    { icon: AlignJustify, value: 'justify', label: 'Justify' },
  ]
  const current = alignments.find((a) => editor?.isActive({ textAlign: a.value } as never)) ?? alignments[0]
  const CurrentIcon = current.icon

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { editor?.commands.focus(); setIsOpen(!isOpen) }}
        disabled={!editor}
        className="flex items-center gap-0.5 p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isOpen ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => { if (!isOpen && !!editor) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
        title="Alignment"
        aria-label="Text alignment"
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99999 }} onMouseDown={(e) => e.preventDefault()} onClick={() => setIsOpen(false)} />
          <div
            className="fixed flex gap-1 p-1 rounded-md border shadow-xl"
            style={{
              top: pos.top, left: pos.left, zIndex: 100000,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            {alignments.map(({ icon: Icon, value, label }) => {
              const active = editor?.isActive({ textAlign: value } as never)
              return (
                <button
                  key={value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { editor?.chain().focus().setTextAlign(value).run(); setIsOpen(false) }}
                  className="p-1.5 rounded transition-colors hover-bg-themed"
                  style={{ color: active ? 'var(--accent-purple)' : 'var(--text-secondary)' }}
                  title={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
})

// ── Line spacing dropdown ──────────────────────────────────────────────────

const LINE_SPACINGS = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2' },
]

const LineSpacingDropdown = memo(function LineSpacingDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [isOpen])

  const handleSelect = useCallback((value: string) => {
    if (!editor) return
    editor.chain().focus().updateAttributes('paragraph', { style: `line-height: ${value}` }).run()
    setIsOpen(false)
  }, [editor])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { editor?.commands.focus(); setIsOpen(!isOpen) }}
        disabled={!editor}
        className="flex items-center gap-0.5 p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isOpen ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-secondary)',
        }}
        title="Line spacing"
        aria-label="Line spacing"
      >
        <span className="text-[11px] font-medium">↕</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99999 }} onMouseDown={(e) => e.preventDefault()} onClick={() => setIsOpen(false)} />
          <div
            className="fixed py-1 rounded-md border shadow-xl min-w-[80px]"
            style={{
              top: pos.top, left: pos.left, zIndex: 100000,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            {LINE_SPACINGS.map((s) => (
              <button
                key={s.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s.value)}
                className="w-full px-3 py-1.5 text-left text-[12px] hover-bg-themed transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  )
})

// ── Table dropdown ─────────────────────────────────────────────────────────

interface TableAction {
  id: string
  label: string
  icon: React.ElementType
  action: (editor: Editor) => void
  canRun?: (editor: Editor) => boolean
  dividerAfter?: boolean
}

const TABLE_ACTIONS: TableAction[] = [
  { id: 'insert', label: 'Insert table (3×3)', icon: Table2,
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    canRun: (e) => !e.isActive('table'), dividerAfter: true },
  { id: 'addRowBefore', label: 'Add row above', icon: Plus,
    action: (e) => e.chain().focus().addRowBefore().run(),
    canRun: (e) => e.can().addRowBefore() },
  { id: 'addRowAfter', label: 'Add row below', icon: Plus,
    action: (e) => e.chain().focus().addRowAfter().run(),
    canRun: (e) => e.can().addRowAfter() },
  { id: 'deleteRow', label: 'Delete row', icon: MinusIcon,
    action: (e) => e.chain().focus().deleteRow().run(),
    canRun: (e) => e.can().deleteRow(), dividerAfter: true },
  { id: 'addColBefore', label: 'Add column left', icon: Plus,
    action: (e) => e.chain().focus().addColumnBefore().run(),
    canRun: (e) => e.can().addColumnBefore() },
  { id: 'addColAfter', label: 'Add column right', icon: Plus,
    action: (e) => e.chain().focus().addColumnAfter().run(),
    canRun: (e) => e.can().addColumnAfter() },
  { id: 'deleteCol', label: 'Delete column', icon: MinusIcon,
    action: (e) => e.chain().focus().deleteColumn().run(),
    canRun: (e) => e.can().deleteColumn(), dividerAfter: true },
  { id: 'toggleHeader', label: 'Toggle header row', icon: ToggleLeft,
    action: (e) => e.chain().focus().toggleHeaderRow().run(),
    canRun: (e) => e.can().toggleHeaderRow() },
  { id: 'mergeCells', label: 'Merge cells', icon: Merge,
    action: (e) => e.chain().focus().mergeCells().run(),
    canRun: (e) => e.can().mergeCells() },
  { id: 'splitCell', label: 'Split cell', icon: Split,
    action: (e) => e.chain().focus().splitCell().run(),
    canRun: (e) => e.can().splitCell(), dividerAfter: true },
  { id: 'deleteTable', label: 'Delete table', icon: Trash2,
    action: (e) => e.chain().focus().deleteTable().run(),
    canRun: (e) => e.can().deleteTable() },
]

const TableDropdown = memo(function TableDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { editor?.commands.focus(); setIsOpen(!isOpen) }}
        disabled={!editor}
        className="flex items-center gap-0.5 p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isOpen ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-secondary)',
        }}
        title="Table"
        aria-label="Table actions"
      >
        <Table2 className="w-3.5 h-3.5" />
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99999 }} onMouseDown={(e) => e.preventDefault()} onClick={() => setIsOpen(false)} />
          <div
            className="fixed py-1 rounded-md border shadow-xl min-w-[180px]"
            style={{
              top: pos.top, left: pos.left, zIndex: 100000,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            {TABLE_ACTIONS.map((a) => {
              const enabled = !!editor && (a.canRun ? a.canRun(editor) : true)
              const Icon = a.icon
              return (
                <React.Fragment key={a.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { if (enabled && editor) a.action(editor); setIsOpen(false) }}
                    disabled={!enabled}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-[12px] hover-bg-themed transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Icon className="w-3 h-3 opacity-70" />
                    <span>{a.label}</span>
                  </button>
                  {a.dividerAfter && (
                    <div className="my-1 mx-2 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
})

// ── Link popover ───────────────────────────────────────────────────────────

const LinkPopover = memo(function LinkPopover({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [url, setUrl] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const existing = (editor?.getAttributes('link') as Record<string, string>)?.['href'] || ''
      setUrl(existing)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, editor])

  const handleApply = useCallback(() => {
    if (!editor || !url.trim()) return
    const href = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
    editor.chain().focus().setLink({ href }).run()
    setUrl('')
    setIsOpen(false)
  }, [editor, url])

  const handleRemove = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    setUrl('')
    setIsOpen(false)
  }, [editor])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleApply() }
    if (e.key === 'Escape') { setUrl(''); setIsOpen(false) }
  }, [handleApply])

  const isLinkActive = editor?.isActive('link') ?? false

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
        disabled={!editor}
        className="p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isLinkActive || isOpen ? 'var(--bg-hover)' : 'transparent',
          color: isLinkActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => { if (!isLinkActive && !isOpen && !!editor) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { if (!isLinkActive && !isOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
        title="Insert link (⌘K)"
        aria-label="Insert link (⌘K)"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 99999 }} onMouseDown={(e) => e.preventDefault()} onClick={() => setIsOpen(false)} />
          <div
            className="fixed p-2 rounded-md border shadow-xl"
            style={{
              top: pos.top, left: pos.left, zIndex: 100000, minWidth: 280,
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-default)',
            }}
          >
            <label className="block text-[11px] mb-1" style={{ color: 'var(--text-secondary)' }}>URL</label>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              autoComplete="off"
              data-gramm="false"
              data-gramm_editor="false"
              data-lt-active="false"
              className="w-full rounded px-2 py-1.5 text-[12px] border focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-default)',
              }}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleApply}
                disabled={!url.trim()}
                className="flex-1 rounded px-2 py-1 text-[11px] font-medium btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              {isLinkActive && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleRemove}
                  className="rounded px-2 py-1 text-[11px] hover-bg-themed transition-colors"
                  style={{ color: 'var(--accent-red)' }}
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => { setUrl(''); setIsOpen(false) }}
                className="rounded px-2 py-1 text-[11px] hover-bg-themed transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
})

// ── Main toolbar render ────────────────────────────────────────────────────

const JournalToolbar = memo(function JournalToolbar({
  editor, title, onTitleChange, saveStatus, lastSaved,
  compact = false,
  onOpenReference, onOpenGlossary, onPickImage,
}: JournalToolbarProps) {
  // Force re-render on selection change so isActive() stays current.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!editor) return
    const listener = () => setTick((n) => n + 1)
    editor.on('selectionUpdate', listener)
    editor.on('transaction', listener)
    return () => { editor.off('selectionUpdate', listener); editor.off('transaction', listener) }
  }, [editor])

  const handleUndo = useCallback(() => editor?.chain().focus().undo().run(), [editor])
  const handleRedo = useCallback(() => editor?.chain().focus().redo().run(), [editor])
  const handleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor])
  const handleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor])
  const handleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor])
  const handleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor])
  const handleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor])
  const handleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor])
  const handleTaskList = useCallback(() => editor?.chain().focus().toggleTaskList().run(), [editor])
  const handleOutdent = useCallback(() => {
    if (!editor) return
    if (editor.can().liftListItem('listItem')) editor.chain().focus().liftListItem('listItem').run()
    else if (editor.can().liftListItem('taskItem')) editor.chain().focus().liftListItem('taskItem').run()
  }, [editor])
  const handleIndent = useCallback(() => {
    if (!editor) return
    if (editor.can().sinkListItem('listItem')) editor.chain().focus().sinkListItem('listItem').run()
    else if (editor.can().sinkListItem('taskItem')) editor.chain().focus().sinkListItem('taskItem').run()
  }, [editor])
  const handleClearFormatting = useCallback(() => editor?.chain().focus().clearNodes().unsetAllMarks().run(), [editor])

  // Compact mode (dashboard quick-capture per chunk 2.5 §6) — Bold / Italic / Link only.
  if (compact) {
    return (
      <header
        className="flex items-center gap-1 px-2 py-1 sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <ToolbarBtn icon={Bold} label="Bold (⌘B)" isActive={editor?.isActive('bold') ?? false} onClick={handleBold} disabled={!editor} />
        <ToolbarBtn icon={Italic} label="Italic (⌘I)" isActive={editor?.isActive('italic') ?? false} onClick={handleItalic} disabled={!editor} />
        <LinkPopover editor={editor} />
        <div className="flex-1" />
        <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
      </header>
    )
  }

  return (
    <header
      className="flex items-center gap-1 px-2 py-1 sticky top-0 z-10"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* === LEFT: Title === */}
      <div className="flex items-center gap-2 min-w-0 mr-2">
        <EditableTitle title={title} onChange={onTitleChange} />
      </div>

      <Divider />

      {/* === CENTER: Formatting buttons === */}
      <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
        {/* Undo / Redo */}
        <ToolbarBtn icon={Undo2} label="Undo (⌘Z)" onClick={handleUndo} disabled={!editor?.can().undo()} />
        <ToolbarBtn icon={Redo2} label="Redo (⌘⇧Z)" onClick={handleRedo} disabled={!editor?.can().redo()} />

        <Divider />

        {/* Styles dropdown */}
        <StylesDropdown editor={editor} />

        <Divider />

        {/* Text formatting */}
        <ToolbarBtn icon={Bold} label="Bold (⌘B)" isActive={editor?.isActive('bold') ?? false} onClick={handleBold} disabled={!editor} />
        <ToolbarBtn icon={Italic} label="Italic (⌘I)" isActive={editor?.isActive('italic') ?? false} onClick={handleItalic} disabled={!editor} />
        <ToolbarBtn icon={Underline} label="Underline (⌘U)" isActive={editor?.isActive('underline') ?? false} onClick={handleUnderline} disabled={!editor} />
        <ToolbarBtn icon={Strikethrough} label="Strikethrough" isActive={editor?.isActive('strike') ?? false} onClick={handleStrike} disabled={!editor} />

        <Divider />

        {/* Colors */}
        <ColorPicker editor={editor} type="text" />
        <ColorPicker editor={editor} type="highlight" />

        <Divider />

        {/* Link & Image */}
        <LinkPopover editor={editor} />
        {onPickImage && (
          <ToolbarBtn icon={ImageIcon} label="Insert image" onClick={onPickImage} disabled={!editor} />
        )}

        <Divider />

        {/* Alignment */}
        <AlignDropdown editor={editor} />

        <Divider />

        {/* Lists */}
        <ToolbarBtn icon={List} label="Bullet list" isActive={editor?.isActive('bulletList') ?? false} onClick={handleBulletList} disabled={!editor} />
        <ToolbarBtn icon={ListOrdered} label="Numbered list" isActive={editor?.isActive('orderedList') ?? false} onClick={handleOrderedList} disabled={!editor} />
        <ToolbarBtn icon={ListChecks} label="Checklist" isActive={editor?.isActive('taskList') ?? false} onClick={handleTaskList} disabled={!editor} />

        <Divider />

        {/* Table */}
        <TableDropdown editor={editor} />

        <Divider />

        {/* Indent / Outdent */}
        <ToolbarBtn icon={Outdent} label="Outdent (⇧Tab)" onClick={handleOutdent} disabled={!editor} />
        <ToolbarBtn icon={Indent} label="Indent (Tab)" onClick={handleIndent} disabled={!editor} />

        <Divider />

        {/* Line spacing */}
        <LineSpacingDropdown editor={editor} />

        <Divider />

        {/* Clear formatting */}
        <ToolbarBtn icon={RemoveFormatting} label="Clear formatting" onClick={handleClearFormatting} disabled={!editor} />
      </div>

      <Divider />

      {/* === RIGHT: Save status + Reference/Glossary modal triggers === */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />

        {(onOpenReference || onOpenGlossary) && <Divider />}

        {onOpenReference && (
          <button
            type="button"
            onClick={onOpenReference}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors hover-bg-themed"
            style={{ color: 'var(--text-secondary)' }}
            title="Reference a passage from Capital (@)"
            aria-label="Reference Capital passage"
          >
            <BookText className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Reference</span>
          </button>
        )}

        {onOpenGlossary && (
          <button
            type="button"
            onClick={onOpenGlossary}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors hover-bg-themed"
            style={{ color: 'var(--text-secondary)' }}
            title="Reference a glossary term (#)"
            aria-label="Reference glossary term"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Glossary</span>
          </button>
        )}
      </div>
    </header>
  )
})

JournalToolbar.displayName = 'JournalToolbar'
export default JournalToolbar
