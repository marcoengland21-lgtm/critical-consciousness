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

  const initial = displayName.charAt(0).toUpperCase()
  const labelTransition = 'opacity var(--duration-normal) var(--ease-out-expo)'

  return (
    <aside
      className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-40"
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        backgroundColor: 'var(--bg-nav)',
        overflow: 'hidden',
        transition: mounted ? 'width var(--duration-slow) var(--ease-out-expo)' : 'none',
      }}
    >
      {/* Brand area */}
      <div
        className="flex items-center justify-between py-5 shrink-0"
        style={{
          paddingLeft: '14px',
          paddingRight: collapsed ? '14px' : '10px',
          minHeight: '68px',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* "C" monogram — click to expand when collapsed, click to collapse when expanded */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm btn-transition"
            style={{
              backgroundColor: 'var(--nav-accent)',
              color: 'var(--text-inverse)',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            C
          </button>

          {/* Full name — fades with sidebar, links to dashboard */}
          <Link
            href="/dashboard"
            className="whitespace-nowrap overflow-hidden"
            style={{
              color: 'var(--text-inverse)',
              textDecoration: 'none',
              opacity: collapsed ? 0 : 1,
              transition: labelTransition,
            }}
          >
            <span className="font-bold text-sm block">Capital</span>
            <span className="text-xs block" style={{ opacity: 0.7 }}>Study Group</span>
          </Link>
        </div>

        {/* Sidebar panel icon — toggle collapse, fades when collapsed */}
        <button
          onClick={() => setCollapsed(true)}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md btn-transition"
          style={{
            color: 'var(--text-inverse)',
            opacity: collapsed ? 0 : 0.4,
            pointerEvents: collapsed ? 'none' : 'auto',
            transition: labelTransition,
          }}
          aria-label="Collapse sidebar"
        >
          {/* Sidebar panel icon — two vertical panels, left one highlighted */}
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div className="mx-4 mb-2 shrink-0" style={{ borderBottom: '1px solid var(--nav-accent)' }} />

      {/* Navigation Links */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden" aria-label="Main navigation">
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

        {/* Divider */}
        <div className="my-2 mx-2" style={{ borderBottom: '1px solid var(--nav-accent-subtle)' }} />

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

        {/* Profile */}
        {hasUser && (
          <SidebarNavLink href="/profile" icon="user" label="Profile" collapsed={collapsed} />
        )}
      </nav>

      {/* Bottom Section — user identity + controls */}
      <div className="shrink-0 px-2 py-3" style={{ borderTop: '1px solid var(--nav-accent-subtle)' }}>
        {/* User avatar — always visible, adapts to collapsed/expanded */}
        <div
          className="flex items-center gap-2 px-1 mb-2 overflow-hidden"
          style={{ minHeight: '32px' }}
        >
          {hasUser ? (
            <>
              <Link
                href="/profile"
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: 'var(--nav-accent)',
                  color: 'var(--text-inverse)',
                }}
                title={collapsed ? displayName : undefined}
                aria-label={`Profile — ${displayName}`}
              >
                {initial}
              </Link>
              <span
                className="text-sm truncate whitespace-nowrap"
                style={{
                  color: 'var(--text-inverse)',
                  opacity: collapsed ? 0 : 0.8,
                  transition: labelTransition,
                }}
              >
                {displayName}
              </span>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--nav-accent-subtle)',
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
              <span
                className="whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  transition: labelTransition,
                }}
              >
                <Link
                  href="/login"
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-inverse)' }}
                >
                  Sign In
                </Link>
              </span>
            </>
          )}
        </div>

        {/* Theme toggle + logout — fade with sidebar */}
        <div
          className="flex items-center justify-between px-1 overflow-hidden"
          style={{
            opacity: collapsed ? 0 : 1,
            height: collapsed ? 0 : 'auto',
            transition: `opacity var(--duration-normal) var(--ease-out-expo), height var(--duration-slow) var(--ease-out-expo)`,
          }}
        >
          <ThemeToggle />
          {hasUser && <LogoutButton />}
        </div>
      </div>
    </aside>
  )
}
