import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MobileNav from '@/components/layout/MobileNav'
import NavLink from '@/components/layout/NavLink'
import LogoutButton from '@/components/layout/LogoutButton'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // TODO: RE-ENABLE AUTH — Remove this bypass when reviewer access is no longer needed
  // if (!user) {
  //   redirect('/')
  // }

  // Fetch user profile for display name (guest fallback if not logged in)
  let displayName = 'Guest'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    displayName = profile?.display_name || user.user_metadata?.display_name || 'User'
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--color-warm-cream)',
      }}
    >
      {/* Navigation Bar */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: 'var(--color-dark-brown)',
          borderColor: 'var(--color-muted-gold)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex-shrink-0 font-bold text-lg"
              style={{
                color: 'var(--color-warm-cream)',
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
              <NavLink href="/concepts">Concepts</NavLink>
              <NavLink href="/schedule">Schedule</NavLink>
              <NavLink href="/resources">Resources</NavLink>
            </div>

            {/* Right Side - User Info and Logout */}
            <div className="flex items-center space-x-4">
              <span
                className="hidden sm:inline text-sm"
                style={{
                  color: 'var(--color-warm-cream)',
                }}
              >
                {displayName}
              </span>
              {/* TODO: RE-ENABLE AUTH — Show LogoutButton only when user is logged in */}
              {user ? <LogoutButton /> : (
                <Link href="/login" className="text-sm font-medium px-3 py-1 rounded" style={{ color: 'var(--color-warm-cream)', border: '1px solid var(--color-muted-gold)' }}>
                  Sign In
                </Link>
              )}
              <MobileNav displayName={displayName} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
