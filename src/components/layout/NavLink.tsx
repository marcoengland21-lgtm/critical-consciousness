'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  children: React.ReactNode
  mobile?: boolean
  onClick?: () => void
}

export default function NavLink({ href, children, mobile, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  if (mobile) {
    return (
      <Link
        href={href}
        className="block px-6 py-2 text-sm font-medium transition-colors"
        style={{
          color: isActive ? 'var(--color-muted-gold)' : 'var(--color-warm-cream)',
          backgroundColor: isActive ? 'rgba(196, 163, 90, 0.1)' : 'transparent',
        }}
        onClick={onClick}
      >
        {children}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`nav-link text-sm font-medium transition-colors ${isActive ? 'nav-link-active' : ''}`}
      style={{
        color: isActive ? 'var(--color-muted-gold)' : 'var(--color-warm-cream)',
      }}
    >
      {children}
    </Link>
  )
}
