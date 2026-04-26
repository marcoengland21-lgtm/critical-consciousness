/**
 * Tiptap extensions for the journal editor — chunk 2.5.
 *
 * Lifted from /Users/marco/Documents/GitHub/test-news (writer-studio editor)
 * with journalism-specific marks dropped: CommentMark, SuggestionInsertMark,
 * SuggestionDeleteMark, SuggestionPlugin. Those are part of the test-news
 * track-changes / collaborative-review workflow that doesn't apply to a
 * private journal.
 *
 * Everything else carries over: StarterKit (with full heading range,
 * blockquote, lists, code block, horizontal rule), Underline, TextStyle,
 * Color, Highlight, TextAlign, TaskList/TaskItem, Tables, Link, Image,
 * Placeholder.
 */

import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

export interface JournalExtensionsConfig {
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string
}

export function createJournalExtensions(config: JournalExtensionsConfig = {}) {
  const { placeholder = 'Start writing…' } = config

  return [
    // Core: paragraphs, bold, italic, strike, code, headings (H1-H6),
    // blockquote, bullet/ordered list, code block, horizontal rule, undo/redo.
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
      blockquote: { HTMLAttributes: { class: 'editor-blockquote' } },
      codeBlock: { HTMLAttributes: { class: 'editor-code-block' } },
      horizontalRule: { HTMLAttributes: { class: 'editor-hr' } },
    }),

    // Inline marks
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),

    // Block: alignment
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),

    // Placeholder — only when the editor is empty (Google Docs-like)
    Placeholder.configure({
      placeholder: ({ editor }) => (editor.isEmpty ? placeholder : ''),
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-node-empty',
    }),

    // Links (don't auto-open on click — let the link button surface inline)
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: {
        class: 'editor-link',
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),

    // Images (signed Supabase Storage URLs at render time)
    TiptapImage.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'editor-image' },
    }),

    // Task lists (checkboxes)
    TaskList.configure({
      HTMLAttributes: { class: 'editor-task-list' },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { class: 'editor-task-item' },
    }),

    // Tables
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'editor-table' },
    }),
    TableRow,
    TableHeader,
    TableCell,
  ]
}
