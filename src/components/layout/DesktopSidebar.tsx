'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { navItems } from '@/lib/nav-config'
import SidebarNavLink from './SidebarNavLink'
import ThemeToggle from './ThemeToggle'
import LogoutButton from './LogoutButton'

interface DesktopSidebarProps {
  displayName: string
  hasUser: boolean
}

const COLLAPSED_WIDTH = '60px'
const EXPANDED_WIDTH = '240px'

export default function DesktopSidebar({ displayName, hasUser }: DesktopSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ccp-sidebar-collapsed') === 'true'
    }
    return false
  })

  // Sync --sidebar-width with collapsed state
  useEffect(() => {
    const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
    document.documentElement.style.setProperty('--sidebar-width', width)
    localStorage.setItem('ccp-sidebar-collapsed', String(collapsed))
  }, [collapsed])

  // On mount, set the initial width (overrides the CSS media query default)
  useEffect(() => {
    const handleResize = () => {
      // On mobile (below md breakpoint), always 0px
      if (window.innerWidth < 768) {
        document.documentElement.style.setProperty('--sidebar-width', '0px')
      } else {
        document.documentElement.style.setProperty(
          '--sidebar-width',
          collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
        )
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [collapsed])

  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40"
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        backgroundColor: 'var(--bg-nav)',
        transition: 'width var(--duration-normal) var(--ease-out-expo)',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-6" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <Link
          href="/dashboard"
          className="block font-bold text-lg"
          style={{ color: 'var(--text-inverse)' }}
        >
          {collapsed ? 'C' : (
            <>
              Capital
              <span className="block text-sm font-normal" style={{ opacity: 0.7 }}>
                Study Group
              </span>
            </>
          )}
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
              collapsed={collapsed}
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
              collapsed={collapsed}
            />
          ))}

        {/* Profile — below secondary, only when logged in */}
        {hasUser && (
          <SidebarNavLink href="/profile" icon="user" label="Profile" collapsed={collapsed} />
        )}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid rgba(107, 76, 154, 0.2)' }}>
        {!collapsed && (
          <>
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
          </>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg btn-transition"
          style={{ color: 'var(--text-inverse)', opacity: 0.6 }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform var(--duration-normal) var(--ease-out-expo)',
            }}
          >
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
