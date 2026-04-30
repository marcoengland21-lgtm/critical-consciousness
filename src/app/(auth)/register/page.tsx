'use client'

import { FormEvent, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerUser } from './actions'

/**
 * Register page (Brief 1, Sprint A Session 1).
 *
 * Form fields per mum's S1-S5 designs (corrected by Brief 1 sign-off):
 *   - Invite code    (re-added; helper "From the email or message that
 *                    brought you here")
 *   - Your name      (helper "How you'd like to be known")
 *   - Email
 *   - Password       (helper "At least 8 characters"; min 8 chars)
 *
 * Eyebrow "JOINING WATERMELON" + heading "Create your account" +
 * subhead "You'll be added to Watermelon. Takes a minute." (mum's S1
 * had "...and land on its dashboard" — dropped post-Brief 1 since the
 * onboarding scroll comes between signup and dashboard).
 *
 * Errors:
 *   - General (server / network) → red banner above form (mum's S3
 *     pattern, scope=general)
 *   - Field-scoped (invite/email/password) → small red helper under
 *     the field (mum's S4 pattern)
 *
 * Calls the single registerUser server action — no client-side
 * supabase.auth.signUp dance. Membership creation, sign-in, and
 * use_count increment all run server-side (see actions.ts header).
 *
 * On success, navigates to result.redirectTo:
 *   - /welcome    (normal path — onboarding scroll routes new signups)
 *   - /login      (rare — registration succeeded but session-set failed)
 */
export default function RegisterPage() {
  const router = useRouter()
  // Pre-launch: Watermelon's invite code is autofilled so people clicking
  // through from the email/share link don't have to copy-paste. They can
  // still edit it (e.g. if a future cohort gets a different code) — the
  // field isn't readonly, just pre-populated. Helper text below the field
  // still reads "From the email or message that brought you here." which
  // covers both the autofilled-correct and edit-it-anyway paths.
  const [inviteCode, setInviteCode] = useState('WATERMELON26')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [fieldError, setFieldError] = useState<{
    inviteCode?: string
    email?: string
    password?: string
  }>({})
  const [loading, setLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const clearErrors = () => {
    setGeneralError('')
    setFieldError({})
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearErrors()
    setLoading(true)

    try {
      const result = await registerUser({
        inviteCode,
        displayName,
        email,
        password,
      })

      if (!result.ok) {
        if (result.error.field === 'general') {
          setGeneralError(result.error.message)
        } else {
          setFieldError({ [result.error.field]: result.error.message })
        }
        setLoading(false)
        return
      }

      // Success — navigate to /welcome (or /login on the rare
      // session-set failure). Refresh first so server components
      // re-fetch with the new session cookies.
      router.refresh()
      router.push(result.redirectTo)
    } catch {
      setGeneralError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-eyebrow mb-3">Joining Watermelon</p>
      <h2
        className="text-2xl font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        Create your account
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        You&rsquo;ll be added to Watermelon. Takes a minute.
      </p>

      {generalError && (
        <div className="alert-error mb-4">{generalError}</div>
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
        noValidate
      >
        <div>
          <label
            htmlFor="inviteCode"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Invite code
          </label>
          <input
            type="text"
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="WATERMELON26"
            className="input-base w-full"
            aria-invalid={!!fieldError.inviteCode}
            aria-describedby={fieldError.inviteCode ? 'inviteCode-error' : 'inviteCode-helper'}
          />
          {fieldError.inviteCode ? (
            <p
              id="inviteCode-error"
              className="text-xs mt-1"
              style={{ color: 'var(--accent-red)' }}
            >
              {fieldError.inviteCode}
            </p>
          ) : (
            <p
              id="inviteCode-helper"
              className="text-xs mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              From the email or message that brought you here.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Your name
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you&rsquo;d like to be known"
            className="input-base w-full"
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
            placeholder="you@example.com"
            className="input-base w-full"
            aria-invalid={!!fieldError.email}
            aria-describedby={fieldError.email ? 'email-error' : undefined}
          />
          {fieldError.email && (
            <p
              id="email-error"
              className="text-xs mt-1"
              style={{ color: 'var(--accent-red)' }}
            >
              {fieldError.email}
            </p>
          )}
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
            minLength={8}
            className="input-base w-full"
            aria-invalid={!!fieldError.password}
            aria-describedby={fieldError.password ? 'password-error' : 'password-helper'}
          />
          {fieldError.password ? (
            <p
              id="password-error"
              className="text-xs mt-1"
              style={{ color: 'var(--accent-red)' }}
            >
              {fieldError.password}
            </p>
          ) : (
            <p
              id="password-helper"
              className="text-xs mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              At least 8 characters.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-base disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Watermelon'}
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
