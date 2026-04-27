'use client'

/**
 * DesktopSidebar — chunk 3b piece 3.
 *
 * Rail + hover-reveal pattern per frame 12B.
 *
 *   Default: 60px icon rail, always visible. No user toggle, no
 *            localStorage persistence, no auto-hide.
 *   Hover anywhere on the rail → expand to 240px with labels alongside
 *            the icons. Brand monogram "C" stays put; "Capital / Study
 *            Group" two-line title fades in. Avatar at the bottom gains
 *            the user's display name.
 *   Focus on any descendant → same expansion (mirrors hover so keyboard
 *            users / motor-difficulty users / power users get the same
 *            discovery affordance).
 *   Mouse leaves rail / focus leaves rail → collapse back to icons.
 *   Click an icon at any width → navigate (expansion never gates
 *            clickability).
 *
 * Content overlay model (Mars's confirmed answer #1): the expanded
 * rail OVERLAYS the leftmost ~180px of content; main content's
 * `marginLeft` stays at 60px regardless of hover. No layout shift
 * on hover — that would be a hover-tax for the most hesitant
 * members.
 *
 * Piece 6 obsolescence: this swap removes the
 * `ccp-sidebar-collapsed` localStorage persistence entirely. Server
 * renders rail at 60px; client hydrates to the same 60px; nothing
 * to flicker. Piece 6 is solved by construction.
 *
 * Naming: "Capital / Study Group" is the PLATFORM brand (per Mars's
 * naming addendum) and stays at the top of the sidebar across all
 * groups / instances. Group-name eyebrows ("Watermelon" for the seed
 * instance) live on dashboard / status-strip surfaces and are
 * handled in Piece 4.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { navItems } from '@/lib/nav-config'
import SidebarNavLink from './SidebarNavLink'
import ThemeToggle from './ThemeToggle'
import LogoutButton from './LogoutButton'

interface DesktopSidebarProps {
  displayName: string
  hasUser: boolean
}

const RAIL_WIDTH = '60px'
const EXPANDED_WIDTH = '240px'

export default function DesktopSidebar({ displayName, hasUser }: DesktopSidebarProps) {
  // Transient hover/focus state. NOT persisted. Default false on every
  // mount so server + client renders match (no hydration mismatch).
  const [expanded, setExpanded] = useState(false)

  // Sync --sidebar-width with the viewport. The rail width is fixed
  // at 60px on desktop; main content always offsets by that amount.
  // The expanded sidebar OVERLAYS content — `--sidebar-width` does NOT
  // change on hover.
  useEffect(() => {
    const syncWidth = () => {
      if (window.innerWidth < 768) {
        document.documentElement.style.setProperty('--sidebar-width', '0px')
      } else {
        document.documentElement.style.setProperty('--sidebar-width', RAIL_WIDTH)
      }
    }
    syncWidth()
    window.addEventListener('resize', syncWidth)
    return () => window.removeEventListener('resize', syncWidth)
  }, [])

  const initial = displayName.charAt(0).toUpperCase()
  const labelTransition = 'opacity var(--duration-normal) var(--ease-out-expo)'

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      // React onFocus/onBlur bubble (synthetic focusin/focusout under
      // the hood). When any descendant gains focus the rail expands;
      // when focus leaves the rail it collapses. Mirrors hover so
      // keyboard navigation gets the same discovery affordance.
      onFocus={() => setExpanded(true)}
      onBlur={(e) => {
        // Only collapse if focus is leaving the entire aside, not
        // moving between two descendants (e.relatedTarget is the
        // element receiving focus next).
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setExpanded(false)
        }
      }}
      className="chrome-scoped hidden md:flex flex-col fixed top-0 left-0 h-screen z-40"
      style={{
        width: expanded ? EXPANDED_WIDTH : RAIL_WIDTH,
        backgroundColor: 'var(--bg-nav)',
        overflow: 'hidden',
        transition: 'width var(--duration-slow) var(--ease-out-expo)',
        boxShadow: expanded ? '4px 0 24px rgba(0,0,0,0.18)' : 'none',
      }}
      aria-label="Main navigation"
    >
      {/* Brand area — "C" monogram always visible (Link to /dashboard);
          "Capital / Study Group" two-line title fades in on expand.
          The old click-to-toggle and panel-icon-collapse buttons are
          gone — the rail handles discovery via hover. */}
      <div
        className="flex items-center py-5 shrink-0"
        style={{
          paddingLeft: '14px',
          paddingRight: '10px',
          minHeight: '68px',
        }}
      >
        <Link
          href="/dashboard"
          aria-label="Capital Study Group — go to dashboard"
          className="flex items-center gap-2.5 min-w-0 group"
          style={{ textDecoration: 'none' }}
        >
          <span
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              backgroundColor: 'var(--nav-accent)',
              color: 'var(--text-inverse)',
            }}
          >
            C
          </span>
          <span
            className="whitespace-nowrap overflow-hidden"
            style={{
              color: 'var(--text-inverse)',
              opacity: expanded ? 1 : 0,
              transition: labelTransition,
            }}
          >
            <span className="font-bold text-sm block">Capital</span>
            <span className="text-xs block" style={{ opacity: 0.7 }}>Study Group</span>
          </span>
        </Link>
      </div>

      {/* Separator */}
      <div className="mx-4 mb-2 shrink-0" style={{ borderBottom: '1px solid var(--nav-accent)' }} />

      {/* Navigation Links — single flat block. Profile is NOT in this
          list (per existing Rule 1); profile is reached via the user
          avatar block at the bottom. */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden" aria-label="Pages">
        {navItems
          .filter((item) => item.href !== '/profile')
          .map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              expanded={expanded}
            />
          ))}
      </nav>

      {/* Bottom Section — user identity + theme/logout controls. */}
      <div
        className="shrink-0 mx-2 mb-2 px-1 py-3 rounded-lg"
        style={{
          backgroundColor: 'rgba(var(--accent-purple-rgb), 0.06)',
          borderTop: '1px solid var(--nav-accent-subtle)',
        }}
      >
        {/* User avatar — always visible, name + chevron fade in on expand. */}
        <div className="mb-2 overflow-hidden" style={{ minHeight: '32px' }}>
          {hasUser ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-1 py-1 rounded-md hover-bg-themed group"
              aria-label={`Profile — ${displayName}`}
              style={{ textDecoration: 'none' }}
            >
              <span
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: 'var(--nav-accent)',
                  color: 'var(--text-inverse)',
                }}
              >
                {initial}
              </span>
              <span
                className="flex-1 text-sm truncate whitespace-nowrap"
                style={{
                  color: 'var(--text-inverse)',
                  opacity: expanded ? 0.8 : 0,
                  transition: labelTransition,
                }}
              >
                {displayName}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 transition-opacity"
                aria-hidden="true"
                style={{
                  color: 'var(--text-inverse)',
                  opacity: expanded ? 0.4 : 0,
                  transition: labelTransition,
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <Link
                href="/login"
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--nav-accent-subtle)',
                  color: 'var(--text-inverse)',
                  opacity: 0.7,
                }}
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
                  opacity: expanded ? 1 : 0,
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
            </div>
          )}
        </div>

        {/* Theme toggle + logout — fade with the rail. */}
        <div
          className="flex items-center justify-between px-1 overflow-hidden relative"
          style={{
            opacity: expanded ? 1 : 0,
            height: expanded ? 'auto' : 0,
            transition: `opacity var(--duration-normal) var(--ease-out-expo), height var(--duration-slow) var(--ease-out-expo)`,
            pointerEvents: expanded ? 'auto' : 'none',
          }}
        >
          <ThemeToggle />
          {hasUser && <LogoutButton />}
        </div>
      </div>
    </aside>
  )
}
