import { createClient, getSessionUser } from '@/lib/supabase/server'
import DesktopSidebar from '@/components/layout/DesktopSidebar'
import MobileTabBar from '@/components/layout/MobileTabBar'
import ThemeProvider from '@/components/layout/ThemeProvider'
import AccessibilityProvider from '@/components/layout/AccessibilityProvider'
import ReadingGuide from '@/components/reading/ReadingGuide'
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
              {children}
            </main>
          </div>

          {/* Mobile Bottom Tab Bar */}
          <MobileTabBar displayName={displayName} hasUser={!!user} />

          {/* Reading guide overlay — follows cursor for line tracking */}
          <ReadingGuide />
        </div>
      </AccessibilityProvider>
    </ThemeProvider>
  )
}
