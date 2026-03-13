'use client'

interface Props {
  fontSize: number
  onFontSizeChange: (size: number) => void
  focusedMode: boolean
  onFocusedModeChange: (focused: boolean) => void
  annotationCount: number
}

const MIN_FONT = 14
const MAX_FONT = 24

export default function ReadingControls({
  fontSize,
  onFontSizeChange,
  focusedMode,
  onFocusedModeChange,
  annotationCount,
}: Props) {
  return (
    <div
      className="flex items-center justify-end gap-3 mb-4 pb-3 border-b"
      style={{ borderColor: '#e5e1d8' }}
    >
      {/* Font size controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFontSizeChange(Math.max(MIN_FONT, fontSize - 2))}
          disabled={fontSize <= MIN_FONT}
          className="w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
          style={{ color: 'var(--color-warm-gray)' }}
          title="Decrease font size"
          aria-label="Decrease font size"
        >
          A<span className="text-[10px]">-</span>
        </button>
        <span className="text-xs tabular-nums w-8 text-center" style={{ color: 'var(--color-warm-gray)' }}>
          {fontSize}
        </span>
        <button
          onClick={() => onFontSizeChange(Math.min(MAX_FONT, fontSize + 2))}
          disabled={fontSize >= MAX_FONT}
          className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors disabled:opacity-30 hover:bg-black/5"
          style={{ color: 'var(--color-warm-gray)' }}
          title="Increase font size"
          aria-label="Increase font size"
        >
          A<span className="text-xs">+</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-4" style={{ backgroundColor: '#e5e1d8' }} />

      {/* Focused mode toggle */}
      <button
        onClick={() => onFocusedModeChange(!focusedMode)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        style={{
          backgroundColor: focusedMode ? 'var(--color-dark-brown)' : 'transparent',
          color: focusedMode ? 'var(--color-warm-cream)' : 'var(--color-warm-gray)',
        }}
        title={focusedMode ? 'Show annotations' : 'Hide annotations for focused reading'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {focusedMode ? (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          )}
        </svg>
        {focusedMode ? 'Show notes' : 'Focus'}
        {!focusedMode && annotationCount > 0 && (
          <span
            className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]"
            style={{ backgroundColor: '#e8ddd0', color: 'var(--color-dark-brown)' }}
          >
            {annotationCount}
          </span>
        )}
      </button>
    </div>
  )
}
