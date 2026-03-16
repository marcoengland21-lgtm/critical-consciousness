'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validateInviteCode } from './actions'

export default function RegisterPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validate invite code first
      const codeResult = await validateInviteCode(inviteCode)
      if (!codeResult.valid) {
        setError(codeResult.error || 'Invalid invite code')
        setLoading(false)
        return
      }

      // Proceed with signup
      const supabase = createClient()
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists')
        return
      }

      // If email confirmation is disabled, redirect straight to dashboard
      if (data?.session) {
        router.refresh()
        router.push('/dashboard')
      } else {
        setSuccess('Account created! Check your email to confirm, then sign in.')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2
        className="text-2xl font-bold mb-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Create Account
      </h2>

      {error && (
        <div
          className="p-4 rounded-lg mb-4 text-sm"
          style={{
            backgroundColor: 'rgba(139, 38, 53, 0.1)',
            color: 'var(--accent-red)',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="p-4 rounded-lg mb-4 text-sm"
          style={{
            backgroundColor: 'rgba(138, 154, 123, 0.2)',
            color: 'var(--accent-green)',
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="inviteCode"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Invite Code
          </label>
          <input
            type="text"
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            placeholder="Enter your invite code"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--text-secondary)', '--tw-ring-color': 'var(--accent-purple)' } as React.CSSProperties}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            You need an invite code from an existing member to join.
          </p>
        </div>

        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Your Name
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="How you want to be known in the group"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--text-secondary)', '--tw-ring-color': 'var(--accent-purple)' } as React.CSSProperties}
          />
        </div>

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
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--text-secondary)', '--tw-ring-color': 'var(--accent-purple)' } as React.CSSProperties}
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
            required
            minLength={6}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--text-secondary)', '--tw-ring-color': 'var(--accent-purple)' } as React.CSSProperties}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-base disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Join the Study Group'}
        </button>
      </form>

      <p
        className="text-center mt-6 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: 'var(--accent-red)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
