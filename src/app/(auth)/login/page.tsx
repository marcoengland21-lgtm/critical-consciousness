'use client'

import { FormEvent, useState, useRef } from 'react'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.refresh()
      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2
        className="text-2xl font-bold mb-6"
        style={{
          color: 'var(--text-primary)',
        }}
      >
        Sign In
      </h2>

      {error && (
        <div className="alert-error mb-4">
          {error}
        </div>
      )}

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
      >
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2"
            style={{
              color: 'var(--text-primary)',
            }}
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-base w-full"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-2"
            style={{
              color: 'var(--text-primary)',
            }}
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-base w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-base disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p
        className="text-center mt-6"
        style={{
          color: 'var(--text-secondary)',
        }}
      >
        Don't have an account?{' '}
        <Link
          href="/register"
          className="font-semibold hover:underline"
          style={{
            color: 'var(--accent-red)',
          }}
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
