'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  rect: DOMRect
  selectedText: string
  onSave: (body: string) => Promise<void>
  onCancel: () => void
  isGuest: boolean
}

export default function AnnotationPopover({ rect, selectedText, onSave, onCancel, isGuest }: Props) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Position the popover near the selection (fixed to viewport)
  const top = Math.min(rect.bottom + 8, window.innerHeight - 260)
  const left = Math.max(16, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 336))

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel()
      }
    }
    // Delay to avoid immediate trigger from the mouseup
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onCancel])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    await onSave(body.trim())
    setSaving(false)
  }

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 rounded-lg shadow-lg border"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-default)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* Selected text preview */}
      <div
        className="px-4 pt-3 pb-2 text-xs border-b"
        style={{
          borderColor: 'var(--border-default)',
          color: 'var(--text-secondary)',
        }}
      >
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Annotate:
        </span>{' '}
        &ldquo;{selectedText.length > 80 ? selectedText.slice(0, 80) + '…' : selectedText}&rdquo;
      </div>

      <form onSubmit={handleSubmit} className="p-3">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isGuest ? 'Share your thoughts (as Guest)...' : 'Share your thoughts on this passage...'}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          style={{
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            lineHeight: '1.6',
          }}
        />
        <div className="flex items-center justify-between mt-2">
          {isGuest && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Posting as Guest
            </span>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !body.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-red)',
                color: 'var(--text-inverse)',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
