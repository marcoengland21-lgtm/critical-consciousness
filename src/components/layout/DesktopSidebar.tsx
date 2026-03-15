'use client'

import Link from 'next/link'
import { navItems } from '@/lib/nav-config'
import SidebarNavLink from './SidebarNavLink'
import ThemeToggle from './ThemeToggle'
import LogoutButton from './LogoutButton'

interface DesktopSidebarProps {
  displayName: string
  hasUser: boolean
}

export default function DesktopSidebar({ displayName, hasUser }: DesktopSidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40"
      style={{
        width: 'var(--sidebar-width, 240px)',
        backgroundColor: 'var(--bg-nav)',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-6">
        <Link
          href="/dashboard"
          className="block font-bold text-lg"
          style={{ color: 'var(--text-inverse)' }}
        >
          Capital
          <span className="block text-sm font-normal" style={{ opacity: 0.7 }}>
            Study Group
          </span>
        </Link>
      </div>

      {/* Separator */}
      <div className="mx-4 mb-2" style={{ borderBottom: '1px solid rgba(107, 76, 154, 0.3)' }} />

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {/* Primary nav: Dashboard, Reading, Threads */}
        {navItems
          .filter((item) => item.mobileTab && item.href !== '/profile')
          .map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}

        {/* Divider between primary and secondary nav */}
        <div className="my-2 mx-2" style={{ borderBottom: '1px solid rgba(107, 76, 154, 0.2)' }} />

        {/* Secondary nav: Glossary, Schedule, Resources */}
        {navItems
          .filter((item) => !item.mobileTab)
          .map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}

        {/* Profile — below secondary, only when logged in */}
        {hasUser && (
          <SidebarNavLink href="/profile" icon="user" label="Profile" />
        )}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid rgba(107, 76, 154, 0.2)' }}>
        <div className="flex items-center justify-between">
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between">
          <span
            className="text-sm truncate"
            style={{ color: 'var(--text-inverse)', opacity: 0.8 }}
          >
            {displayName}
          </span>
          {hasUser ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium px-3 py-1 rounded"
              style={{ color: 'var(--text-inverse)', border: '1px solid var(--accent-purple)' }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </aside>
  )
}
