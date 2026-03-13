'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/ui/Toast'

interface ReadingCheckinButtonProps {
  weekId: string
  currentStatus?: 'done' | 'partial' | 'behind' | null
}

const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'
const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

const STATUS_OPTIONS = [
  { value: 'done', label: '✓ Done', icon: '✓' },
  { value: 'partial', label: '~ Partial', icon: '~' },
  { value: 'behind', label: '⏳ Behind', icon: '⏳' },
] as const

export default function ReadingCheckinButton({ weekId, currentStatus }: ReadingCheckinButtonProps) {
  const [status, setStatus] = useState<'done' | 'partial' | 'behind' | null>(currentStatus || null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function handleStatusChange(newStatus: 'done' | 'partial' | 'behind') {
    setSaving(true)

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('reading_checkins')
        .upsert({
          user_id: GUEST_ID,
          week_id: weekId,
          group_id: DEFAULT_GROUP_ID,
          status: newStatus,
        }, {
          onConflict: 'user_id,week_id',
        })

      if (error) throw error

      setStatus(newStatus)
      setToast({ message: `Reading status saved: ${STATUS_OPTIONS.find(o => o.value === newStatus)?.label}`, type: 'success' })
    } catch (err) {
      console.error('Failed to save reading status:', err)
      setToast({ message: 'Failed to save reading status', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mt-4 pt-4 border-t" style={{ borderColor: '#e2dfe8' }}>
        <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-muted-gold)' }}>
          Your Progress
        </p>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border"
              style={{
                backgroundColor: status === option.value ? 'var(--color-dark-brown)' : 'white',
                color: status === option.value ? 'var(--color-warm-cream)' : 'var(--color-dark-brown)',
                borderColor: status === option.value ? 'var(--color-dark-brown)' : '#e2dfe8',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}
