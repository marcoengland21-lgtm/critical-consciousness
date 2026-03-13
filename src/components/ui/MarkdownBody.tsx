'use client'

/**
 * Lightweight markdown renderer for thread bodies and replies.
 * Supports: **bold**, *italic*, > blockquotes, `inline code`,
 * and line breaks. No dependencies needed.
 */

interface Props {
  content: string
  className?: string
}

export default function MarkdownBody({ content, className = '' }: Props) {
  const html = renderMarkdown(content)
  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function renderMarkdown(text: string): string {
  // Split into lines for blockquote handling
  const lines = text.split('\n')
  const result: string[] = []
  let inBlockquote = false

  for (const line of lines) {
    if (line.startsWith('> ')) {
      if (!inBlockquote) {
        result.push('<blockquote>')
        inBlockquote = true
      }
      result.push(`<p>${renderInline(line.slice(2))}</p>`)
    } else {
      if (inBlockquote) {
        result.push('</blockquote>')
        inBlockquote = false
      }
      if (line.trim() === '') {
        result.push('<br />')
      } else {
        result.push(`<p>${renderInline(line)}</p>`)
      }
    }
  }

  if (inBlockquote) {
    result.push('</blockquote>')
  }

  return result.join('')
}

function renderInline(text: string): string {
  return text
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`(.+?)`/g, '<code>$1</code>')
}
