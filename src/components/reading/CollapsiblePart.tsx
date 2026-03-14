'use client'

import { useState } from 'react'

interface Props {
  partNumber: number
  partTitle: string
  defaultOpen: boolean
  children: React.ReactNode
}

export default function CollapsiblePart({ partNumber, partTitle, defaultOpen, children }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      {/* Part header — clickable toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-3 flex items-center justify-between text-left transition-colors"
        style={{
          backgroundColor: 'var(--bg-soft)',
          borderBottom: isOpen ? '1px solid var(--border-default)' : 'none',
        }}
        aria-expanded={isOpen}
        aria-controls={`part-${partNumber}-content`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-purple)' }}>
            Part {partNumber}
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {partTitle}
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Collapsible content */}
      <div
        id={`part-${partNumber}-content`}
        role="region"
        aria-label={`Part ${partNumber}: ${partTitle}`}
        style={{
          display: isOpen ? 'block' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
