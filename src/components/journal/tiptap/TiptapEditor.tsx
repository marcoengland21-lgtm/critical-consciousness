'use client'

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { createJournalExtensions } from './extensions'
import { journalEditorStyles } from './styles'
import TiptapToolbar from './TiptapToolbar'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DocumentStats {
  wordCount: number
  characterCount: number
  readingTimeMinutes: number
}

export interface TiptapEditorProps {
  /** Initial Tiptap JSON document. Empty doc = `{ type: 'doc', content: [] }`. */
  initialContent: object
  placeholder?: string
  /** Compact mode: only bold / italic / link toolbar buttons. Used by the
      dashboard quick-capture panel. Reference + Glossary modals are NOT
      available in compact mode (per chunk 2.5 §6). */
  compact?: boolean
  /** Called every time the editor content changes (debounced upstream). */
  onContentChange?: (content: { json: object; text: string }) => void
  /** Called when stats change (word count etc). */
  onStatsChange?: (stats: DocumentStats) => void
  /** Called once when the editor is created — gives the parent a handle. */
  onEditorReady?: (editor: Editor) => void
  autoFocus?: boolean
  className?: string
  /** Min visible height of the writing surface, in px. */
  minHeight?: number
  /** Optional uploadImage handler — called when the user picks an image
      from the toolbar. Returns the uploaded image URL to insert into the doc. */
  uploadImage?: (file: File) => Promise<string>
  /** Open the Reference modal (passes a callback the modal calls back with
      the selected insertion). Optional — only wired in the full editor. */
  onOpenReference?: () => void
  /** Open the Glossary modal. Optional — only wired in the full editor. */
  onOpenGlossary?: () => void
}

// ── Stats ────────────────────────────────────────────────────────────────────

function calculateStats(text: string): DocumentStats {
  const trimmed = text.trim()
  if (!trimmed) {
    return { wordCount: 0, characterCount: 0, readingTimeMinutes: 0 }
  }
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  const characterCount = trimmed.length
  // 200 wpm matches the chapter reading-time estimate per CLAUDE.md decision log.
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))
  return { wordCount, characterCount, readingTimeMinutes }
}

function isEmptyDoc(json: object | null | undefined): boolean {
  if (!json) return true
  // Tiptap's empty doc is { type: 'doc', content: [] } or has only an empty paragraph.
  const doc = json as { type?: string; content?: unknown[] }
  if (!doc.content || doc.content.length === 0) return true
  if (
    doc.content.length === 1 &&
    typeof doc.content[0] === 'object' &&
    doc.content[0] !== null &&
    (doc.content[0] as { type?: string }).type === 'paragraph' &&
    !(doc.content[0] as { content?: unknown[] }).content
  ) {
    return true
  }
  return false
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * TiptapEditor — the full Tiptap-based journal writing surface.
 *
 * Lifted from /Users/marco/Documents/GitHub/test-news WriterEditor with
 * the journalism-specific bits dropped: comments, suggestion/track-changes,
 * template picker, page ruler, document-outline, research/tools drawers,
 * grade-level/Flesch stats. Per chunk 2.5 brief.
 *
 * Lifted patterns kept (these are the things a textarea rebuild was missing):
 * - `useEditor` configured with the full extensions stack
 * - `useLayoutEffect` race-condition-guarded prop sync (prevents stale-prop
 *   overwriting user's typing — see comment block below)
 * - `lastEmittedContent` ref pattern
 * - Empty-content safety guard (never wipe a non-empty editor with empty)
 * - Stats debounce (200ms)
 * - data-gramm/data-lt attrs to suppress browser-extension inline UI
 */
const TiptapEditor = memo(function TiptapEditor({
  initialContent,
  placeholder = 'Start writing…',
  compact = false,
  onContentChange,
  onStatsChange,
  onEditorReady,
  autoFocus = true,
  className,
  minHeight = 240,
  uploadImage,
  onOpenReference,
  onOpenGlossary,
}: TiptapEditorProps) {
  // Stable JSON-string identity for the prop, so we only sync when content
  // truly differs from what's in the editor.
  const initialContentKey = useMemo(() => JSON.stringify(initialContent), [initialContent])
  const lastEmittedContentRef = useRef<string>(initialContentKey)
  const statsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [statsInternal, setStatsInternal] = useState<DocumentStats>({ wordCount: 0, characterCount: 0, readingTimeMinutes: 0 })

  const extensions = useMemo(() => createJournalExtensions({ placeholder }), [placeholder])

  const editor = useEditor({
    extensions,
    content: initialContent,
    immediatelyRender: false, // SSR safety — Next.js App Router needs this
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'prose-journal',
        spellcheck: 'true',
        role: 'textbox',
        'aria-multiline': 'true',
        // Suppress Grammarly / LanguageTool browser extensions from injecting
        // their UI into the editor (lifted from test-news rationale).
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-lt-active': 'false',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON()
      const text = ed.getText()
      const jsonKey = JSON.stringify(json)
      lastEmittedContentRef.current = jsonKey

      onContentChange?.({ json, text })

      // Debounce stats — getText() + word splitting is O(n) per keystroke.
      if (statsTimerRef.current) clearTimeout(statsTimerRef.current)
      statsTimerRef.current = setTimeout(() => {
        const stats = calculateStats(text)
        setStatsInternal(stats)
        onStatsChange?.(stats)
      }, 200)
    },
    onCreate: ({ editor: ed }) => {
      onEditorReady?.(ed)
      // Initial stats
      const stats = calculateStats(ed.getText())
      setStatsInternal(stats)
      onStatsChange?.(stats)
    },
  })

  // Sync content from prop → editor ONLY for truly external changes
  // (e.g. switching to a different journal entry). Lifted from WriterEditor:
  //
  // useLayoutEffect (not useEffect) prevents a race where the user types
  // between React commit and effect execution. With useEffect, user keystrokes
  // could fire after the commit but before the effect runs, causing the guard
  // (content === lastEmittedContent) to fail and setContent() to overwrite
  // the editor with stale prop content — losing the user's work.
  // useLayoutEffect runs synchronously after commit, before paint/events,
  // eliminating the race window.
  useLayoutEffect(() => {
    if (!editor || !editor.view) return
    if (initialContentKey === lastEmittedContentRef.current) return

    const editorJsonKey = JSON.stringify(editor.getJSON())
    if (initialContentKey === editorJsonKey) {
      lastEmittedContentRef.current = initialContentKey
      return
    }

    // SAFETY GUARD: don't overwrite a non-empty editor with empty incoming
    // content. Prevents a stale prop from wiping the user's work.
    const editorIsEmpty = editor.getText().trim().length === 0
    const incomingIsEmpty = isEmptyDoc(initialContent)
    if (!editorIsEmpty && incomingIsEmpty) {
      lastEmittedContentRef.current = editorJsonKey
      return
    }

    editor.commands.setContent(initialContent)
    lastEmittedContentRef.current = initialContentKey
  }, [editor, initialContent, initialContentKey])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (statsTimerRef.current) clearTimeout(statsTimerRef.current)
    }
  }, [])

  // Image-pick handler — opens a hidden file input + uploads via prop.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handlePickImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor || !uploadImage) return
    try {
      const url = await uploadImage(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      console.error('[CCP] Image upload failed:', err)
      alert('Image upload failed: ' + (err instanceof Error ? err.message : 'unknown'))
    } finally {
      // Reset so the same file can be picked twice in a row.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [editor, uploadImage])

  return (
    <div className={className} style={{ position: 'relative' }}>
      <style>{journalEditorStyles}</style>

      {editor && (
        <TiptapToolbar
          editor={editor}
          compact={compact}
          onPickImage={uploadImage ? handlePickImage : undefined}
          onOpenReference={onOpenReference}
          onOpenGlossary={onOpenGlossary}
        />
      )}

      {/* Hidden file input for image upload */}
      {uploadImage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
      )}

      <div
        className="prose-journal-wrapper px-1 py-3"
        style={{ minHeight: `${minHeight}px` }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Stats footer — exposed in the parent via onStatsChange but also
          rendered here for convenience. The parent can hide its own footer
          if it wants to use this one (currently the JournalEditor wrapper
          does its own footer with status indicator). */}
      <div className="text-eyebrow flex items-center justify-end pt-2" style={{ display: 'none' }}>
        <span>{statsInternal.wordCount} {statsInternal.wordCount === 1 ? 'word' : 'words'}</span>
      </div>
    </div>
  )
})

TiptapEditor.displayName = 'TiptapEditor'
export default TiptapEditor
