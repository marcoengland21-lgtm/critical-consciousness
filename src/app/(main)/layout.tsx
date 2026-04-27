import { headers } from 'next/headers'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import DesktopSidebar from '@/components/layout/DesktopSidebar'
import MobileTabBar from '@/components/layout/MobileTabBar'
import ThemeProvider from '@/components/layout/ThemeProvider'
import AccessibilityProvider from '@/components/layout/AccessibilityProvider'
// ReadingGuide moved to ChapterReader — only renders on reading pages
import NavigationProgress from '@/components/layout/NavigationProgress'
import SystemStatusStrip from '@/components/layout/SystemStatusStrip'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Use session (local JWT read) instead of getUser (network call)
  // This runs on every page navigation — must be instant
  const user = await getSessionUser()

  // Chunk 3b piece 4: SystemStatusStrip is suppressed on /dashboard
  // because the dashboard renders its own integrated header (group-
  // name eyebrow + greeting + orientation line). Other routes still
  // get the strip. The pathname is read from the request headers
  // (Next.js 15+ pattern: app router doesn't expose pathname directly
  // on a server component layout, but the middleware-set
  // x-pathname header is reliable when present).
  const headerStore = await headers()
  const pathname =
    headerStore.get('x-pathname') ||
    headerStore.get('next-url') ||
    headerStore.get('referer') ||
    ''
  const isDashboard = pathname.endsWith('/dashboard') || pathname.includes('/dashboard?')

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
      <AccessibilityProvider>
        <div
          className="min-h-screen"
          style={{
            backgroundColor: 'var(--bg-page)',
          }}
        >
          {/* Skip to main content — accessibility for keyboard/screen reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
            style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
          >
            Skip to main content
          </a>

          {/* Desktop Sidebar Navigation */}
          <DesktopSidebar displayName={displayName} hasUser={!!user} />

          {/* Content Area — offset by sidebar width on desktop */}
          <div style={{ marginLeft: 'var(--sidebar-width, 0px)' }}>
            <NavigationProgress />

            {/* Main Content — animation handled by template.tsx on each navigation */}
            <main
              id="main-content"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8"
              role="main"
            >
              {/* Ambient context line — top of every authenticated page (§2.6).
                  Suppressed on /dashboard (chunk 3b piece 4) — the dashboard
                  carries the same info in its own integrated header. Only
                  renders when there's a logged-in user. */}
              {user && !isDashboard && <SystemStatusStrip />}
              {children}
            </main>
          </div>

          {/* Mobile Bottom Tab Bar */}
          <MobileTabBar displayName={displayName} hasUser={!!user} />

          {/* ReadingGuide now lives in ChapterReader — scoped to reading pages */}
        </div>
      </AccessibilityProvider>
    </ThemeProvider>
  )
}
