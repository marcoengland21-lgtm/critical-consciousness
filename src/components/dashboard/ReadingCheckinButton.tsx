'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/ui/Toast'

interface ReadingCheckinButtonProps {
  weekId: string
  currentStatus?: 'done' | 'partial' | 'behind' | null
}

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

const STATUS_OPTIONS = [
  { value: 'done', label: 'Done', activeBg: 'var(--accent-green)', activeColor: 'var(--text-inverse)' },
  { value: 'partial', label: 'Partial', activeBg: 'var(--accent-purple)', activeColor: 'var(--text-inverse)' },
  { value: 'behind', label: 'Behind', activeBg: 'var(--text-secondary)', activeColor: 'var(--bg-page)' },
] as const

export default function ReadingCheckinButton({ weekId, currentStatus }: ReadingCheckinButtonProps) {
  const [status, setStatus] = useState<'done' | 'partial' | 'behind' | null>(currentStatus || null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  async function handleStatusChange(newStatus: 'done' | 'partial' | 'behind') {
    setSaving(true)

    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setToast({ message: 'Sign in to track your reading progress', type: 'error' })
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('reading_checkins')
        .upsert({
          user_id: user.id,
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
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <p className="text-xs font-semibold mb-2 tracking-wide" style={{ color: 'var(--accent-purple)' }}>
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
                backgroundColor: status === option.value ? option.activeBg : 'var(--bg-card)',
                color: status === option.value ? option.activeColor : 'var(--text-primary)',
                borderColor: status === option.value ? option.activeBg : 'var(--border-default)',
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
