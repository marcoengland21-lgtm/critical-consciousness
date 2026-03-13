'use client'

import { useRef, useEffect } from 'react'

interface Props {
  rect: DOMRect
  onAnnotate: () => void
  onStartThread: () => void
  onClose: () => void
}

export default function SelectionToolbar({ rect, onAnnotate, onStartThread, onClose }: Props) {
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Position above the selection (fixed to viewport)
  const top = Math.max(8, rect.top - 48)
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - 100, window.innerWidth - 216))

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 150)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-1 px-1.5 py-1 rounded-lg shadow-lg border animate-fade-in"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        backgroundColor: 'var(--bg-nav)',
        borderColor: 'rgba(196, 163, 90, 0.3)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <button
        onClick={onAnnotate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-white/10"
        style={{ color: 'var(--text-inverse)' }}
        title="Add an annotation to this passage"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Annotate
      </button>
      <div className="w-px h-4" style={{ backgroundColor: 'rgba(245, 240, 232, 0.2)' }} />
      <button
        onClick={onStartThread}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-white/10"
        style={{ color: 'var(--text-inverse)' }}
        title="Start a discussion thread about this passage"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        Start Thread
      </button>
    </div>
  )
}
