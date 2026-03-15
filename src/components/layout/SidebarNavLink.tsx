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

  // Keep justification constant (flex-start) so the icon never jumps.
  // Transition the padding smoothly — icon slides to ~center of collapsed rail.
  // Collapsed: nav px-2 (8px) + link pl-[13px] = 21px, icon center at 30px = center of 60px rail
  // Expanded: nav px-2 (8px) + link pl-[14px] = 22px from left, looks normal
  return (
    <Link
      href={href}
      className={`sidebar-link ${collapsed ? 'sidebar-link-collapsed' : ''}`}
      style={{
        color: isActive ? 'var(--accent-purple)' : 'var(--text-inverse)',
        backgroundColor: isActive ? 'rgba(107, 76, 154, 0.15)' : 'transparent',
        opacity: isActive ? 1 : 0.7,
        overflow: 'hidden',
        padding: collapsed ? '0.625rem 0.5rem 0.625rem 13px' : '0.625rem 1rem 0.625rem 14px',
        transition: 'background-color var(--duration-fast) var(--ease-out-expo), padding var(--duration-slow) var(--ease-out-expo)',
      }}
      aria-label={collapsed ? label : undefined}
      data-tooltip={collapsed ? label : undefined}
    >
      <NavIcon name={icon} size={18} />
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
