import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  // Redirect authenticated users directly to dashboard.
  // Uses getSessionUser() (local JWT read) instead of getUser() (network call)
  // because the root page only needs to know whether a session exists. The
  // network call to Supabase auth was timing out the edge function.
  const user = await getSessionUser()
  if (user) { redirect('/dashboard') }

  return (
    <main
      className="flex items-center justify-center min-h-screen p-4"
      style={{
        backgroundColor: 'var(--bg-page)',
      }}
    >
      <div className="text-center max-w-md">
        <h1
          className="text-5xl font-bold mb-4"
          style={{
            color: 'var(--accent-red)',
          }}
        >
          Capital Study Group
        </h1>
        <p
          className="text-xl mb-8"
          style={{
            color: 'var(--text-primary)',
          }}
        >
          A collaborative study platform for reading Marx's Capital
        </p>
        <div className="space-y-4">
          <Link
            href="/login"
            className="inline-block px-8 py-3 rounded-lg font-semibold transition-colors w-full"
            style={{
              backgroundColor: 'var(--accent-red)',
              color: 'var(--text-inverse)',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-block px-8 py-3 rounded-lg font-semibold transition-colors w-full border-2"
            style={{
              borderColor: 'var(--text-primary)',
              color: 'var(--text-primary)',
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  )
}
