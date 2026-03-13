'use client'

import { useState } from 'react'
import NavLink from './NavLink'

interface MobileNavProps {
  displayName?: string
}

export default function MobileNav({ displayName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        className="md:hidden p-2 rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          color: 'var(--color-warm-cream)',
        }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              isOpen
                ? 'M6 18L18 6M6 6l12 12'
                : 'M4 6h16M4 12h16M4 18h16'
            }
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 py-2 border-t animate-fade-in"
          style={{
            backgroundColor: 'var(--color-dark-brown)',
            borderColor: 'rgba(196, 163, 90, 0.2)',
          }}
        >
          <NavLink href="/dashboard" mobile onClick={() => setIsOpen(false)}>Dashboard</NavLink>
          <NavLink href="/reading" mobile onClick={() => setIsOpen(false)}>Reading</NavLink>
          <NavLink href="/threads" mobile onClick={() => setIsOpen(false)}>Threads</NavLink>
          <NavLink href="/schedule" mobile onClick={() => setIsOpen(false)}>Schedule</NavLink>
          <NavLink href="/glossary" mobile onClick={() => setIsOpen(false)}>Glossary</NavLink>
          <NavLink href="/resources" mobile onClick={() => setIsOpen(false)}>Resources</NavLink>
        </div>
      )}
    </>
  )
}
