'use client'

import { memo, useState, useCallback, useEffect } from 'react'
import { type Editor } from '@tiptap/react'

interface TiptapToolbarProps {
  editor: Editor
  /** Compact mode: only bold / italic / link buttons (per chunk 2.5 §6). */
  compact?: boolean
  onPickImage?: () => void
  onOpenReference?: () => void
  onOpenGlossary?: () => void
}

/**
 * Persistent top toolbar for the journal editor.
 *
 * Lifted from /Users/marco/Documents/GitHub/test-news EditorToolbar with
 * the journalism-specific buttons dropped (track-changes, suggestion mark
 * toggles, comments). Adapted to CSG's CSS vars + light/dark mode.
 *
 * In compact mode (dashboard quick-capture per chunk 2.5 §6): bold / italic
 * / link only. Reference + Glossary modal triggers are hidden.
 */
const TiptapToolbar = memo(function TiptapToolbar({
  editor,
  compact = false,
  onPickImage,
  onOpenReference,
  onOpenGlossary,
}: TiptapToolbarProps) {
  // Force re-render on selection change so isActive() reflects current state.
  // Tiptap's React binding doesn't auto-rerender on selection changes.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!editor) return
    const listener = () => setTick((n) => n + 1)
    editor.on('selectionUpdate', listener)
    editor.on('transaction', listener)
    return () => {
      editor.off('selectionUpdate', listener)
      editor.off('transaction', listener)
    }
  }, [editor])

  const isActive = useCallback(
    (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs),
    [editor]
  )

  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href
    const url = window.prompt('Link URL', previous || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div
      className="flex items-center flex-wrap gap-0.5 px-1 py-1.5 sticky top-0 z-10"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
      role="toolbar"
      aria-label="Editor formatting"
    >
      {/* ── Compact mode: bold / italic / link only ─────────────────────── */}
      {compact ? (
        <>
          <Btn label="Bold" shortcut="⌘B" active={isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <BIcon />
          </Btn>
          <Btn label="Italic" shortcut="⌘I" active={isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <IIcon />
          </Btn>
          <Btn label="Link" shortcut="⌘K" active={isActive('link')} onClick={setLink}>
            <LinkIcon />
          </Btn>
        </>
      ) : (
        <>
          {/* ── Block type ───────────────────────────────────────── */}
          <select
            value={
              isActive('heading', { level: 1 }) ? 'h1' :
              isActive('heading', { level: 2 }) ? 'h2' :
              isActive('heading', { level: 3 }) ? 'h3' :
              'p'
            }
            onChange={(e) => {
              const v = e.target.value
              if (v === 'p') editor.chain().focus().setParagraph().run()
              else if (v === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run()
              else if (v === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run()
              else if (v === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run()
            }}
            className="text-xs px-2 py-1 rounded mr-1"
            style={{
              backgroundColor: 'var(--bg-card-alt)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
            title="Block style"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          <Divider />

          {/* ── Inline marks ─────────────────────────────────────── */}
          <Btn label="Bold" shortcut="⌘B" active={isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <BIcon />
          </Btn>
          <Btn label="Italic" shortcut="⌘I" active={isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <IIcon />
          </Btn>
          <Btn label="Underline" shortcut="⌘U" active={isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UIcon />
          </Btn>
          <Btn label="Strikethrough" active={isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <SIcon />
          </Btn>
          <Btn label="Inline code" active={isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
            <CodeIcon />
          </Btn>
          <Btn label="Highlight" active={isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
            <HighlightIcon />
          </Btn>

          <Divider />

          {/* ── Block-level ──────────────────────────────────────── */}
          <Btn label="Bulleted list" active={isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <BulletIcon />
          </Btn>
          <Btn label="Numbered list" active={isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <NumberedIcon />
          </Btn>
          <Btn label="Task list" active={isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <TaskIcon />
          </Btn>
          <Btn label="Blockquote" active={isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <QuoteIcon />
          </Btn>
          <Btn label="Code block" active={isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <CodeBlockIcon />
          </Btn>
          <Btn label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <RuleIcon />
          </Btn>

          <Divider />

          {/* ── Alignment ────────────────────────────────────────── */}
          <Btn label="Align left" active={editor.isActive({ textAlign: 'left' } as never)} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeftIcon />
          </Btn>
          <Btn label="Align center" active={editor.isActive({ textAlign: 'center' } as never)} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenterIcon />
          </Btn>
          <Btn label="Align right" active={editor.isActive({ textAlign: 'right' } as never)} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRightIcon />
          </Btn>

          <Divider />

          {/* ── Insertions ───────────────────────────────────────── */}
          <Btn label="Link" shortcut="⌘K" active={isActive('link')} onClick={setLink}>
            <LinkIcon />
          </Btn>
          {onPickImage && (
            <Btn label="Insert image" onClick={onPickImage}>
              <ImageIcon />
            </Btn>
          )}
          <Btn
            label="Insert table"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon />
          </Btn>

          {/* ── Reference + Glossary modals (full editor only) ──── */}
          {(onOpenReference || onOpenGlossary) && <Divider />}
          {onOpenReference && (
            <Btn label="Reference a passage from Capital (@)" onClick={onOpenReference}>
              <BookIcon />
            </Btn>
          )}
          {onOpenGlossary && (
            <Btn label="Reference a glossary term (#)" onClick={onOpenGlossary}>
              <GlossaryIcon />
            </Btn>
          )}

          <Divider />

          {/* ── Undo / redo ──────────────────────────────────────── */}
          <Btn label="Undo" shortcut="⌘Z" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <UndoIcon />
          </Btn>
          <Btn label="Redo" shortcut="⌘⇧Z" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <RedoIcon />
          </Btn>
        </>
      )}
    </div>
  )
})

TiptapToolbar.displayName = 'TiptapToolbar'
export default TiptapToolbar

// ── Button + Divider primitives ─────────────────────────────────────────────

interface BtnProps {
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function Btn({ label, shortcut, active, disabled, onClick, children }: BtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      className="flex h-8 w-8 items-center justify-center rounded transition-colors btn-transition"
      style={{
        backgroundColor: active ? 'rgba(var(--accent-purple-rgb), 0.18)' : 'transparent',
        color: active ? 'var(--accent-purple)' : 'var(--text-secondary)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-5 w-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
}

// ── Icons (lucide-react inline equivalents) ─────────────────────────────────

const SVG = ({ children }: { children: React.ReactNode }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const BIcon = () => <SVG><path d="M14 12a4 4 0 0 0 0-8H6v8" /><path d="M15 20a4 4 0 0 0 0-8H6v8Z" /></SVG>
const IIcon = () => <SVG><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></SVG>
const UIcon = () => <SVG><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" /></SVG>
const SIcon = () => <SVG><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" y1="12" x2="20" y2="12" /></SVG>
const CodeIcon = () => <SVG><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></SVG>
const HighlightIcon = () => <SVG><path d="M9 11l-6 6v3h3l6-6m-3-3l3-3m0 0l5-5a2.121 2.121 0 0 1 3 3l-5 5m-3-3l3 3" /></SVG>
const BulletIcon = () => <SVG><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3" cy="6" r="1" /><circle cx="3" cy="12" r="1" /><circle cx="3" cy="18" r="1" /></SVG>
const NumberedIcon = () => <SVG><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></SVG>
const TaskIcon = () => <SVG><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></SVG>
const QuoteIcon = () => <SVG><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></SVG>
const CodeBlockIcon = () => <SVG><rect x="3" y="3" width="18" height="18" rx="2" /><polyline points="9 12 11 14 15 10" /></SVG>
const RuleIcon = () => <SVG><line x1="3" y1="12" x2="21" y2="12" /></SVG>
const AlignLeftIcon = () => <SVG><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></SVG>
const AlignCenterIcon = () => <SVG><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></SVG>
const AlignRightIcon = () => <SVG><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></SVG>
const LinkIcon = () => <SVG><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></SVG>
const ImageIcon = () => <SVG><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></SVG>
const TableIcon = () => <SVG><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></SVG>
const BookIcon = () => <SVG><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></SVG>
const GlossaryIcon = () => <SVG><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></SVG>
const UndoIcon = () => <SVG><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></SVG>
const RedoIcon = () => <SVG><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 15-6.7L21 13" /></SVG>
