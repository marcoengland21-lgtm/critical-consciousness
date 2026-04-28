'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TimeAgo from '@/components/ui/TimeAgo'

interface SessionNotesProps {
  weekId: string
  hasSession: boolean
  /** Active group context (L1) — required to scope session notes. */
  groupId: string
}

const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

interface SessionNote {
  id: string
  content: string
  updated_at: string
  updated_by: string | null
  updater_profile?: {
    display_name: string
  } | null
}

export default function SessionNotes({ weekId, hasSession, groupId }: SessionNotesProps) {
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
        .eq('group_id', groupId)
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
  }, [isOpen, weekId, groupId])

  // Debounced save function
  const saveNotes = useCallback(async (newContent: string) => {
    setSaving(true)

    const supabase = supabaseRef.current

    try {
      const { error } = await supabase
        .from('session_notes')
        .upsert({
          week_id: weekId,
          group_id: groupId,
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
  }, [weekId, groupId])

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
    <div className="card-base">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 flex items-center justify-between transition-colors"
        style={{
          backgroundColor: isOpen ? 'var(--bg-card-alt)' : 'var(--bg-card)',
          borderBottom: isOpen ? '1px solid var(--border-default)' : 'none',
        }}
      >
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Session Notes
        </h4>
        <span
          style={{
            color: 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform var(--duration-normal) var(--ease-out-expo)',
            display: 'inline-block',
          }}
        >
          ▼
        </span>
      </button>

      <div className="collapsible-content" data-open={isOpen}>
        <div className="collapsible-inner">
        <div className="px-5 py-4 space-y-3" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Jot down key points, insights, and discussion highlights from the session..."
            className="input-base text-sm w-full"
            style={{
              resize: 'none',
              lineHeight: '1.85',
              minHeight: '150px',
            }}
          />

          {lastEditor && (
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>
                Last edited by <span className="font-medium">{lastEditor.name}</span>
              </span>
              <TimeAgo date={lastEditor.time} />
            </div>
          )}

          {saving && (
            <div className="text-xs" style={{ color: 'var(--accent-purple)' }}>
              Saving...
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
