'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavIcon from './NavIcon'

interface SidebarNavLinkProps {
  href: string
  icon: string
  label: string
  collapsed?: boolean
}

export default function SidebarNavLink({ href, icon, label, collapsed = false }: SidebarNavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`sidebar-link ${collapsed ? 'sidebar-link-collapsed' : ''}`}
      style={{
        color: isActive ? 'var(--accent-purple)' : 'var(--text-inverse)',
        backgroundColor: isActive ? 'rgba(107, 76, 154, 0.15)' : 'transparent',
        opacity: isActive ? 1 : 0.7,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0.625rem' : '0.625rem 1rem',
        overflow: 'hidden',
        transition: 'background-color var(--duration-fast) var(--ease-out-expo), padding var(--duration-slow) var(--ease-out-expo)',
      }}
      aria-label={collapsed ? label : undefined}
      data-tooltip={collapsed ? label : undefined}
    >
      <NavIcon name={icon} size={18} />
      {/* Always render label — opacity transition instead of conditional removal */}
      <span
        className="whitespace-nowrap"
        style={{
          opacity: collapsed ? 0 : 1,
          transition: 'opacity var(--duration-normal) var(--ease-out-expo)',
        }}
      >
        {label}
      </span>
    </Link>
  )
}
