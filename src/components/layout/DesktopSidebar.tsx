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
  // Initialize as false unconditionally to avoid hydration mismatch.
  // Server always renders expanded; useEffect syncs from localStorage on mount.
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Read saved preference on mount (after hydration)
  useEffect(() => {
    const saved = localStorage.getItem('ccp-sidebar-collapsed')
    if (saved === 'true') {
      setCollapsed(true)
    }
    setMounted(true)
  }, [])

  // Sync --sidebar-width with collapsed state
  useEffect(() => {
    if (!mounted) return
    const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
    document.documentElement.style.setProperty('--sidebar-width', width)
    localStorage.setItem('ccp-sidebar-collapsed', String(collapsed))
  }, [collapsed, mounted])

  // Handle resize — mobile always 0px
  useEffect(() => {
    const handleResize = () => {
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

  // First letter of display name for collapsed avatar
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40"
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        backgroundColor: 'var(--bg-nav)',
        transition: mounted ? 'width var(--duration-normal) var(--ease-out-expo)' : 'none',
      }}
    >
      {/* Brand */}
      <div
        className="py-6"
        style={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          paddingLeft: collapsed ? '0' : '1.25rem',
          paddingRight: collapsed ? '0' : '1.25rem',
          textAlign: collapsed ? 'center' : 'left',
        }}
      >
        <Link
          href="/dashboard"
          className="block font-bold text-lg"
          style={{ color: 'var(--text-inverse)' }}
          title={collapsed ? 'Capital Study Group — Dashboard' : undefined}
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
      <div className="px-3 py-4 space-y-2" style={{ borderTop: '1px solid rgba(107, 76, 154, 0.2)' }}>
        {/* Expanded: full controls */}
        {!collapsed && (
          <>
            <div className="flex items-center justify-between px-1">
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between px-1">
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

        {/* Collapsed: user identity — initial avatar or sign-in icon */}
        {collapsed && (
          <div className="flex justify-center">
            {hasUser ? (
              <Link
                href="/profile"
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: 'rgba(107, 76, 154, 0.3)',
                  color: 'var(--text-inverse)',
                }}
                title={displayName}
                aria-label={`Profile — ${displayName}`}
              >
                {initial}
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(107, 76, 154, 0.2)',
                  color: 'var(--text-inverse)',
                  opacity: 0.7,
                }}
                title="Sign In"
                aria-label="Sign In"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </Link>
            )}
          </div>
        )}

        {/* Collapse/expand toggle */}
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
