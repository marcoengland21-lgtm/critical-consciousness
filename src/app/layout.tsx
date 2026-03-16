import type { Metadata } from 'next'
import './globals.css'
import ThemeInitializer from '@/components/layout/ThemeInitializer'

export const metadata: Metadata = {
  title: 'Capital Study Group',
  description: 'A collaborative platform for reading Capital together',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Capital Study Group',
    description: 'Read together. Think together.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <ThemeInitializer />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
