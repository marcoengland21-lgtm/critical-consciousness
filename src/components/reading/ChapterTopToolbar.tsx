'use client'

/**
 * ChapterTopToolbar — chunk 3b piece 2a.
 *
 * The icon row + listen audio player at the top of /reading chapter
 * pages, per frames 02 and 02A. Replaces the floating "Workspace"
 * button at the bottom right.
 *
 * Three icons (left side):
 *   - Gear → opens SettingsPopover
 *   - Notebook → opens concepts & notes (in 2a, temporarily wired to
 *     the existing ReadingToolbar slide-over until 2c builds the
 *     ConceptsNotesModal that replaces it)
 *   - Sun/moon → toggles theme (frame 02A locked variant)
 *
 * All three use the same active-state visual language so contrast
 * holds in dark mode (this also fixes the moon-icon-invisible bug
 * Mars flagged after chunk 3a).
 *
 * The Listen audio player from frames 02/02A's right side is NOT
 * folded into this toolbar in 2a — the existing <AudioPlayer> renders
 * below, untouched. Folding it in would mean either re-implementing
 * playback / scrubbing inside the toolbar or rewiring AudioPlayer's
 * play state plumbing through this surface, both of which are out of
 * the 2a scope. Surface to Mars in a follow-up if listen-in-toolbar
 * matters before 2c.
 *
 * Hidden in focus mode.
 */

import { forwardRef, useRef, useState } from 'react'
import { useTheme } from '@/components/layout/ThemeProvider'
import SettingsPopover from './SettingsPopover'

interface ChapterTopToolbarProps {
  focusedMode: boolean
  onFocusedModeChange: (on: boolean) => void
  /** Temporary in 2a — wired to the existing ReadingToolbar slide-over.
      In 2c this opens ConceptsNotesModal instead. */
  onNotebookClick: () => void
  notebookActive: boolean
}

export default function ChapterTopToolbar({
  focusedMode,
  onFocusedModeChange,
  onNotebookClick,
  notebookActive,
}: ChapterTopToolbarProps) {
  const gearRef = useRef<HTMLButtonElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { isDark, toggle: toggleTheme } = useTheme()

  if (focusedMode) return null

  return (
    <div className="chrome-scoped flex items-center gap-1 mb-6">
      <ToolbarIconButton
        ref={gearRef}
        ariaLabel="Reading preferences"
        isActive={settingsOpen}
        onClick={() => setSettingsOpen((prev) => !prev)}
      >
        <GearIcon />
      </ToolbarIconButton>
      <ToolbarIconButton
        ariaLabel="Open concepts and notes"
        isActive={notebookActive}
        onClick={onNotebookClick}
      >
        <NotebookIcon />
      </ToolbarIconButton>
      <ToolbarIconButton
        ariaLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        isActive={false}
        onClick={toggleTheme}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </ToolbarIconButton>

      {/* Settings popover — anchored to gear */}
      <SettingsPopover
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        anchor={gearRef}
        focusedMode={focusedMode}
        onFocusedModeChange={onFocusedModeChange}
      />
    </div>
  )
}

// ── Icon button (shared visual language, fixes the dark-mode-moon
//    visibility bug from chunk 3a — uses --text-secondary / --accent-
//    purple which contrast in both modes). ────────────────────────────
const ToolbarIconButton = forwardRef<
  HTMLButtonElement,
  {
    ariaLabel: string
    isActive: boolean
    onClick: () => void
    children: React.ReactNode
  }
>(function ToolbarIconButton({ ariaLabel, isActive, onClick, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      className="w-9 h-9 flex items-center justify-center rounded-md transition-colors btn-transition"
      style={{
        color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
        backgroundColor: isActive ? 'var(--bg-soft)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
})

// ── Icons ──────────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function NotebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Open book / notebook glyph */}
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

