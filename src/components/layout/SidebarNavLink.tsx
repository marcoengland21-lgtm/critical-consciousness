'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavIcon from './NavIcon'

interface SidebarNavLinkProps {
  href: string
  icon: string
  label: string
}

export default function SidebarNavLink({ href, icon, label }: SidebarNavLinkProps) {
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
      }}
    >
      <NavIcon name={icon} size={18} />
      <span>{label}</span>
    </Link>
  )
}
