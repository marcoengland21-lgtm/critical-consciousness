import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import MobileNav from '@/components/layout/MobileNav'
import NavLink from '@/components/layout/NavLink'
import LogoutButton from '@/components/layout/LogoutButton'
import ThemeToggle from '@/components/layout/ThemeToggle'
import ThemeProvider from '@/components/layout/ThemeProvider'
import NavigationProgress from '@/components/layout/NavigationProgress'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use session (local JWT read) instead of getUser (network call)
  // This runs on every page navigation — must be instant
  const user = await getSessionUser()

  // Display name: prefer JWT metadata (instant, no network call)
  // Only query Supabase profile if JWT doesn't have the name
  let displayName = 'Guest'
  if (user) {
    displayName = user.user_metadata?.display_name || 'User'
    // Only hit Supabase if we couldn't get the name from JWT
    if (displayName === 'User') {
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      if (profile?.display_name) displayName = profile.display_name
    }
  }

  return (
    <ThemeProvider>
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--bg-page)',
      }}
    >
      <NavigationProgress />
      {/* Skip to main content — accessibility for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
      >
        Skip to main content
      </a>

      {/* Navigation Bar */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: 'var(--bg-nav)',
          borderColor: 'var(--accent-purple)',
        }}
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex-shrink-0 font-bold text-lg"
              style={{
                color: 'var(--text-inverse)',
              }}
            >
              Critical Consciousness
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/reading">Reading</NavLink>
              <NavLink href="/threads">Threads</NavLink>
              <NavLink href="/glossary">Glossary</NavLink>
              <NavLink href="/schedule">Schedule</NavLink>
              <NavLink href="/resources">Resources</NavLink>
            </div>

            {/* Right Side - User Info and Logout */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span
                className="hidden sm:inline text-sm"
                style={{
                  color: 'var(--text-inverse)',
                }}
              >
                {displayName}
              </span>
              {/* TODO: RE-ENABLE AUTH — Show LogoutButton only when user is logged in */}
              {user ? <LogoutButton /> : (
                <Link href="/login" className="text-sm font-medium px-3 py-1 rounded" style={{ color: 'var(--text-inverse)', border: '1px solid var(--accent-purple)' }}>
                  Sign In
                </Link>
              )}
              <MobileNav displayName={displayName} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {children}
      </main>
    </div>
    </ThemeProvider>
  )
}
