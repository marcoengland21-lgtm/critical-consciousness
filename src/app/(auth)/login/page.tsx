'use client'

import { FormEvent, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginUser } from './actions'

/**
 * Login page (Brief 1, Sprint A Session 1).
 *
 * Mum's I1 design + Brief 1 routing branch:
 *   - Eyebrow "WELCOME BACK"
 *   - Heading "Sign in"
 *   - Subhead "You'll land back on the Watermelon dashboard."
 *     (kept as-is — accurate over the full flow even when onboarding
 *     scroll is the immediate next step for users with
 *     has_completed_onboarding=false)
 *   - Email + password fields
 *   - Generic credential error (mum's I2 — never disambiguates)
 *   - "New here? Join Watermelon" secondary path
 *
 * Routing happens in the loginUser server action based on the
 * has_completed_onboarding flag — see actions.ts.
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginUser(email, password)
      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Refresh first so server components re-fetch with the new
      // session cookies, then push.
      router.refresh()
      router.push(result.redirectTo)
    } catch {
      setError("That email and password don't match. Try again, or reset your password.")
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-eyebrow mb-3">Welcome back</p>
      <h2
        className="text-2xl font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        Sign in
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        You&rsquo;ll land back on the Watermelon dashboard.
      </p>

      {error && <div className="alert-error mb-4">{error}</div>}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            formRef.current?.requestSubmit()
          }
        }}
        className="space-y-4"
        noValidate
      >
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-base w-full"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="input-base w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-base disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p
        className="text-center mt-6 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        New here?{' '}
        <Link
          href="/register"
          className="font-semibold hover:underline"
          style={{ color: 'var(--accent-red)' }}
        >
          Join Watermelon
        </Link>
      </p>
    </div>
  )
}
