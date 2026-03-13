'use client'

import { useState } from 'react'
import Link from 'next/link'

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
          className="md:hidden absolute top-full left-0 right-0 py-4 space-y-2"
          style={{
            backgroundColor: 'var(--color-dark-brown)',
          }}
        >
          <Link
            href="/dashboard"
            className="block px-6 py-2 hover:opacity-80"
            style={{
              color: 'var(--color-warm-cream)',
            }}
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/schedule"
            className="block px-6 py-2 hover:opacity-80"
            style={{
              color: 'var(--color-warm-cream)',
            }}
            onClick={() => setIsOpen(false)}
          >
            Schedule
          </Link>
          <Link
            href="/threads"
            className="block px-6 py-2 hover:opacity-80"
            style={{
              color: 'var(--color-warm-cream)',
            }}
            onClick={() => setIsOpen(false)}
          >
            Threads
          </Link>
          <Link
            href="/reading"
            className="block px-6 py-2 hover:opacity-80"
            style={{
              color: 'var(--color-warm-cream)',
            }}
            onClick={() => setIsOpen(false)}
          >
            Reading
          </Link>
          <Link
            href="/glossary"
            className="block px-6 py-2 hover:opacity-80"
            style={{
              color: 'var(--color-warm-cream)',
            }}
            onClick={() => setIsOpen(false)}
          >
            Glossary
          </Link>
          <Link
            href="/resources"
            className="block px-6 py-2 hover:opacity-80"
            style={{
              color: 'var(--color-warm-cream)',
            }}
            onClick={() => setIsOpen(false)}
          >
            Resources
          </Link>
        </div>
      )}
    </>
  )
}
