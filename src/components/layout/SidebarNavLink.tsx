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
      className="sidebar-link"
      style={{
        color: isActive ? 'var(--accent-purple)' : 'var(--text-inverse)',
        backgroundColor: isActive ? 'rgba(107, 76, 154, 0.15)' : 'transparent',
        opacity: isActive ? 1 : 0.7,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0.625rem' : '0.625rem 1rem',
      }}
      title={collapsed ? label : undefined}
    >
      <NavIcon name={icon} size={18} />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
