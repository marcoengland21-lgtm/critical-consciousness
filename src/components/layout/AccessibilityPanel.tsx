'use client'

import { useAccessibility, type ChromeSize } from './AccessibilityProvider'

interface AccessibilityPanelProps {
  /** Where to render: sidebar popover or mobile inline */
  variant: 'sidebar' | 'mobile'
}

const CHROME_SIZE_OPTIONS: { value: ChromeSize; label: string; aria: string }[] = [
  { value: 'small', label: 'S', aria: 'Small menu text' },
  { value: 'regular', label: 'M', aria: 'Regular menu text' },
  { value: 'large', label: 'L', aria: 'Large menu text' },
  { value: 'extra-large', label: 'XL', aria: 'Extra-large menu text' },
]

export default function AccessibilityPanel({ variant }: AccessibilityPanelProps) {
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

  const isMobile = variant === 'mobile'

  return (
    <div className={isMobile ? 'space-y-4 py-2' : 'space-y-3'}>
      {/* Section label */}
      <div
        className="text-[10px] font-semibold tracking-wider px-1"
        style={{ color: isMobile ? 'var(--text-secondary)' : 'var(--text-inverse)', opacity: isMobile ? 1 : 0.5 }}
      >
        Accessibility
      </div>

      {/* Font size slider */}
      <div className="space-y-1 px-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="a11y-font-size"
            className="text-xs font-medium"
            style={{ color: isMobile ? 'var(--text-primary)' : 'var(--text-inverse)' }}
          >
            Text Size
          </label>
          <span
            className="text-[10px] tabular-nums font-medium"
            style={{ color: isMobile ? 'var(--text-secondary)' : 'var(--text-inverse)', opacity: 0.7 }}
          >
            {fontSize}px
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFontSize(fontSize - 1)}
            disabled={fontSize <= 12}
            className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold btn-transition disabled:opacity-30"
            style={{
              color: isMobile ? 'var(--text-primary)' : 'var(--text-inverse)',
              backgroundColor: isMobile ? 'var(--bg-soft)' : 'rgba(255,255,255,0.1)',
            }}
            aria-label="Decrease font size"
          >
            A−
          </button>
          <input
            id="a11y-font-size"
            type="range"
            min={12}
            max={30}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
            className="flex-1 accent-purple-500 h-1"
            style={{ accentColor: 'var(--accent-purple)' }}
            aria-label="Font size"
          />
          <button
            onClick={() => setFontSize(fontSize + 1)}
            disabled={fontSize >= 30}
            className="w-7 h-7 flex items-center justify-center rounded-md text-sm font-bold btn-transition disabled:opacity-30"
            style={{
              color: isMobile ? 'var(--text-primary)' : 'var(--text-inverse)',
              backgroundColor: isMobile ? 'var(--bg-soft)' : 'rgba(255,255,255,0.1)',
            }}
            aria-label="Increase font size"
          >
            A+
          </button>
        </div>
      </div>

      {/* Toggle switches */}
      <div className="space-y-2 px-1">
        <ToggleRow
          label="High Contrast"
          description="Stronger borders, bolder text"
          checked={highContrast}
          onChange={setHighContrast}
          isMobile={isMobile}
        />
        <ToggleRow
          label="Dyslexia Font"
          description="Lexend font with extra spacing"
          checked={dyslexiaFont}
          onChange={setDyslexiaFont}
          isMobile={isMobile}
        />
        <ToggleRow
          label="Reading Pacer"
          description="Word-by-word guide through the text"
          checked={readingGuide}
          onChange={setReadingGuide}
          isMobile={isMobile}
        />
      </div>

      {/* Menu Size — chunk 3a. Independent from the body-text slider above:
          this scales chrome (panel headers, sidebar, status strip, dashboard
          chrome, modal headers, toolbar text). Body text stays where the
          slider put it. */}
      <div className="space-y-1 px-1">
        <div className="text-left">
          <div
            className="text-xs font-medium"
            style={{ color: isMobile ? 'var(--text-primary)' : 'var(--text-inverse)' }}
          >
            Menu Size
          </div>
          <div
            className="text-[10px]"
            style={{ color: isMobile ? 'var(--text-secondary)' : 'var(--text-inverse)', opacity: 0.5 }}
          >
            Adjust menu and interface text size separately from book text
          </div>
        </div>
        <div
          role="radiogroup"
          aria-label="Menu text size"
          className="grid grid-cols-4 gap-px rounded-md overflow-hidden mt-1.5"
          style={{
            backgroundColor: isMobile ? 'var(--border-default)' : 'rgba(255,255,255,0.1)',
            border: `1px solid ${isMobile ? 'var(--border-default)' : 'rgba(255,255,255,0.15)'}`,
          }}
        >
          {CHROME_SIZE_OPTIONS.map((opt) => {
            const selected = chromeSize === opt.value
            const selectedBg = isMobile ? 'var(--accent-purple)' : 'rgba(255,255,255,0.2)'
            const selectedColor = isMobile ? 'var(--text-inverse)' : 'var(--text-inverse)'
            const idleBg = isMobile ? 'var(--bg-soft)' : 'transparent'
            const idleColor = isMobile ? 'var(--text-primary)' : 'var(--text-inverse)'
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={selected}
                aria-label={opt.aria}
                onClick={() => setChromeSize(opt.value)}
                className="py-1.5 text-[11px] font-semibold tabular-nums btn-transition"
                style={{
                  backgroundColor: selected ? selectedBg : idleBg,
                  color: selected ? selectedColor : idleColor,
                  opacity: selected ? 1 : 0.7,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reset button */}
      <div className="px-1 pt-1">
        <button
          onClick={() => {
            setFontSize(16)
            setChromeSize('regular')
            setHighContrast(false)
            setDyslexiaFont(false)
            setReadingGuide(false)
            setReadingGuideWpm(200)
            setReadingGuidePlaying(false)
          }}
          className="w-full text-[11px] py-1.5 rounded-md btn-transition"
          style={{
            color: isMobile ? 'var(--text-secondary)' : 'var(--text-inverse)',
            opacity: 0.6,
            border: `1px solid ${isMobile ? 'var(--border-default)' : 'rgba(255,255,255,0.15)'}`,
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

/** Accessible toggle switch row */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  isMobile,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (on: boolean) => void
  isMobile: boolean
}) {
  const textColor = isMobile ? 'var(--text-primary)' : 'var(--text-inverse)'
  const descColor = isMobile ? 'var(--text-secondary)' : 'var(--text-inverse)'

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between py-1.5 rounded-md btn-transition"
    >
      <div className="text-left">
        <div className="text-xs font-medium" style={{ color: textColor }}>{label}</div>
        <div className="text-[10px]" style={{ color: descColor, opacity: 0.5 }}>{description}</div>
      </div>
      {/* Toggle track */}
      <div
        className="relative shrink-0 w-8 h-[18px] rounded-full transition-colors duration-200"
        style={{
          backgroundColor: checked
            ? 'var(--accent-purple)'
            : isMobile
              ? 'var(--border-strong)'
              : 'rgba(255,255,255,0.2)',
        }}
      >
        {/* Toggle thumb */}
        <div
          className="absolute top-[2px] w-[14px] h-[14px] rounded-full transition-transform duration-200 shadow-sm"
          style={{
            backgroundColor: '#fff',
            transform: checked ? 'translateX(16px)' : 'translateX(2px)',
          }}
        />
      </div>
    </button>
  )
}
