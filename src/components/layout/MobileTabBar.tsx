'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from '@/lib/nav-config'
import NavIcon from './NavIcon'
import MobileMoreDrawer from './MobileMoreDrawer'

interface MobileTabBarProps {
  displayName: string
  hasUser: boolean
}

export default function MobileTabBar({ displayName, hasUser }: MobileTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const pathname = usePathname()

  const tabItems = navItems.filter((n) => n.mobileTab)
  const moreItems = navItems.filter((n) => !n.mobileTab)

  // Check if any "more" item is active (to highlight the More tab)
  const moreIsActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      <div className="chrome-scoped mobile-tab-bar md:hidden">
        <div className="flex items-center justify-around px-2" style={{ height: '60px' }}>
          {tabItems.map((item) => {
            // Hide Profile tab when no user
            if (item.href === '/profile' && !hasUser) return null
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 py-1 relative"
                style={{
                  color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                {/* Active top accent bar */}
                {isActive && (
                  <span
                    className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent-purple)' }}
                  />
                )}
                <NavIcon name={item.icon} size={20} />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1"
            style={{
              color: moreIsActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
              opacity: moreIsActive ? 1 : 0.6,
            }}
          >
            <NavIcon name="more" size={20} />
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </div>
      </div>

      <MobileMoreDrawer
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={moreItems}
        displayName={displayName}
        hasUser={hasUser}
      />
    </>
  )
}
