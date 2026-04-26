/**
 * Tiptap editor styles for the journal — chunk 2.5.
 *
 * Lifted in spirit from /Users/marco/Documents/GitHub/test-news but rewritten
 * to use CSG's CSS custom properties so the editor themes correctly in both
 * light and dark mode (the test-news version was hardcoded zinc/violet).
 *
 * Injected as a single <style> tag inside the editor component.
 */

export const journalEditorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 200px;
    font-family: 'Lora', Georgia, 'Times New Roman', serif;
    font-size: 1rem;
    line-height: 1.7;
    color: var(--text-primary);
    caret-color: var(--accent-purple);
  }

  /* Placeholder — only visible when the entire editor is empty */
  .ProseMirror .is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: var(--text-secondary);
    opacity: 0.55;
    float: left;
    height: 0;
    pointer-events: none;
    font-style: italic;
  }

  /* Paragraphs */
  .ProseMirror p {
    margin: 0 0 0.75em 0;
  }

  /* Headings */
  .ProseMirror h1, .ProseMirror h2, .ProseMirror h3,
  .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
    color: var(--text-primary);
    font-family: 'Lora', Georgia, serif;
    font-weight: 600;
    line-height: 1.25;
    margin-top: 1.5em;
    margin-bottom: 0.4em;
    letter-spacing: -0.01em;
  }
  .ProseMirror h1:first-child,
  .ProseMirror h2:first-child,
  .ProseMirror h3:first-child {
    margin-top: 0;
  }
  .ProseMirror h1 { font-size: 1.875rem; }
  .ProseMirror h2 { font-size: 1.5rem; }
  .ProseMirror h3 { font-size: 1.25rem; }
  .ProseMirror h4 { font-size: 1.125rem; }
  .ProseMirror h5 { font-size: 1rem; font-weight: 600; }
  .ProseMirror h6 {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  /* Blockquote */
  .ProseMirror blockquote,
  .ProseMirror .editor-blockquote {
    border-left: 3px solid var(--accent-purple);
    padding: 0.5em 1em;
    margin: 1em 0;
    font-style: italic;
    color: var(--text-secondary);
    background-color: rgba(var(--accent-purple-rgb), 0.06);
    border-radius: 0 4px 4px 0;
  }

  /* Lists */
  .ProseMirror ul, .ProseMirror ol {
    padding-left: 1.5rem;
    margin: 0.25em 0 0.75em 0;
  }
  .ProseMirror li { margin: 0.15em 0; line-height: 1.6; }
  .ProseMirror li > p { margin: 0; }
  .ProseMirror ul li::marker { color: var(--accent-purple); }
  .ProseMirror ol li::marker { color: var(--accent-purple); font-weight: 500; }

  /* Inline code */
  .ProseMirror code {
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 0.85em;
    background: var(--bg-soft);
    color: var(--accent-red);
    padding: 0.15em 0.35em;
    border-radius: 3px;
  }

  /* Code block */
  .ProseMirror pre,
  .ProseMirror .editor-code-block {
    font-family: 'SF Mono', 'Menlo', monospace;
    background: var(--bg-soft);
    color: var(--text-primary);
    padding: 0.875em 1em;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1em 0;
    font-size: 0.875em;
    line-height: 1.55;
  }
  .ProseMirror pre code { background: none; color: inherit; padding: 0; }

  /* Horizontal rule */
  .ProseMirror hr,
  .ProseMirror .editor-hr {
    border: none;
    height: 1px;
    background: var(--border-default);
    margin: 1.5em 0;
  }

  /* Links */
  .ProseMirror a,
  .ProseMirror .editor-link {
    color: var(--accent-purple);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .ProseMirror a:hover { color: var(--accent-purple-hover); }

  /* Images */
  .ProseMirror img,
  .ProseMirror .editor-image {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 1em 0;
  }

  /* Selected node outline (e.g. selected image) */
  .ProseMirror .ProseMirror-selectednode {
    outline: 2px solid var(--accent-purple);
    outline-offset: 2px;
  }

  /* Selection */
  .ProseMirror ::selection {
    background: rgba(var(--accent-purple-rgb), 0.25);
  }

  /* Strong + emphasis */
  .ProseMirror strong { font-weight: 600; color: var(--text-primary); }
  .ProseMirror em { font-style: italic; }

  /* Task lists (checkboxes) */
  .ProseMirror ul[data-type="taskList"],
  .ProseMirror .editor-task-list {
    list-style: none;
    padding-left: 0;
  }
  .ProseMirror ul[data-type="taskList"] li,
  .ProseMirror .editor-task-item {
    display: flex;
    align-items: flex-start;
    gap: 0.6em;
    margin: 0.25em 0;
  }
  .ProseMirror ul[data-type="taskList"] li > label {
    flex-shrink: 0;
    margin-top: 0.3em;
  }
  .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--accent-purple);
    cursor: pointer;
    border-radius: 3px;
  }
  .ProseMirror ul[data-type="taskList"] li > div { flex: 1; }
  .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
    text-decoration: line-through;
    color: var(--text-secondary);
    opacity: 0.7;
  }

  /* Text alignment */
  .ProseMirror [style*="text-align: center"] { text-align: center; }
  .ProseMirror [style*="text-align: right"] { text-align: right; }
  .ProseMirror [style*="text-align: justify"] { text-align: justify; }

  /* Highlight (mark) */
  .ProseMirror mark {
    background-color: rgba(var(--accent-amber-rgb), 0.35);
    color: inherit;
    border-radius: 2px;
    padding: 0.05em 0;
  }

  /* Tables */
  .ProseMirror table,
  .ProseMirror .editor-table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 100%;
    margin: 1em 0;
    overflow: hidden;
  }
  .ProseMirror table td,
  .ProseMirror table th {
    border: 1px solid var(--border-default);
    padding: 0.5em 0.75em;
    vertical-align: top;
    box-sizing: border-box;
    position: relative;
  }
  .ProseMirror table th {
    background-color: var(--bg-card-alt);
    font-weight: 600;
    text-align: left;
  }
  .ProseMirror table .selectedCell:after {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(var(--accent-purple-rgb), 0.15);
    pointer-events: none;
  }
  .ProseMirror table .column-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: var(--accent-purple);
    cursor: col-resize;
  }

  /* Citation footer for inserted Reference quotes */
  .ProseMirror blockquote .reference-cite {
    display: block;
    margin-top: 0.4em;
    font-style: normal;
    font-size: 0.85em;
    color: var(--text-secondary);
  }
`
