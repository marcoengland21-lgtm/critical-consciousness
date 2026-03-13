import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MobileNav from '@/components/layout/MobileNav'
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

  if (!user) {
    redirect('/')
  }

  // Fetch user profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name || user.user_metadata?.display_name || 'User'

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
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/dashboard"
                className="transition-colors hover:opacity-80"
                style={{
                  color: 'var(--color-warm-cream)',
                }}
              >
                Dashboard
              </Link>
              <Link
                href="/schedule"
                className="transition-colors hover:opacity-80"
                style={{
                  color: 'var(--color-warm-cream)',
                }}
              >
                Schedule
              </Link>
              <Link
                href="/threads"
                className="transition-colors hover:opacity-80"
                style={{
                  color: 'var(--color-warm-cream)',
                }}
              >
                Threads
              </Link>
              <Link
                href="/reading"
                className="transition-colors hover:opacity-80"
                style={{
                  color: 'var(--color-warm-cream)',
                }}
              >
                Reading
              </Link>
              <Link
                href="/glossary"
                className="transition-colors hover:opacity-80"
                style={{
                  color: 'var(--color-warm-cream)',
                }}
              >
                Glossary
              </Link>
              <Link
                href="/resources"
                className="transition-colors hover:opacity-80"
                style={{
                  color: 'var(--color-warm-cream)',
                }}
              >
                Resources
              </Link>
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
              <LogoutButton />
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
