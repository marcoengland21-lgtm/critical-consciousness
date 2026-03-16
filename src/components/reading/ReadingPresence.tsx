'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReadingPresenceProps {
  chapterId: string
  /** Current user's display name (omitted for anonymous presence) */
  userDisplayName?: string
}

/**
 * Reading Presence Glow
 *
 * Shows an anonymous warm indicator when others are reading the same
 * chapter right now. Uses Supabase Realtime Presence (ephemeral, no
 * persistence — no database writes, no tracking, no surveillance).
 *
 * Shows: "🔆 3 others are reading this chapter" — warm amber accent,
 * subtle pulse animation.
 *
 * Why this matters: Solo reading becomes communal. The platform whispers
 * "you're not alone in this" without creating surveillance or pressure.
 */
export default function ReadingPresence({ chapterId, userDisplayName }: ReadingPresenceProps) {
  const [othersCount, setOthersCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()

    // Create a presence channel for this chapter
    const channel = supabase.channel(`reading:${chapterId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Count unique presence keys (each is a reader)
        const totalPresences = Object.keys(state).length
        // Subtract 1 for self
        setOthersCount(Math.max(0, totalPresences - 1))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            // Minimal presence data — just that someone is here.
            // No names, no user IDs. Anonymous by design.
          })
        }
      })

    channelRef.current = channel

    // Clean up subscription on unmount (Rule 8: always clean up realtime)
    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [chapterId])

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) return null

  // Only show when others are present
  if (othersCount === 0) return null

  return (
    <div
      className="flex items-center gap-2 py-2 px-4 rounded-full animate-fade-in"
      style={{
        backgroundColor: 'rgba(var(--accent-amber-rgb), 0.08)',
        color: 'var(--accent-amber)',
        border: '1px solid rgba(var(--accent-amber-rgb), 0.15)',
      }}
    >
      {/* Warm pulsing glow dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          backgroundColor: 'var(--accent-amber)',
          animation: 'pulse 2.5s ease-in-out infinite',
        }}
      />
      <span className="text-sm font-medium">
        {othersCount === 1
          ? '1 other person is reading this chapter'
          : `${othersCount} others are reading this chapter`}
      </span>
    </div>
  )
}
