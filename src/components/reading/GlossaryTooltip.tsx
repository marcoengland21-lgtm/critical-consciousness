'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface GlossaryTooltipProps {
  term: string
  definition: string
  position: { top: number; left: number }
  onClose: () => void
}

export default function GlossaryTooltip({ term, definition, position, onClose }: GlossaryTooltipProps) {
  const router = useRouter()
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleNavigateToGlossary = () => {
    router.push(`/glossary?term=${encodeURIComponent(term)}`)
    onClose()
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 max-w-sm p-3 rounded-lg shadow-lg border animate-scale-in"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        backgroundColor: 'var(--bg-page)',
        borderColor: 'var(--border-default)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="text-xs font-semibold mb-2 text-blue-600">Glossary</div>
      <h4 className="font-semibold mb-2 text-sm">{term}</h4>
      <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
        {definition}
      </p>
      <button
        onClick={handleNavigateToGlossary}
        className="text-xs px-2 py-1 rounded btn-transition font-medium"
        style={{
          backgroundColor: 'var(--accent-red)',
          color: 'var(--text-inverse)',
        }}
      >
        View Full Definition
      </button>
    </div>
  )
}
