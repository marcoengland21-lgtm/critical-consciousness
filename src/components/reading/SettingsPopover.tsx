'use client'

/**
 * SettingsPopover — chunk 3b piece 2a.
 *
 * Anchored to the gear icon in the chapter top toolbar (frame 02). Holds:
 *   - Text Size slider
 *   - Accessibility toggles (High Contrast / Dyslexia-friendly font /
 *     Reading pacer)
 *   - Menu Size segmented preset
 *   - Focus mode toggle  (moved here from the old Workspace panel —
 *     Mars confirmed this in the Piece 1 surface answers)
 *   - Reset to defaults
 *
 * Scope: chrome — settings UI is chrome regardless of where it appears.
 *
 * Implementation note: this is a fresh build rather than wrapping the
 * existing AccessibilityPanel, because the design has a different
 * structure (eyebrow + Lora italic title + close X) and Focus mode is
 * new. AccessibilityPanel still serves the mobile drawer until Piece 3.
 */

import { Popover } from '@/components/overlay'
import {
  useAccessibility,
  type ChromeSize,
} from '@/components/layout/AccessibilityProvider'

interface SettingsPopoverProps {
  open: boolean
  onClose: () => void
  /** The gear icon's button ref — popover anchors to it. */
  anchor: React.RefObject<HTMLElement | null>
  /** Focus mode is per-chapter local state, owned by ChapterReader. */
  focusedMode: boolean
  onFocusedModeChange: (on: boolean) => void
}

const CHROME_SIZE_OPTIONS: { value: ChromeSize; label: string; aria: string }[] = [
  { value: 'small', label: 'S', aria: 'Small menu text' },
  { value: 'regular', label: 'M', aria: 'Regular menu text' },
  { value: 'large', label: 'L', aria: 'Large menu text' },
  { value: 'extra-large', label: 'XL', aria: 'Extra-large menu text' },
]

export default function SettingsPopover({
  open,
  onClose,
  anchor,
  focusedMode,
  onFocusedModeChange,
}: SettingsPopoverProps) {
  const {
    fontSize,
    setFontSize,
    chromeSize,
    setChromeSize,
    highContrast,
    setHighContrast,
    dyslexiaFont,
    setDyslexiaFont,
    readingGuide,
    setReadingGuide,
    setReadingGuideWpm,
    setReadingGuidePlaying,
  } = useAccessibility()

  const handleReset = () => {
    setFontSize(16)
    setChromeSize('regular')
    setHighContrast(false)
    setDyslexiaFont(false)
    setReadingGuide(false)
    setReadingGuideWpm(200)
    setReadingGuidePlaying(false)
    onFocusedModeChange(false)
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchor={anchor}
      scope="chrome"
      placement="bottom-start"
      width={360}
      ariaLabel="Reading preferences"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        <div>
          <p className="text-eyebrow mb-1">View settings</p>
          <h2
            style={{
              color: 'var(--text-primary)',
              fontFamily: "'Lora', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '1.25rem',
              lineHeight: 1.2,
            }}
          >
            Reading preferences
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="p-1 -mr-1 rounded-md transition-colors hover-bg-themed"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Text size slider */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-eyebrow">Text size</span>
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {fontSize} px
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>A</span>
          <input
            type="range"
            min={12}
            max={30}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
            className="flex-1 h-1"
            style={{ accentColor: 'var(--accent-purple)' }}
            aria-label="Text size"
          />
          <span className="text-base" style={{ color: 'var(--text-secondary)' }}>A</span>
        </div>
      </div>

      <Divider />

      {/* Accessibility eyebrow + toggles */}
      <div className="px-5 py-3">
        <p className="text-eyebrow mb-3">Accessibility</p>
        <div className="space-y-3">
          <ToggleRow
            label="High contrast"
            description="Maximum text/background contrast"
            checked={highContrast}
            onChange={setHighContrast}
          />
          <ToggleRow
            label="Dyslexia-friendly font"
            description="Lexend, looser letter spacing"
            checked={dyslexiaFont}
            onChange={setDyslexiaFont}
          />
          <ToggleRow
            label="Reading pacer"
            description="Highlight one paragraph at a time"
            checked={readingGuide}
            onChange={setReadingGuide}
          />
        </div>
      </div>

      <Divider />

      {/* Menu size */}
      <div className="px-5 py-3">
        <p className="text-eyebrow mb-2">Menu size</p>
        <div
          role="radiogroup"
          aria-label="Menu text size"
          className="grid grid-cols-4 gap-px rounded-md overflow-hidden"
          style={{
            backgroundColor: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {CHROME_SIZE_OPTIONS.map((opt) => {
            const selected = chromeSize === opt.value
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={selected}
                aria-label={opt.aria}
                onClick={() => setChromeSize(opt.value)}
                className="py-1.5 text-xs font-semibold tabular-nums btn-transition"
                style={{
                  backgroundColor: selected ? 'var(--accent-purple)' : 'var(--bg-card)',
                  color: selected ? 'var(--text-inverse)' : 'var(--text-primary)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <Divider />

      {/* Focus mode */}
      <div className="px-5 py-3">
        <ToggleRow
          label="Focus mode"
          description="Hide all chrome while reading"
          checked={focusedMode}
          onChange={onFocusedModeChange}
        />
      </div>

      {/* Reset */}
      <div className="px-5 pb-4 pt-1 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          Reset to defaults
        </button>
      </div>
    </Popover>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 btn-transition text-left"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </div>
      </div>
      <div
        className="relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200"
        style={{
          backgroundColor: checked ? 'var(--accent-purple)' : 'var(--border-strong)',
        }}
      >
        <div
          className="absolute top-[2px] w-4 h-4 rounded-full transition-transform duration-200 shadow-sm"
          style={{
            backgroundColor: '#fff',
            transform: checked ? 'translateX(18px)' : 'translateX(2px)',
          }}
        />
      </div>
    </button>
  )
}
