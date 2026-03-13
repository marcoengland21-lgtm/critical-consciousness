'use client'

import { useState, useRef, useEffect } from 'react'

interface FootnoteInlineProps {
  number: number
  content: string
  author: 'marx' | 'engels'
}

export default function FootnoteInline({ number, content, author }: FootnoteInlineProps) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLSpanElement>(null)

  const isEngels = author === 'engels'

  return (
    <>
      <sup
        className="footnote-marker"
        style={{
          color: isEngels ? 'var(--accent-purple)' : 'var(--accent-red)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.75em',
          lineHeight: 0,
          position: 'relative',
          verticalAlign: 'super',
          padding: '0 1px',
          userSelect: 'none',
        }}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        title={`Footnote ${number}${isEngels ? ' (Engels)' : ''} — click to ${isOpen ? 'collapse' : 'expand'}`}
        role="button"
        aria-expanded={isOpen}
        aria-label={`Footnote ${number}`}
      >
        [{number}]
      </sup>
      {isOpen && (
        <span
          ref={contentRef}
          className="footnote-content"
          style={{
            display: 'inline',
            fontSize: '0.85em',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            backgroundColor: isEngels
              ? 'rgba(107, 76, 154, 0.08)'
              : 'rgba(163, 21, 69, 0.06)',
            borderLeft: `2px solid ${isEngels ? 'var(--accent-purple)' : 'var(--accent-red)'}`,
            padding: '2px 8px',
            marginLeft: '4px',
            borderRadius: '0 4px 4px 0',
          }}
        >
          {isEngels && (
            <span
              style={{
                fontSize: '0.8em',
                fontWeight: 600,
                color: 'var(--accent-purple)',
                marginRight: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              [Engels]
            </span>
          )}
          {content}
          <span
            style={{
              cursor: 'pointer',
              marginLeft: '6px',
              color: 'var(--text-secondary)',
              opacity: 0.6,
              fontSize: '0.85em',
            }}
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
            role="button"
            aria-label="Close footnote"
          >
            ✕
          </span>
        </span>
      )}
    </>
  )
}
