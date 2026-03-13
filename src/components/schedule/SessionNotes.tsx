'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TimeAgo from '@/components/ui/TimeAgo'

interface SessionNotesProps {
  weekId: string
  hasSession: boolean
}

const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'
const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

interface SessionNote {
  id: string
  content: string
  updated_at: string
  updated_by: string | null
  updater_profile?: {
    display_name: string
  } | null
}

export default function SessionNotes({ weekId, hasSession }: SessionNotesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [lastEditor, setLastEditor] = useState<{ name: string; time: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef(createClient())

  // Load initial notes and set up realtime subscription
  useEffect(() => {
    if (!isOpen) return

    const supabase = supabaseRef.current

    async function loadNotes() {
      const { data, error } = await supabase
        .from('session_notes')
        .select('id, content, updated_at, updated_by, updater_profile:profiles!updated_by(display_name)')
        .eq('week_id', weekId)
        .eq('group_id', DEFAULT_GROUP_ID)
        .single()

      if (data) {
        setContent(data.content || '')
        if (data.updated_by && data.updater_profile) {
          const profile = Array.isArray(data.updater_profile)
            ? data.updater_profile[0]
            : data.updater_profile
          if (profile) {
            setLastEditor({
              name: profile.display_name,
              time: data.updated_at,
            })
          }
        }
      }
    }

    loadNotes()

    // Subscribe to realtime changes
    const subscription = supabase
      .channel(`session_notes:${weekId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_notes',
          filter: `week_id=eq.${weekId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setContent(payload.new.content || '')
            if (payload.new.updated_by && payload.new.updater_profile) {
              const profile = Array.isArray(payload.new.updater_profile)
                ? payload.new.updater_profile[0]
                : payload.new.updater_profile
              if (profile) {
                setLastEditor({
                  name: profile.display_name,
                  time: payload.new.updated_at,
                })
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [isOpen, weekId])

  // Debounced save function
  const saveNotes = useCallback(async (newContent: string) => {
    setSaving(true)

    const supabase = supabaseRef.current

    try {
      const { error } = await supabase
        .from('session_notes')
        .upsert({
          week_id: weekId,
          group_id: DEFAULT_GROUP_ID,
          content: newContent,
          updated_by: GUEST_ID,
        }, {
          onConflict: 'week_id,group_id',
        })

      if (error) throw error
    } catch (err) {
      console.error('Failed to save session notes:', err)
    } finally {
      setSaving(false)
    }
  }, [weekId])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer (2 seconds)
    debounceTimerRef.current = setTimeout(() => {
      saveNotes(newContent)
    }, 2000)
  }

  // Save on blur
  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    saveNotes(content)
  }

  if (!hasSession) {
    return null
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e2dfe8' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 flex items-center justify-between transition-colors"
        style={{
          backgroundColor: isOpen ? '#faf9fc' : 'white',
          borderBottom: isOpen ? '1px solid #e2dfe8' : 'none',
        }}
      >
        <h4 className="font-semibold text-sm" style={{ color: 'var(--color-dark-brown)' }}>
          Session Notes
        </h4>
        <span
          className="transition-transform"
          style={{
            color: 'var(--color-warm-gray)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-5 py-4 space-y-3" style={{ backgroundColor: '#faf9fc' }}>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Jot down key points, insights, and discussion highlights from the session..."
            className="w-full px-4 py-3 rounded-lg border text-sm resize-none focus:outline-none"
            style={{
              borderColor: '#e2dfe8',
              color: 'var(--color-dark-brown)',
              lineHeight: '1.85',
              minHeight: '150px',
            }}
          />

          {lastEditor && (
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-warm-gray)' }}>
              <span>
                Last edited by <span className="font-medium">{lastEditor.name}</span>
              </span>
              <TimeAgo date={lastEditor.time} />
            </div>
          )}

          {saving && (
            <div className="text-xs" style={{ color: 'var(--color-muted-gold)' }}>
              Saving...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
