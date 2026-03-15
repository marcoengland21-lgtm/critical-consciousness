'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import MarkdownBody from '@/components/ui/MarkdownBody'

interface GlossaryTooltipProps {
  term: string
  definition: string
  position: { top: number; left: number }
  onClose: () => void
}

export default function GlossaryTooltip({ term, definition, position, onClose }: GlossaryTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState(position)

  // Viewport-aware positioning — constrain so card stays on screen
  useEffect(() => {
    if (!tooltipRef.current) return
    const rect = tooltipRef.current.getBoundingClientRect()
    const pad = 16

    let top = position.top
    let left = position.left

    // Horizontal: keep within viewport
    if (left + rect.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - rect.width - pad)
    }
    if (left < pad) left = pad

    // Vertical: if tooltip would go off bottom, flip above the term
    if (top + rect.height > window.innerHeight + window.scrollY - pad) {
      // Position above the clicked element (position.top already includes scrollY + 8px offset)
      top = position.top - rect.height - 48
    }

    setAdjustedPos({ top, left })
  }, [position])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 w-80 sm:w-96 rounded-xl shadow-xl animate-scale-in"
      style={{
        top: `${adjustedPos.top}px`,
        left: `${adjustedPos.left}px`,
        backgroundColor: 'rgba(var(--bg-card-rgb), 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <span
          className="text-[10px] font-semibold tracking-wide uppercase"
          style={{ color: 'var(--accent-purple)' }}
        >
          Glossary
        </span>
        <h4
          className="text-base font-bold mt-0.5"
          style={{ color: 'var(--text-primary)' }}
        >
          {term}
        </h4>
      </div>

      {/* Definition */}
      <div
        className="px-4 pb-3 text-sm"
        style={{ color: 'var(--text-secondary)', lineHeight: '1.7', maxHeight: '200px', overflowY: 'auto' }}
      >
        <MarkdownBody content={definition} />
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <Link
          href={`/glossary?term=${encodeURIComponent(term)}`}
          onClick={onClose}
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--accent-purple)' }}
        >
          View in Glossary →
        </Link>
      </div>
    </div>
  )
}
