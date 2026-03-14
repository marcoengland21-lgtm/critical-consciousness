'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '@/lib/nav-config'
import NavIcon from './NavIcon'
import ThemeToggle from './ThemeToggle'
import LogoutButton from './LogoutButton'

interface MobileMoreDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: NavItem[]
  displayName: string
  hasUser: boolean
}

export default function MobileMoreDrawer({
  isOpen,
  onClose,
  items,
  displayName,
  hasUser,
}: MobileMoreDrawerProps) {
  const pathname = usePathname()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] animate-backdrop"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderTopLeftRadius: '0.75rem',
          borderTopRightRadius: '0.75rem',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Handle indicator */}
        <div className="flex justify-center py-3">
          <div
            className="w-8 h-1 rounded-full"
            style={{ backgroundColor: 'var(--border-strong)' }}
          />
        </div>

        {/* Nav items */}
        <nav className="px-4 pb-2">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 py-3 px-3 rounded-lg"
                style={{
                  color: isActive ? 'var(--accent-purple)' : 'var(--text-primary)',
                  backgroundColor: isActive ? 'var(--bg-soft)' : 'transparent',
                  minHeight: '48px',
                }}
                onClick={onClose}
              >
                <NavIcon name={item.icon} size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer: theme + user */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {displayName}
            </span>
          </div>
          {hasUser ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium px-3 py-1 rounded"
              style={{ color: 'var(--accent-red)', border: '1px solid var(--border-default)' }}
              onClick={onClose}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
