'use client'

/**
 * SidebarNavLink — chunk 3b piece 3.
 *
 * Single nav row in the rail+hover-reveal sidebar. Icon always
 * visible; label fades in alongside the icon when the rail is
 * expanded (hover or focus on any descendant).
 *
 * Active route highlight stays as today: 3px purple left border + a
 * purple-tinted background + brighter text. Visible in both rail and
 * expanded states.
 *
 * `data-tooltip` attribute removed — the rail's hover-reveal is the
 * affordance; per-icon tooltips would duplicate it as noise. Screen
 * readers still announce the route via `aria-label` when the visual
 * label is hidden in rail mode.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavIcon from './NavIcon'

interface SidebarNavLinkProps {
  href: string
  icon: string
  label: string
  /** Whether the rail is expanded (hover or focus). When false the
      rail is showing icons only; when true labels are visible. */
  expanded?: boolean
}

export default function SidebarNavLink({ href, icon, label, expanded = false }: SidebarNavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  // Padding is asymmetric so the icon's centerline lands at the same
  // pixel position regardless of expansion state — the icon never
  // jumps as the rail widens.
  //   Rail (60px wide):     px-2 (8px) outer + pl-[10px] inner = icon centred ~30px
  //   Expanded (240px wide): pl-[11px] same icon position; label slots in to the right.
  return (
    <Link
      href={href}
      className="sidebar-link flex items-center gap-3 rounded-md whitespace-nowrap"
      style={{
        color: isActive ? 'var(--accent-purple)' : 'var(--text-inverse)',
        backgroundColor: isActive ? 'rgba(107, 76, 154, 0.15)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--accent-purple)' : '3px solid transparent',
        opacity: isActive ? 1 : 0.7,
        overflow: 'hidden',
        padding: expanded
          ? '0.625rem 1rem 0.625rem 11px'
          : '0.625rem 0.5rem 0.625rem 10px',
        transition:
          'background-color var(--duration-fast) var(--ease-out-expo), ' +
          'border-color var(--duration-fast) var(--ease-out-expo), ' +
          'padding var(--duration-slow) var(--ease-out-expo), ' +
          'opacity var(--duration-fast) var(--ease-out-expo)',
      }}
      // aria-label gives the destination to screen readers regardless
      // of whether the visual label is currently shown.
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <NavIcon name={icon} size={18} />
      <span
        style={{
          opacity: expanded ? 1 : 0,
          transition: 'opacity var(--duration-normal) var(--ease-out-expo)',
        }}
      >
        {label}
      </span>
    </Link>
  )
}
