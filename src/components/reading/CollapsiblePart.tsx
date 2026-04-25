'use client'

import { useState } from 'react'

interface Props {
  partNumber: number
  partTitle: string
  defaultOpen: boolean
  children: React.ReactNode
}

/** Numerals 1-8 spelled out for editorial eyebrows (per IMPROVEMENTS_PLAN §2.3 — "01 / PART ONE"). */
const PART_NUMERAL = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT']

export default function CollapsiblePart({ partNumber, partTitle, defaultOpen, children }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const padded = String(partNumber).padStart(2, '0')
  const numeral = PART_NUMERAL[partNumber] || String(partNumber)

  return (
    <div>
      {/* Part header — clickable toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left btn-transition"
        style={{
          backgroundColor: isOpen ? 'var(--bg-soft)' : 'var(--bg-card-alt)',
          borderBottom: '1px solid',
          borderColor: isOpen ? 'var(--border-default)' : 'transparent',
        }}
        aria-expanded={isOpen}
        aria-controls={`part-${partNumber}-content`}
      >
        <div>
          {/* Editorial eyebrow per §2.3: "01 / PART ONE" */}
          <p className="text-eyebrow mb-1">
            {padded} / Part {numeral}
          </p>
          <p
            className="text-display-md"
            style={{ color: 'var(--text-primary)' }}
          >
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
          className="flex-shrink-0"
          style={{
            color: 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--duration-normal) var(--ease-out-expo)',
          }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Collapsible content — smooth height transition via CSS grid */}
      <div
        id={`part-${partNumber}-content`}
        role="region"
        aria-label={`Part ${partNumber}: ${partTitle}`}
        className="collapsible-content"
        data-open={isOpen}
      >
        <div className="collapsible-inner">
          {children}
        </div>
      </div>
    </div>
  )
}
