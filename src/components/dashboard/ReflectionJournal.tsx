'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface ReflectionJournalProps {
  weekTitle: string
  weekNumber: number
  existingEntry?: string
  onSave?: (body: string) => Promise<void>
}

/**
 * Weekly Reflection Journal
 *
 * Private, never-shared. A simple textarea per week where each member
 * writes their personal takeaway. Auto-saves on blur.
 *
 * Clearly labeled: "Private — only you can see this."
 *
 * Why this matters: Freire — reflection is prerequisite to action.
 * Before someone can contribute to the group, they need to process
 * their own thinking. The journal gives them a safe space to do that.
 */
export default function ReflectionJournal({
  weekTitle,
  weekNumber,
  existingEntry,
  onSave,
}: ReflectionJournalProps) {
  const [body, setBody] = useState(existingEntry || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(existingEntry ? new Date() : null)
  const [isExpanded, setIsExpanded] = useState(!!existingEntry)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [body])

  const handleSave = useCallback(async () => {
    if (!onSave || !body.trim()) return
    if (body === existingEntry) return // No changes
    setIsSaving(true)
    try {
      await onSave(body.trim())
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save reflection:', error)
    } finally {
      setIsSaving(false)
    }
  }, [body, existingEntry, onSave])

  return (
    <div className="card-base overflow-hidden">
      {/* Header — always visible, clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="card-header w-full text-left flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{
              backgroundColor: 'rgba(var(--accent-purple-rgb), 0.1)',
              color: 'var(--accent-purple)',
            }}
          >
            📓
          </span>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Your Reflection
            </h3>
            <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Private — only you can see this
            </p>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{
            color: 'var(--text-secondary)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms var(--ease-out-expo)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body — collapsible */}
      {isExpanded && (
        <div className="card-body pt-0 animate-fade-in">
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            Week {weekNumber}: {weekTitle}
          </p>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={handleSave}
            placeholder="What stood out to you this week? What questions are you sitting with? This is your private space to think..."
            className="input-base w-full text-sm resize-none min-h-[80px]"
            style={{ lineHeight: 1.7 }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {isSaving
                ? 'Saving…'
                : lastSaved
                  ? `Last saved ${lastSaved.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Pacific/Auckland' })}`
                  : 'Auto-saves when you click away'}
            </span>
            {body.trim() && body !== existingEntry && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs font-medium px-2 py-1 rounded btn-transition"
                style={{
                  color: 'var(--accent-purple)',
                  backgroundColor: 'rgba(var(--accent-purple-rgb), 0.08)',
                }}
              >
                Save now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
