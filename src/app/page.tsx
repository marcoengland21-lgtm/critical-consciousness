import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  // TODO: RE-ENABLE AUTH — Restore user check and redirect when reviewer access is no longer needed
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // if (user) { redirect('/dashboard') }

  return (
    <main
      className="flex items-center justify-center min-h-screen p-4"
      style={{
        backgroundColor: 'var(--color-warm-cream)',
      }}
    >
      <div className="text-center max-w-md">
        <h1
          className="text-5xl font-bold mb-4"
          style={{
            color: 'var(--color-deep-red)',
          }}
        >
          Critical Consciousness
        </h1>
        <p
          className="text-xl mb-8"
          style={{
            color: 'var(--color-dark-brown)',
          }}
        >
          A collaborative study platform for reading Marx's Capital
        </p>
        <div className="space-y-4">
          <Link
            href="/login"
            className="inline-block px-8 py-3 rounded-lg font-semibold transition-colors w-full"
            style={{
              backgroundColor: 'var(--color-deep-red)',
              color: 'var(--color-warm-cream)',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-block px-8 py-3 rounded-lg font-semibold transition-colors w-full border-2"
            style={{
              borderColor: 'var(--color-dark-brown)',
              color: 'var(--color-dark-brown)',
            }}
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  )
}
