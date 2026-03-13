import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Critical Consciousness',
  description: 'A collaborative study platform for political education',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
