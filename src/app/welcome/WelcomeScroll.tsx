'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Lock, Sprout, Pause, Play, Flag, BookOpen, Cloud } from 'lucide-react'
import { completeOnboarding } from './actions'

/**
 * WelcomeScroll v3 — surfaces, faithful to live, interaction model layered on.
 *
 * Brief 1 sub-batch 6 redesign (post-Cowork B audit + Mars's reactions).
 *
 * Frame:
 *   1. Opener            recognition only, no platform motion
 *   2. Reading surface   chapter view, interactive prompts + ambient confusion
 *   3. Group surface     thread view, interactive branching gesture
 *   4. Personal surface  journal editor, interactive Reference modal
 *   5. Dashboard         landing surface, fully ambient composition
 *   6. CTA               minimal, dashboard precedes it as the visual
 *
 * Source-of-truth: live components (audited in BRIEF_1_VERIFICATION.md /
 * scroll v2 audit). Mockups are visual-faithful — same components, same
 * typography, same spacing, same colors. CSS lifted/mirrored from live
 * rather than approximated.
 *
 * v1-kept items (Bucket 2 — Mars handling separate live catch-up):
 *   - Annotation card visual style on Reading surface
 *   - Lock-icon "Only you" pill on Personal surface
 *
 * Cuts from v2 (Bucket 1 + Bucket 3):
 *   - Confusion-as-agenda animated morph (doesn't exist on live)
 *   - Highlight-and-branch gesture (live branches via button-click)
 *   - "WE MEET WEEKLY" rhythm strip with meeting-day highlighted
 *     (live RhythmWidget shows TODAY highlighted)
 *   - Concept scaffolding panel on dashboard (doesn't exist as widget)
 *   - Journal-to-thread "the same move, made public" gesture parity
 *     (no live mechanism for journal → public)
 *
 * Coherence threads, post-cuts:
 *   - Gesture parity: gone
 *   - Irregular-rhythm motion: only on confusion-counter ambient.
 *     AttentionMagnitudeBars use the live transition-all (linear).
 *   - Held absences: survive (no like buttons on Group replies, no
 *     streak counters / notification badges / progress percentages on
 *     Dashboard)
 *   - Through-line: "this is the platform" — surfaces frame the scroll,
 *     the platform's actual gestures teach the moves
 *
 * Interaction model (Mars's Issue 2 reframe):
 *   - Real gestures get interactive prompts. User performs the gesture,
 *     the platform responds, the next prompt unlocks.
 *   - Platform-behaviour-not-user-gesture stays ambient (timer-driven
 *     background motion).
 *   - Invitation only — no auto-completion, no time-out. Prompts wait.
 *   - Ambient and interactive are independent layers. Confusion
 *     accumulation runs while the user is hovering the glossary; doesn't
 *     reset on interactive beat completion, doesn't gate progression.
 *
 * Reduced-motion:
 *   - All animations + scroll-snap disabled
 *   - Mockups in their final/visible state from first paint
 *   - Ambient loops don't run; confusion intensity stays at the highest
 *     class (confusion-high), bars at full target, popovers visible if
 *     the gesture had completed
 *
 * Chrome audit (Cowork C) applied uniformly across the scroll:
 *   - Lock for the Personal surface privacy pill (audit row 1)
 *   - Sprout for Branch buttons (rows 19, 20)
 *   - Pause/Play in audio player (Part One §5)
 *   - Flag in confusion popover and WhereStuckWidget (matches live SVG)
 *   - BookOpen in Reference toolbar button (rows 21/22 pattern, --accent-purple)
 *   - Cloud in autosave indicator (matches live JournalToolbar)
 *   - ✕ kept on modal close (conventional, audit §5)
 *
 * Pending external follow-on:
 *   - Audio may move into the roaming tools affordance once that
 *     component ships. The scroll mockup keeps the floating-pill
 *     treatment until then since that's what the live reading page
 *     still renders.
 */

interface Props {
  displayName: string | null
  groupName: string
  /** "Tuesdays" / "Wednesdays" / etc. or null when host hasn't set
   *  next_session_at. Used by the dashboard's orientation strip. */
  sessionDayPlural: string | null
}

export default function WelcomeScroll({
  displayName,
  groupName,
  sessionDayPlural,
}: Props) {
  const sectionRefs = useRef<HTMLElement[]>([])
  const [reduced, setReduced] = useState(false)

  // Per-surface visibility — drives the React-state-managed motion
  // (ambient counter, prompt cycles, etc).
  const [readingVisible, setReadingVisible] = useState(false)
  const [groupVisible, setGroupVisible] = useState(false)
  const [personalVisible, setPersonalVisible] = useState(false)
  const [dashboardVisible, setDashboardVisible] = useState(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(m.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    m.addEventListener('change', handler)
    return () => m.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reduced) {
      sectionRefs.current.forEach(s => s?.setAttribute('data-visible', 'true'))
      setReadingVisible(true)
      setGroupVisible(true)
      setPersonalVisible(true)
      setDashboardVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true')
            const surface = entry.target.getAttribute('data-surface')
            if (surface === 'reading') setReadingVisible(true)
            if (surface === 'group') setGroupVisible(true)
            if (surface === 'personal') setPersonalVisible(true)
            if (surface === 'dashboard') setDashboardVisible(true)
          }
        }
      },
      { threshold: 0.25 }
    )

    sectionRefs.current.forEach(s => s && observer.observe(s))
    return () => observer.disconnect()
  }, [reduced])

  const setRef = (i: number) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current[i] = el
  }

  const heroName = displayName ?? 'reader'

  return (
    <main
      className="welcome-scroll"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <ScrollStyles />

      {/* ── 1. OPENER ─────────────────────────────────────────── */}
      <section
        ref={setRef(0)}
        className="welcome-section"
        aria-label="Welcome"
      >
        <div className="welcome-platform-tag">
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center w-7 h-7 rounded text-sm font-bold"
            style={{
              backgroundColor: 'var(--bg-nav)',
              color: 'var(--text-inverse)',
              fontFamily: "'Lora', Georgia, serif",
            }}
          >
            C
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            Capital Study Group
          </span>
        </div>

        <div className="opener-stagger text-center max-w-2xl">
          <div
            aria-hidden="true"
            className="inline-flex items-center justify-center mb-8 rounded text-2xl font-bold"
            style={{
              width: '4rem',
              height: '4rem',
              backgroundColor: 'var(--bg-nav)',
              color: 'var(--text-inverse)',
              fontFamily: "'Lora', Georgia, serif",
            }}
          >
            W
          </div>
          <p className="text-eyebrow mb-3">You&rsquo;re in</p>
          <h1
            className="text-display-lg mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Welcome to
            <span className="block">{groupName}, {heroName}.</span>
          </h1>
          <p
            className="text-base sm:text-lg max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            A small group reading Marx&rsquo;s Capital, Volume I together.
            <span className="block">Slowly, carefully.</span>
          </p>
        </div>
      </section>

      {/* ── 2. READING SURFACE ────────────────────────────────── */}
      <ReadingSurface
        sectionRef={setRef(1)}
        active={readingVisible}
        reduced={reduced}
      />

      {/* ── 3. GROUP SURFACE ──────────────────────────────────── */}
      <GroupSurface
        sectionRef={setRef(2)}
        active={groupVisible}
        reduced={reduced}
      />

      {/* ── 4. PERSONAL SURFACE ───────────────────────────────── */}
      <PersonalSurface
        sectionRef={setRef(3)}
        active={personalVisible}
        reduced={reduced}
      />

      {/* ── 5. DASHBOARD SURFACE ──────────────────────────────── */}
      <DashboardSurface
        sectionRef={setRef(4)}
        active={dashboardVisible}
        reduced={reduced}
        sessionDayPlural={sessionDayPlural}
        groupName={groupName}
        heroName={heroName}
      />

      {/* ── 6. CTA ────────────────────────────────────────────── */}
      <section
        ref={setRef(5)}
        className="welcome-section"
        aria-label="Ready"
      >
        <p className="welcome-section-marker text-eyebrow">06 / Ready</p>

        <div className="welcome-visual text-center max-w-xl">
          <div
            aria-hidden="true"
            className="inline-flex items-center justify-center mb-8 rounded text-2xl font-bold"
            style={{
              width: '4rem',
              height: '4rem',
              backgroundColor: 'var(--bg-nav)',
              color: 'var(--text-inverse)',
              fontFamily: "'Lora', Georgia, serif",
            }}
          >
            W
          </div>
          <p className="text-eyebrow mb-3">You&rsquo;re ready</p>
          <h2
            className="text-display-lg mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Read at your pace.
            <span className="block">Bring what you&rsquo;ve got to the next session.</span>
          </h2>

          <form action={completeOnboarding}>
            <button
              type="submit"
              className="btn-primary inline-flex items-center justify-center px-8 py-3 text-base"
            >
              Take me to the dashboard &rarr;
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Inline styles. Single-consumer animation styles co-located with
 * the consumer (per Brief 1 sub-batch 2 architectural note — globals
 * addition would be speculative since no other scroll surface exists).
 * ───────────────────────────────────────────────────────────────── */
function ScrollStyles() {
  return (
    <style>{`
      .welcome-scroll {
        overflow-y: auto;
        height: 100vh;
        /* Free scroll throughout — no snap. Panel-level entry animations
           are the layer that gives "you've arrived" feel without
           fighting "user owns the scroll" (per Cowork B sub-batch 6 v4
           reframe — scroll mechanics drop snap, scroll-driven animation
           replaces it). */
      }
      .welcome-section {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 1.5rem;
        position: relative;
        opacity: 0;
        transition: opacity 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .welcome-section[data-visible="true"] { opacity: 1; }
      /* Multi-panel teaching surfaces (Reading, Group, Personal, Dashboard)
         get extra vertical real estate to fit their composition. */
      .welcome-section.is-multipanel {
        min-height: auto;
        padding: 6rem 1.5rem;
        justify-content: flex-start;
        align-items: stretch;
      }

      .welcome-visual {
        transform: scale(0.96);
        transition: transform 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        width: 100%;
      }
      .welcome-section[data-visible="true"] .welcome-visual { transform: scale(1); }

      .welcome-section-marker {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
      }
      .welcome-platform-tag {
        position: absolute;
        top: 1.5rem;
        left: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      /* Opener stagger */
      .opener-stagger > * {
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 500ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)),
                    transform 500ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .welcome-section[data-visible="true"] .opener-stagger > *:nth-child(1) { opacity: 1; transform: translateY(0); transition-delay: 0ms; }
      .welcome-section[data-visible="true"] .opener-stagger > *:nth-child(2) { opacity: 1; transform: translateY(0); transition-delay: 150ms; }
      .welcome-section[data-visible="true"] .opener-stagger > *:nth-child(3) { opacity: 1; transform: translateY(0); transition-delay: 300ms; }
      .welcome-section[data-visible="true"] .opener-stagger > *:nth-child(4) { opacity: 1; transform: translateY(0); transition-delay: 450ms; }

      /* Mockup container — generic shell shared across surfaces */
      .welcome-mockup {
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.5rem;
        margin: 1.5rem auto 0;
        box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        position: relative;
      }
      .mockup-example-tag {
        position: absolute;
        top: -0.6rem;
        right: 1rem;
        background-color: var(--bg-page);
        padding: 0 0.5rem;
        font-size: 0.5625rem;
      }

      /* Beat / prompt label cycler */
      .beat-label {
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 500;
        margin-top: 1.25rem;
        text-align: center;
        min-height: 1.5em;
        transition: opacity 400ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .beat-label.prompt {
        color: var(--text-primary);
      }
      .beat-label.prompt::before {
        content: '→ ';
        opacity: 0.6;
      }

      /* ── READING SURFACE ──────────────────────────────────── */
      .reading-mockup {
        max-width: 36rem;
        padding: 1.5rem 1.25rem 1.25rem;
      }
      .reading-breadcrumb {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .reading-breadcrumb a { color: var(--accent-red); }
      .reading-chrome-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .reading-chrome-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }
      .reading-chapter-title {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 1.5rem;
        color: var(--accent-red);
        margin: 0 0 0.5rem 0;
        line-height: 1.2;
      }
      .reading-chapter-subtitle {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        color: var(--text-secondary);
        font-size: 0.9375rem;
        margin-bottom: 0.75rem;
      }
      .reading-chrome-rule {
        width: 4rem;
        height: 2px;
        background-color: var(--accent-purple);
        margin: 0 auto;
      }
      .reading-body {
        position: relative;
      }
      .reading-body p {
        font-family: 'Lora', Georgia, serif;
        font-size: 1rem;  /* slightly under live's 1.125rem to fit mockup width */
        line-height: 1.75;
        color: var(--text-primary);
        margin: 0 0 1rem 0;
      }
      .reading-paragraph {
        position: relative;
      }

      /* Glossary inline term — matches live GlossaryInlineTerm dotted-underline */
      .glossary-term {
        position: relative;
        cursor: pointer;
        background-image: linear-gradient(to right, var(--accent-purple), var(--accent-purple));
        background-size: 100% 1.5px;
        background-repeat: no-repeat;
        background-position: 0 100%;
        background-image: repeating-linear-gradient(to right,
          var(--accent-purple) 0,
          var(--accent-purple) 2px,
          transparent 2px,
          transparent 4px);
        padding-bottom: 1px;
      }

      /* Glossary popover — matches live GlossaryPopover (420px wide).
         Position absolute next to the term. */
      .glossary-popover {
        position: absolute;
        top: 1.5em;
        left: 0;
        width: 100%;
        max-width: 24rem;
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.375rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        padding: 1rem 1.25rem;
        z-index: 5;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 200ms, transform 200ms;
        pointer-events: none;
      }
      .glossary-popover[data-open="true"] {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .glossary-popover-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.375rem;
      }
      .glossary-popover-term {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1.25rem;
        line-height: 1.2;
        margin-bottom: 0.5rem;
      }
      .glossary-popover-def {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
      }
      .glossary-popover-related-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.375rem;
      }
      .glossary-popover-related {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        color: var(--accent-purple);
        margin-bottom: 0.75rem;
      }
      .glossary-popover-related span {
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
      }
      .glossary-popover-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding-top: 0.625rem;
        border-top: 1px solid var(--border-subtle);
      }
      .glossary-popover-footer .open-full {
        font-weight: 500;
        color: var(--accent-red);
      }

      /* Confusion flag indicator — matches live ConfusionFlagButton.
         Small "?" circle, intensity-coloured. Count is hidden on the
         button itself; revealed in popover on click. */
      .confusion-flag-button {
        position: absolute;
        top: 0;
        right: -1.75rem;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 50%;
        font-size: 0.625rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 200ms, background-color 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        border: none;
      }
      .reading-paragraph:hover .confusion-flag-button { opacity: 1; }
      /* Intensity classes match globals.css */
      .confusion-flag-button[data-intensity="0"] {
        background-color: var(--bg-card-alt, #f5f0e8);
        color: var(--text-secondary);
      }
      .confusion-flag-button[data-intensity="low"] {
        background-color: #d4c9a8;
        color: var(--text-primary);
      }
      .confusion-flag-button[data-intensity="mid"] {
        background-color: #c9a86b;
        color: var(--text-primary);
      }
      .confusion-flag-button[data-intensity="high"] {
        background-color: #b8863f;
        color: var(--text-primary);
      }

      /* Confusion popover — matches live ConfusionPopover (340px). */
      .confusion-popover {
        position: absolute;
        right: -2rem;
        top: 2rem;
        width: 18rem;
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.5rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        padding: 1rem 1.25rem;
        z-index: 6;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 200ms, transform 200ms;
        pointer-events: none;
      }
      .confusion-popover[data-open="true"] {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .confusion-popover-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-amber);
        margin-bottom: 0.5rem;
      }
      .confusion-popover-headline {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1rem;
        line-height: 1.3;
        margin-bottom: 0.5rem;
      }
      .confusion-popover-explainer {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        line-height: 1.5;
        color: var(--text-secondary);
        margin-bottom: 0.75rem;
      }
      .confusion-popover-action {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: var(--bg-card-alt, #f5f0e8);
        border: 1px solid var(--border-subtle);
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }
      .confusion-popover-action .anonymous-tag {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }
      .confusion-popover-cta {
        width: 100%;
        background-color: var(--accent-red);
        color: var(--text-inverse);
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        font-weight: 500;
        text-align: center;
        border: none;
      }

      /* Selection action bar — matches live SelectionActionBar.
         Two buttons: Annotate · Give this its own space */
      .selection-action-bar {
        position: absolute;
        background-color: var(--bg-nav);
        color: var(--text-inverse);
        border-radius: 0.375rem;
        padding: 0.25rem;
        display: flex;
        gap: 0.125rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        z-index: 7;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 180ms, transform 180ms;
        pointer-events: none;
      }
      .selection-action-bar[data-open="true"] {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .selection-action-bar button {
        background: transparent;
        color: var(--text-inverse);
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.375rem 0.75rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
        white-space: nowrap;
      }
      .selection-action-bar button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      /* Marginalia annotation card — v1 visual style (Bucket 2 exception) */
      .marginalia-card {
        position: absolute;
        right: -9rem;
        top: 0;
        width: 8.25rem;
        background-color: rgba(var(--accent-purple-rgb), 0.06);
        border-left: 2px solid var(--accent-purple);
        padding: 0.5rem 0.625rem;
        border-radius: 0 0.25rem 0.25rem 0;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        line-height: 1.4;
        opacity: 0;
        transform: translateX(-4px);
        transition: opacity 300ms, transform 300ms;
      }
      .marginalia-card[data-shown="true"] {
        opacity: 1;
        transform: translateX(0);
      }
      .marginalia-name {
        color: var(--accent-purple);
        font-weight: 600;
        font-size: 0.6875rem;
        margin-bottom: 0.125rem;
      }
      .marginalia-body { color: var(--text-primary); }

      /* Audio player — matches live AudioPlayer. Floating pill at the
         bottom of the mockup. Use position absolute within the mockup
         rather than fixed-position. */
      .reading-audio-player {
        position: absolute;
        bottom: -1.75rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-default, #e7e2d5);
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
      }
      .audio-skip {
        color: var(--text-secondary);
        background-color: var(--bg-soft, #f5f0e8);
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
        font-size: 0.625rem;
        font-weight: 500;
      }
      .audio-play-btn {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.6875rem;
        cursor: pointer;
        border: none;
        transition: background-color 200ms;
      }
      .audio-play-btn[data-playing="true"] {
        background-color: var(--accent-purple);
        color: var(--text-inverse);
      }
      .audio-track {
        width: 6rem;
        height: 4px;
        background-color: var(--bg-soft, #f5f0e8);
        border-radius: 9999px;
        overflow: hidden;
      }
      .audio-fill {
        height: 100%;
        width: 0;
        background-color: var(--accent-purple);
        transition: width 100ms linear;
      }
      .audio-time {
        color: var(--text-primary);
        font-weight: 600;
        font-size: 0.625rem;
      }

      /* ── GROUP SURFACE ────────────────────────────────────── */
      .group-mockup {
        max-width: 36rem;
        padding: 1.5rem 1.25rem;
      }
      .group-back-link {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
      }
      .group-badges {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }
      .thread-type-badge {
        display: inline-flex;
        align-items: center;
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 500;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        line-height: 1;
        background-color: var(--badge-bg-discussion, rgba(var(--accent-purple-rgb), 0.12));
        color: var(--accent-purple);
      }
      .thread-week-pill {
        display: inline-flex;
        align-items: center;
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 500;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-secondary);
      }
      .group-title {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 1.5rem;
        color: var(--accent-red);
        line-height: 1.2;
        margin-bottom: 0.875rem;
      }
      .group-author-row {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        margin-bottom: 1rem;
      }
      .author-avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        color: white;
        font-size: 0.75rem;
        flex-shrink: 0;
      }
      .author-name {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--text-primary);
        line-height: 1.2;
      }
      .author-time {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        color: var(--text-secondary);
      }
      .group-body {
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        line-height: 1.6;
        color: var(--text-primary);
        margin-bottom: 1rem;
      }
      .group-action-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-top: 0.875rem;
        border-top: 1px solid var(--border-default, #e7e2d5);
        margin-bottom: 1rem;
      }
      .branch-button {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 500;
        padding: 0.375rem 0.75rem;
        border-radius: 0.25rem;
        border: 1px solid var(--border-default, #e7e2d5);
        color: var(--text-secondary);
        background-color: transparent;
        cursor: pointer;
      }
      .branch-button:hover {
        background-color: var(--bg-soft, #f5f0e8);
      }
      .group-replies-divider {
        border: none;
        border-top: 1px solid var(--border-default, #e7e2d5);
        margin-bottom: 0.875rem;
      }
      .group-reply {
        display: flex;
        gap: 0.625rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border-subtle);
        position: relative;
      }
      .group-reply:last-child { border-bottom: none; }
      .group-reply-content {
        flex: 1;
        min-width: 0;
      }
      .group-reply-meta {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
      }
      .group-reply-body {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--text-primary);
      }
      .group-reply-actions {
        margin-top: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      /* Branch form — appears inline below a reply */
      .branch-form {
        margin-top: 0.875rem;
        padding: 0.875rem;
        background-color: var(--bg-soft, #f5f0e8);
        border-radius: 0.375rem;
        border: 1px solid var(--border-subtle);
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: opacity 300ms, max-height 300ms;
      }
      .branch-form[data-open="true"] {
        opacity: 1;
        max-height: 30rem;
      }
      .branch-form-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.5rem;
      }
      .branch-form-title {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 1rem;
        color: var(--accent-red);
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        padding: 0.5rem 0.625rem;
        border-radius: 0.25rem;
        margin-bottom: 0.5rem;
      }
      .branch-form-quoted {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        color: var(--text-secondary);
        font-size: 0.8125rem;
        line-height: 1.5;
        padding: 0.375rem 0.625rem;
        border-left: 2px solid var(--accent-purple);
        background-color: rgba(var(--accent-purple-rgb), 0.04);
        margin-bottom: 0.625rem;
      }
      .branch-form-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      .branch-form-submit {
        background-color: var(--accent-red);
        color: var(--text-inverse);
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.375rem 0.875rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
      }
      .branch-form-cancel {
        background-color: transparent;
        color: var(--text-secondary);
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        padding: 0.375rem 0.625rem;
        border: none;
        cursor: pointer;
      }

      /* Child thread card — appears after branch submitted */
      .child-thread-result {
        margin-top: 0.625rem;
        padding: 0.625rem 0.75rem;
        background-color: rgba(var(--accent-purple-rgb), 0.06);
        border-left: 3px solid var(--accent-purple);
        border-radius: 0 0.25rem 0.25rem 0;
        font-family: 'Inter', sans-serif;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 300ms, transform 300ms;
      }
      .child-thread-result[data-shown="true"] {
        opacity: 1;
        transform: translateY(0);
      }
      .child-thread-lineage {
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.25rem;
      }
      .child-thread-title {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 0.9375rem;
        color: var(--accent-red);
      }

      /* ── PERSONAL SURFACE ─────────────────────────────────── */
      .personal-mockup {
        max-width: 32rem;
        padding: 1.25rem;
      }
      .personal-back-link {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 0.875rem;
      }
      .personal-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.875rem;
      }
      .personal-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }
      /* Lock pill — v1 Bucket 2 styling, status-indicator framing
         per Mars's P1 lock. Top-right placement. */
      .personal-lock-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background-color: rgba(var(--accent-purple-rgb), 0.08);
        color: var(--accent-purple);
        font-family: 'Inter', sans-serif;
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
      }
      .personal-title-input {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1.25rem;
        line-height: 1.3;
        padding: 0.375rem 0;
        border-bottom: 1px solid var(--border-subtle);
        min-height: 1.875rem;
        margin-bottom: 0.625rem;
      }
      .personal-toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.625rem;
        background-color: var(--bg-soft, #f5f0e8);
        border-radius: 0.25rem;
        margin-bottom: 0.625rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
      }
      .toolbar-btn {
        background: transparent;
        color: var(--text-primary);
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
      }
      .toolbar-btn:hover {
        background-color: var(--bg-card, #ffffff);
      }
      .toolbar-divider {
        width: 1px;
        height: 1rem;
        background-color: var(--border-subtle);
      }
      .toolbar-spacer { flex: 1; }
      .toolbar-save {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        color: var(--accent-green);
        font-size: 0.6875rem;
        opacity: 0.85;
      }
      .toolbar-wordcount {
        color: var(--text-secondary);
        font-size: 0.6875rem;
      }
      .personal-body {
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        line-height: 1.65;
        color: var(--text-primary);
        min-height: 5rem;
        padding: 0.5rem 0;
      }
      .personal-body-text {
        opacity: 0;
        transition: opacity 1200ms;
      }
      .personal-body-text[data-shown="true"] { opacity: 1; }

      /* Reference modal — matches live ReferenceModal */
      .reference-modal-backdrop {
        position: absolute;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 1rem;
        opacity: 0;
        pointer-events: none;
        transition: opacity 200ms;
        z-index: 8;
        border-radius: 0.5rem;
      }
      .reference-modal-backdrop[data-open="true"] {
        opacity: 1;
        pointer-events: auto;
      }
      .reference-modal {
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-default, #e7e2d5);
        border-radius: 0.5rem;
        box-shadow: 0 16px 48px rgba(0,0,0,0.24);
        width: 100%;
        max-width: 26rem;
        margin-top: 2rem;
        display: flex;
        flex-direction: column;
        max-height: 80%;
        overflow: hidden;
        transform: scale(0.96);
        transition: transform 200ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .reference-modal-backdrop[data-open="true"] .reference-modal {
        transform: scale(1);
      }
      .reference-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.625rem 1rem;
        border-bottom: 1px solid var(--border-default, #e7e2d5);
      }
      .reference-modal-title {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 400;
        font-size: 1rem;
        color: var(--text-primary);
      }
      .reference-modal-body {
        padding: 0.875rem 1rem;
        overflow-y: auto;
      }
      .reference-modal-search {
        width: 100%;
        padding: 0.5rem 0.75rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        background-color: var(--bg-soft, #f5f0e8);
        border: 1px solid var(--border-subtle);
        border-radius: 0.25rem;
        margin-bottom: 0.75rem;
        color: var(--text-primary);
      }
      .reference-result {
        padding: 0.625rem 0.75rem;
        border: 1px solid var(--border-subtle);
        border-radius: 0.375rem;
        margin-bottom: 0.5rem;
        cursor: pointer;
      }
      .reference-result[data-expanded="true"] {
        background-color: var(--bg-card-alt, #f5f0e8);
        border-color: var(--accent-purple);
      }
      .reference-result-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
      }
      .reference-result-text {
        font-family: 'Lora', Georgia, serif;
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--text-primary);
      }
      .reference-result[data-expanded="false"] .reference-result-text {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .reference-highlight {
        background-color: rgba(var(--accent-amber-rgb), 0.35);
      }
      .reference-result-actions {
        display: none;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-top: 0.625rem;
      }
      .reference-result[data-expanded="true"] .reference-result-actions {
        display: flex;
      }
      .reference-action-secondary {
        background-color: transparent;
        border: 1px solid var(--border-default, #e7e2d5);
        color: var(--text-secondary);
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        padding: 0.25rem 0.625rem;
        border-radius: 0.25rem;
        cursor: pointer;
      }
      .reference-action-primary {
        background-color: var(--accent-red);
        color: var(--text-inverse);
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 500;
        padding: 0.25rem 0.625rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
      }
      .reference-quote-inserted {
        margin-top: 0.625rem;
        padding: 0.625rem 0.75rem;
        background-color: rgba(var(--accent-purple-rgb), 0.06);
        border-left: 2px solid var(--accent-purple);
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--text-primary);
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 300ms, transform 300ms;
      }
      .reference-quote-inserted[data-shown="true"] {
        opacity: 1;
        transform: translateY(0);
      }
      .reference-cite {
        font-style: normal;
        font-size: 0.6875rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
      }

      /* ── DASHBOARD SURFACE ────────────────────────────────── */
      .dashboard-mockup {
        max-width: 44rem;
        padding: 1.5rem 1.25rem;
      }
      .dashboard-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)),
                    transform 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      [data-ds-active="true"] .dashboard-header {
        opacity: 1;
        transform: translateY(0);
      }
      .dashboard-greeting {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1.5rem;
        line-height: 1.2;
      }
      .dashboard-group-name {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-top: 0.375rem;
      }
      .dashboard-orientation {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        line-height: 1.55;
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        opacity: 0;
        transition: opacity 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) 200ms;
      }
      [data-ds-active="true"] .dashboard-orientation { opacity: 1; }

      /* HeroQuoteCallout — matches live */
      .hero-quote-section {
        margin-bottom: 1.5rem;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) 400ms,
                    transform 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) 400ms;
      }
      [data-ds-active="true"] .hero-quote-section {
        opacity: 1;
        transform: translateY(0);
      }
      .hero-quote-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-amber);
        margin-bottom: 0.625rem;
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }
      .hero-quote-dot {
        width: 0.375rem;
        height: 0.375rem;
        border-radius: 50%;
        background-color: var(--accent-amber);
      }
      .hero-quote-this-week {
        color: var(--text-secondary);
        opacity: 0.7;
        font-weight: 400;
      }
      .hero-quote {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 400;
        color: var(--text-primary);
        font-size: 1.125rem;
        line-height: 1.4;
        letter-spacing: -0.005em;
        margin-bottom: 0.75rem;
      }
      .hero-quote-actions {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        flex-wrap: wrap;
      }
      .hero-quote-cta {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background-color: var(--accent-amber);
        color: #1a1625;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
      }
      .hero-quote-meta {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        color: var(--text-secondary);
      }

      /* AttentionMagnitudeBars — matches live */
      .attention-section {
        margin-bottom: 1.5rem;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) 700ms,
                    transform 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) 700ms;
      }
      [data-ds-active="true"] .attention-section {
        opacity: 1;
        transform: translateY(0);
      }
      .attention-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.625rem;
        margin-bottom: 0.375rem;
        flex-wrap: wrap;
      }
      .attention-h2 {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1.125rem;
        line-height: 1.2;
        margin: 0;
      }
      .attention-link {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 500;
        color: var(--accent-red);
      }
      .attention-subtitle {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 0.875rem;
      }
      .attention-list {
        list-style: none;
        margin: 0;
        padding: 0;
        border-top: 1px solid var(--border-subtle);
      }
      .attention-row {
        padding: 0.625rem 0.5rem;
        border-bottom: 1px solid var(--border-subtle);
      }
      .attention-row-top {
        display: flex;
        align-items: baseline;
        gap: 0.625rem;
        margin-bottom: 0.375rem;
        flex-wrap: wrap;
      }
      .attention-count {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        font-size: 1.5rem;
        color: var(--text-primary);
        line-height: 1;
        flex-shrink: 0;
        min-width: 2ch;
        text-align: right;
      }
      .attention-count[data-zero="true"] {
        color: var(--text-secondary);
      }
      .attention-section-label {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        flex-shrink: 0;
      }
      .attention-title {
        font-size: 0.8125rem;
        color: var(--text-primary);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .attention-today-tag {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        background-color: rgba(var(--accent-amber-rgb), 0.15);
        color: var(--accent-amber);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        flex-shrink: 0;
      }
      .attention-yours {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        color: var(--text-secondary);
        flex-shrink: 0;
      }
      .attention-bar-track {
        height: 4px;
        border-radius: 9999px;
        background-color: var(--bg-soft, #f5f0e8);
        overflow: hidden;
      }
      .attention-bar {
        height: 100%;
        background-color: var(--accent-purple);
        border-radius: inherit;
        width: 0;
        transition: width 800ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      [data-ds-active="true"] .attention-bar {
        width: var(--bar-target, 0%);
      }

      /* WhereStuckWidget — matches live */
      .stuck-section {
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) 1100ms,
                    transform 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) 1100ms;
      }
      [data-ds-active="true"] .stuck-section {
        opacity: 1;
        transform: translateY(0);
      }
      .stuck-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }
      .stuck-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.625rem;
      }
      .stuck-count-line {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        line-height: 1.45;
      }
      .stuck-link {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 500;
        color: var(--accent-red);
      }
      .stuck-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .stuck-item {
        padding: 0.5rem 0;
      }
      .stuck-item-top {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.125rem;
      }
      .stuck-ref {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }
      .stuck-flag-count {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        font-weight: 600;
        color: var(--accent-amber);
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      .stuck-excerpt {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        color: var(--text-secondary);
        font-size: 0.75rem;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* ── Group thread composition ────────────────────────── */
      .group-thread-grid {
        max-width: 72rem;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      @media (min-width: 1280px) {
        .group-thread-grid {
          grid-template-columns: minmax(0, 1fr) 18rem;
          gap: 2rem;
          align-items: start;
        }
      }
      .group-thread {
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.625rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        padding: 1.75rem 1.75rem 0;
        position: relative;
        opacity: 0;
        transform: translateY(16px);
        transition:
          opacity 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)),
          transform 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .group-thread[data-visible="true"] {
        opacity: 1;
        transform: translateY(0);
      }
      .group-back-link {
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
        display: inline-block;
        cursor: pointer;
        transition: opacity 200ms;
      }
      .group-back-link:hover { opacity: 0.7; }

      .branched-from-breadcrumb {
        margin-bottom: 1.5rem;
        padding: 0.75rem 1rem;
        background-color: rgba(var(--accent-purple-rgb), 0.06);
        border-left: 3px solid var(--accent-purple);
        border-radius: 0 0.5rem 0.5rem 0;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .branched-from-breadcrumb:hover {
        background-color: rgba(var(--accent-purple-rgb), 0.1);
      }
      .branched-from-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.25rem;
      }
      .branched-from-title {
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary);
      }
      .branched-from-excerpt {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.375rem;
      }
      .branched-from-excerpt em {
        color: var(--text-secondary);
        font-style: italic;
      }

      .group-badges-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }
      .group-type-pill {
        display: inline-flex;
        align-items: center;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        line-height: 1;
        background-color: var(--badge-bg-discussion, rgba(var(--accent-purple-rgb), 0.12));
        color: var(--accent-purple);
        cursor: pointer;
        transition: filter 200ms;
      }
      .group-type-pill:hover { filter: brightness(0.92); }
      .group-week-pill {
        display: inline-flex;
        align-items: center;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-secondary);
        cursor: pointer;
        transition: background-color 200ms;
      }
      .group-week-pill:hover { background-color: var(--border-subtle); }

      .group-thread-title {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 1.875rem;
        color: var(--accent-red);
        line-height: 1.2;
        margin: 0 0 1.25rem;
      }

      .group-author-row {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        margin-bottom: 1.5rem;
      }
      .group-author-avatar {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        color: white;
        font-size: 0.875rem;
        flex-shrink: 0;
      }
      .group-author-name {
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-primary);
        line-height: 1.2;
      }
      .group-author-time {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        line-height: 1.2;
      }

      .group-thread-body {
        font-family: 'Lora', Georgia, serif;
        font-size: 1.0625rem;
        line-height: 1.7;
        color: var(--text-primary);
        margin-bottom: 1.5rem;
      }

      .group-op-action-row {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-default, #e7e2d5);
        margin-bottom: 1.5rem;
      }

      .group-branch-button {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.4rem 0.75rem;
        border-radius: 0.375rem;
        border: 1px solid var(--border-default, #e7e2d5);
        color: var(--text-secondary);
        background-color: transparent;
        cursor: pointer;
        transition: background-color 200ms, color 200ms;
      }
      .group-branch-button:hover {
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-primary);
      }

      .group-replies-divider {
        border: none;
        border-top: 1px solid var(--border-default, #e7e2d5);
        margin: 0 -1.75rem 1.25rem;
      }

      .group-reply-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .group-reply {
        position: relative;
        padding: 0.75rem 0.875rem;
        border-radius: 0.5rem;
        cursor: default;
        transition: background-color 200ms;
      }
      .group-reply:hover {
        background-color: var(--bg-soft, #f5f0e8);
      }
      .group-reply-row {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
      }
      .group-reply-avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        color: white;
        font-size: 0.8125rem;
        flex-shrink: 0;
      }
      .group-reply-content {
        flex: 1;
        min-width: 0;
      }
      .group-reply-meta {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
      }
      .group-reply-meta .group-author-name { font-size: 0.8125rem; }
      .group-reply-meta .group-author-time { font-size: 0.6875rem; }
      .group-reply-body {
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        line-height: 1.6;
        color: var(--text-primary);
      }

      /* Hover-revealed actions row — matches live opacity-0 → group-hover:opacity-100 */
      .group-reply-actions {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        margin-top: 0.5rem;
        opacity: 0;
        transition: opacity 200ms;
      }
      .group-reply:hover .group-reply-actions,
      .group-reply.is-active .group-reply-actions {
        opacity: 1;
      }
      @media (hover: none) {
        .group-reply-actions { opacity: 0.65; }
      }
      .group-reply-action {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary);
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        transition: color 200ms;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      .group-reply-action:hover { color: var(--text-primary); }

      /* Inline Reply form below a reply */
      .reply-form-inline {
        margin-top: 0.625rem;
        padding: 0.75rem 0;
      }
      .replying-to-tag {
        display: inline-block;
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        background-color: var(--bg-badge, rgba(var(--accent-purple-rgb), 0.08));
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }
      .reply-form-textarea {
        width: 100%;
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        line-height: 1.5;
        padding: 0.5rem 0.75rem;
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.375rem;
        color: var(--text-primary);
        resize: none;
        min-height: 3rem;
        transition: border-color 200ms;
      }
      .reply-form-textarea:focus {
        outline: none;
        border-color: var(--accent-purple);
      }
      .reply-form-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .reply-form-post {
        background-color: var(--accent-red);
        color: var(--text-inverse);
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.375rem 0.75rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .reply-form-post:hover { background-color: var(--accent-red-hover); }
      .reply-form-cancel {
        background-color: transparent;
        color: var(--text-secondary);
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        padding: 0.375rem 0.625rem;
        border: none;
        cursor: pointer;
        transition: color 200ms;
      }
      .reply-form-cancel:hover { color: var(--text-primary); }

      /* Inline Branch form below a reply (matches live BranchThreadForm) */
      .branch-form-inline {
        margin-top: 0.625rem;
        padding: 0.875rem;
        background-color: var(--bg-soft, #f5f0e8);
        border-radius: 0.5rem;
        border: 1px solid var(--border-subtle);
      }
      .branch-form-eyebrow-new {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.5rem;
      }
      .branch-form-title-new {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 1.0625rem;
        color: var(--accent-red);
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        padding: 0.5rem 0.625rem;
        border-radius: 0.25rem;
        margin-bottom: 0.625rem;
        line-height: 1.3;
      }
      .branch-form-quoted-new {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        color: var(--text-secondary);
        font-size: 0.8125rem;
        line-height: 1.55;
        padding: 0.5rem 0.75rem;
        border-left: 2px solid var(--accent-purple);
        background-color: rgba(var(--accent-purple-rgb), 0.04);
        margin-bottom: 0.75rem;
        border-radius: 0 0.25rem 0.25rem 0;
      }
      .branch-form-attribution {
        font-style: normal;
        color: var(--text-secondary);
        font-size: 0.6875rem;
        margin-top: 0.375rem;
      }
      .branch-form-actions-new {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      .branch-form-create {
        background-color: var(--accent-red);
        color: var(--text-inverse);
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.4rem 0.875rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .branch-form-create:hover { background-color: var(--accent-red-hover); }

      /* Branched-into indicator below a reply */
      .branched-into-indicator {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        margin-top: 0.625rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        cursor: pointer;
        transition: color 200ms;
      }
      .branched-into-indicator:hover { color: var(--text-primary); }
      .branched-into-indicator .child-title {
        color: var(--accent-purple);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
      }

      /* Sticky bottom main reply input — at thread foot */
      .group-main-reply {
        margin: 0 -1.75rem;
        padding: 1rem 1.75rem;
        border-top: 1px solid var(--border-default, #e7e2d5);
        background-color: var(--bg-page);
        border-radius: 0 0 0.625rem 0.625rem;
      }
      .group-main-reply-context {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 0.375rem;
      }
      .group-main-reply-row {
        display: flex;
        align-items: flex-end;
        gap: 0.5rem;
      }
      .group-main-reply-textarea {
        flex: 1;
        min-height: 2.75rem;
        max-height: 12rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        line-height: 1.5;
        padding: 0.625rem 0.75rem;
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.375rem;
        color: var(--text-primary);
        resize: none;
        transition: border-color 200ms;
      }
      .group-main-reply-textarea:focus {
        outline: none;
        border-color: var(--accent-purple);
      }
      .group-main-reply-post {
        height: 2.75rem;
        background-color: var(--accent-red);
        color: var(--text-inverse);
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        padding: 0 1rem;
        border-radius: 0.375rem;
        border: none;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .group-main-reply-post:hover { background-color: var(--accent-red-hover); }
      .group-main-reply-hint {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        color: var(--text-secondary);
        opacity: 0.6;
        margin-top: 0.375rem;
      }

      /* Sidebar conversation graph (xl: only) */
      .group-sidebar {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        opacity: 0;
        transform: translateY(16px);
        transition:
          opacity 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)),
          transform 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .group-sidebar[data-visible="true"] {
        opacity: 1;
        transform: translateY(0);
      }
      @media (max-width: 1279px) {
        .group-sidebar { display: none; }
      }
      .conversation-graph {
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-default, #e7e2d5);
        border-radius: 0.625rem;
        padding: 1rem 1.125rem;
      }
      .conversation-graph-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.75rem;
      }
      .conversation-graph-section {
        margin-bottom: 0.75rem;
      }
      .conversation-graph-section:last-child { margin-bottom: 0; }
      .conversation-graph-label {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        color: var(--text-secondary);
        margin-bottom: 0.375rem;
      }
      .conversation-graph-link {
        display: block;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        line-height: 1.45;
        color: var(--text-primary);
        cursor: pointer;
        padding: 0.125rem 0;
        transition: color 200ms;
      }
      .conversation-graph-link:hover {
        color: var(--accent-purple);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
      }

      /* ── Mobile parity (≤640px) ───────────────────────────── */
      @media (max-width: 640px) {
        /* Marginalia + reply + child-thread cards inline below their
           anchor element rather than floating off the right edge */
        .marginalia-card {
          position: relative !important;
          right: auto !important;
          top: auto !important;
          width: 100%;
          margin-top: 0.5rem;
        }
        .confusion-flag-button {
          position: relative !important;
          right: auto !important;
          top: auto !important;
          display: inline-flex !important;
          margin-left: 0.5rem;
        }
        .confusion-popover {
          position: relative !important;
          right: auto !important;
          top: auto !important;
          width: 100% !important;
          margin-top: 0.5rem;
        }
        .glossary-popover {
          position: relative !important;
          width: 100% !important;
          max-width: none;
          margin-top: 0.5rem;
        }
        .child-thread-result { width: 100%; }
      }

      /* ── Multi-panel surface layout ───────────────────────── */
      .surface-header {
        max-width: 50rem;
        margin: 0 auto 2.5rem;
        text-align: center;
      }
      .surface-header h2 {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        font-size: 2.25rem;
        line-height: 1.15;
        color: var(--text-primary);
        margin: 0.5rem 0 0.875rem;
      }
      .surface-header p {
        font-size: 1rem;
        color: var(--text-secondary);
        line-height: 1.55;
        max-width: 36rem;
        margin: 0 auto;
      }
      .panel-grid {
        max-width: 64rem;
        margin: 0 auto;
        display: grid;
        gap: 1.5rem;
      }
      .panel-grid > .panel-row {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 880px) {
        .panel-grid > .panel-row.cols-2 {
          grid-template-columns: 1fr 1fr;
        }
      }
      .panel {
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.625rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        position: relative;
        opacity: 0;
        transform: translateY(16px);
        transition:
          opacity 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)),
          transform 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        overflow: hidden;
      }
      .panel[data-visible="true"] {
        opacity: 1;
        transform: translateY(0);
      }
      .panel-tag {
        position: absolute;
        top: -0.6rem;
        right: 1rem;
        background-color: var(--bg-page);
        padding: 0 0.5rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }
      .panel-caption {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding: 0.625rem 1.125rem;
        border-top: 1px solid var(--border-subtle);
        background-color: var(--bg-page);
      }

      /* ── Reading orbit composition ────────────────────────── */
      .reading-orbit-grid {
        max-width: 72rem;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
      @media (min-width: 880px) {
        .reading-orbit-grid {
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 2rem;
          align-items: start;
        }
      }
      .reading-chapter {
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.625rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        position: relative;
        padding: 1.75rem 1.75rem 1.5rem;
        opacity: 0;
        transform: translateY(16px);
        transition:
          opacity 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)),
          transform 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .reading-chapter[data-visible="true"] {
        opacity: 1;
        transform: translateY(0);
      }
      .reading-chapter .breadcrumb {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .reading-chapter .breadcrumb .accent {
        color: var(--accent-red);
        cursor: pointer;
        transition: opacity 200ms;
      }
      .reading-chapter .breadcrumb .accent:hover { opacity: 0.7; }
      .reading-chapter .chrome-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .reading-chapter .chrome-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }
      .reading-chapter .chapter-title {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 1.625rem;
        color: var(--accent-red);
        margin: 0 0 0.5rem;
        line-height: 1.2;
      }
      .reading-chapter .chapter-subtitle {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        color: var(--text-secondary);
        font-size: 0.9375rem;
        margin-bottom: 0.75rem;
      }
      .reading-chapter .chrome-rule {
        width: 4rem;
        height: 2px;
        background-color: var(--accent-purple);
        margin: 0 auto;
      }
      .reading-chapter .body {
        position: relative;
      }
      .reading-chapter .body p {
        font-family: 'Lora', Georgia, serif;
        font-size: 1.0625rem;
        line-height: 1.75;
        color: var(--text-primary);
        margin: 0 0 1.125rem;
        position: relative;
      }
      /* Annotated mark — purple highlight matching live */
      .reading-chapter .body mark.annotated {
        background-color: rgba(var(--accent-purple-rgb), 0.18);
        color: inherit;
        padding: 0 2px;
        border-radius: 2px;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .reading-chapter .body mark.annotated:hover {
        background-color: rgba(var(--accent-purple-rgb), 0.32);
      }
      /* Glossary inline term — dotted underline */
      .reading-chapter .glossary-anchor {
        cursor: pointer;
        background-image: repeating-linear-gradient(to right,
          var(--accent-purple) 0,
          var(--accent-purple) 2px,
          transparent 2px,
          transparent 4px);
        background-size: 100% 1.5px;
        background-repeat: no-repeat;
        background-position: 0 100%;
        padding-bottom: 1px;
        color: var(--text-primary);
        position: relative;
        transition: filter 200ms;
      }
      .reading-chapter .glossary-anchor:hover {
        filter: brightness(0.85);
      }
      /* Glossary popover floating from term, overlapping into orbit */
      .reading-chapter .floating-glossary {
        position: absolute;
        top: 1.5em;
        left: 0;
        width: 22rem;
        max-width: calc(100% + 6rem);
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.5rem;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
        padding: 1rem 1.125rem;
        z-index: 5;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 200ms, transform 200ms;
        pointer-events: none;
      }
      .reading-chapter .floating-glossary[data-open="true"] {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      @media (min-width: 880px) {
        .reading-chapter .floating-glossary {
          width: 24rem;
        }
      }
      .floating-glossary .pop-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.375rem;
      }
      .floating-glossary .pop-term {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1.375rem;
        line-height: 1.2;
        margin-bottom: 0.5rem;
      }
      .floating-glossary .pop-def {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        line-height: 1.55;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
      }
      .floating-glossary .related-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.375rem;
      }
      .floating-glossary .related {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        margin-bottom: 0.875rem;
      }
      .floating-glossary .related-term-btn {
        color: var(--accent-purple);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        font: inherit;
        transition: filter 200ms;
      }
      .floating-glossary .related-term-btn:hover {
        filter: brightness(0.7);
      }
      .floating-glossary .pop-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding-top: 0.625rem;
        border-top: 1px solid var(--border-subtle);
      }
      .floating-glossary .open-full {
        font-weight: 500;
        color: var(--accent-red);
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        transition: filter 200ms;
      }
      .floating-glossary .open-full:hover { filter: brightness(0.85); }
      .floating-glossary .pop-close {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 0.875rem;
        padding: 0.125rem;
        transition: color 200ms;
      }
      .floating-glossary .pop-close:hover { color: var(--text-primary); }

      /* Confusion flag in chapter (right-anchored to paragraph) */
      .reading-chapter .body .para-with-flag {
        padding-right: 2rem;
        position: relative;
      }
      .reading-chapter .flag-anchor {
        position: absolute;
        top: 0.125rem;
        right: 0;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 50%;
        font-size: 0.625rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.55;
        transition: opacity 200ms, background-color 600ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        border: none;
      }
      .reading-chapter .body .para-with-flag:hover .flag-anchor,
      .reading-chapter .flag-anchor:hover { opacity: 1; }
      .reading-chapter .flag-anchor[data-intensity="0"] {
        background-color: var(--bg-card-alt, #f5f0e8);
        color: var(--text-secondary);
      }
      .reading-chapter .flag-anchor[data-intensity="low"] {
        background-color: #d4c9a8;
        color: var(--text-primary);
      }
      .reading-chapter .flag-anchor[data-intensity="mid"] {
        background-color: #c9a86b;
        color: var(--text-primary);
      }
      .reading-chapter .flag-anchor[data-intensity="high"] {
        background-color: #b8863f;
        color: var(--text-primary);
      }

      /* Confusion popover floating off paragraph 3, overlapping orbit */
      .reading-chapter .floating-confusion {
        position: absolute;
        top: 0;
        left: 0;
        width: 20rem;
        max-width: calc(100% + 6rem);
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.5rem;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
        padding: 1rem 1.125rem;
        z-index: 5;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 200ms, transform 200ms;
        pointer-events: none;
      }
      .reading-chapter .floating-confusion[data-open="true"] {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .floating-confusion .pop-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-amber);
        margin-bottom: 0.5rem;
      }
      .floating-confusion .pop-headline {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1rem;
        line-height: 1.3;
        margin-bottom: 0.5rem;
      }
      .floating-confusion .pop-explainer {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        line-height: 1.55;
        color: var(--text-secondary);
        margin-bottom: 0.875rem;
      }
      .floating-confusion .stuck-button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background-color: var(--bg-card-alt, #f5f0e8);
        border: 1px solid var(--border-subtle);
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
        cursor: pointer;
        transition: background-color 200ms, border-color 200ms;
      }
      .floating-confusion .stuck-button:hover {
        background-color: rgba(var(--accent-amber-rgb), 0.04);
      }
      .floating-confusion .stuck-button[data-flagged="true"] {
        border-color: var(--accent-amber);
        background-color: rgba(var(--accent-amber-rgb), 0.06);
      }
      .floating-confusion .stuck-left {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .floating-confusion .anonymous-tag {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }
      .floating-confusion .think-cta {
        display: block;
        width: 100%;
        background-color: var(--accent-red);
        color: var(--text-inverse);
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        font-weight: 500;
        text-align: center;
        border: none;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .floating-confusion .think-cta:hover { background-color: var(--accent-red-hover); }

      /* Selection action bar floating above selected text */
      .reading-chapter .selection-bar-float {
        position: absolute;
        background-color: var(--bg-nav);
        color: var(--text-inverse);
        border-radius: 0.375rem;
        padding: 0.25rem;
        display: flex;
        gap: 0.125rem;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
        z-index: 6;
        font-family: 'Inter', sans-serif;
      }
      .reading-chapter .selection-bar-float button {
        background: transparent;
        color: var(--text-inverse);
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.375rem 0.75rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 200ms;
      }
      .reading-chapter .selection-bar-float button:hover {
        background-color: rgba(255, 255, 255, 0.12);
      }
      .reading-chapter .selection-highlight {
        background-color: rgba(91, 145, 255, 0.22);
        padding: 0 1px;
        cursor: pointer;
      }
      .reading-chapter .selection-feedback {
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-style: italic;
        min-height: 1.2em;
        margin-top: 0.5rem;
        opacity: 0;
        transition: opacity 300ms;
      }
      .reading-chapter .selection-feedback[data-shown="true"] { opacity: 1; }

      /* Audio collapsed button at chapter foot */
      .reading-chapter .audio-foot {
        margin-top: 1.5rem;
        padding-top: 1.25rem;
        border-top: 1px solid var(--border-subtle);
        display: flex;
        justify-content: center;
      }
      .audio-listen-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background-color: var(--bg-card, #ffffff);
        color: var(--text-primary);
        border: 1px solid var(--border-default, #e7e2d5);
        border-radius: 0.5rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 200ms, transform 200ms;
      }
      .audio-listen-btn:hover {
        background-color: var(--bg-soft, #f5f0e8);
        transform: translateY(-1px);
      }
      .audio-listen-btn .listen-meta {
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-weight: 400;
      }
      .audio-listen-btn[data-active="true"] {
        background-color: rgba(var(--accent-purple-rgb), 0.08);
        border-color: var(--accent-purple);
      }

      /* Orbit lane */
      .reading-orbit {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      @media (min-width: 880px) {
        .reading-orbit {
          /* Match chapter top, cards anchor to relative vertical position */
          padding-top: 0;
          gap: 1.5rem;
          min-height: 100%;
          justify-content: space-between;
        }
      }
      .orbit-card {
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-subtle);
        border-radius: 0.625rem;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        opacity: 0;
        transform: translateY(16px);
        transition:
          opacity 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)),
          transform 700ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      .orbit-card[data-visible="true"] {
        opacity: 1;
        transform: translateY(0);
      }

      /* Marginalia card in orbit lane (Bucket 2 v1 visual).
         margin-top approximates para 1's vertical position in the chapter
         (chapter padding + chrome-header height) so the card sits next to
         the line it's about, not at the top of the orbit lane. */
      .orbit-marginalia {
        padding: 1rem 1.125rem;
        cursor: pointer;
        transition: background-color 200ms, transform 200ms;
      }
      @media (min-width: 880px) {
        .orbit-marginalia {
          margin-top: 11rem;
        }
      }
      .orbit-marginalia:hover {
        background-color: rgba(var(--accent-purple-rgb), 0.03);
        transform: translateY(-1px);
      }
      .orbit-marginalia .anchor-line {
        font-family: 'Lora', Georgia, serif;
        font-size: 0.8125rem;
        line-height: 1.5;
        color: var(--text-secondary);
        padding-bottom: 0.625rem;
        margin-bottom: 0.625rem;
        border-bottom: 1px solid var(--border-subtle);
      }
      .orbit-marginalia .anchor-line mark {
        background-color: rgba(var(--accent-purple-rgb), 0.16);
        color: var(--text-primary);
        padding: 0 1px;
        border-radius: 1px;
      }
      .annot-card-frame {
        background-color: rgba(var(--accent-purple-rgb), 0.06);
        border-left: 2px solid var(--accent-purple);
        padding: 0.625rem 0.75rem;
        border-radius: 0 0.25rem 0.25rem 0;
        font-family: 'Inter', sans-serif;
      }
      .annot-author-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.375rem;
      }
      .annot-avatar {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: white;
        font-size: 0.625rem;
        flex-shrink: 0;
      }
      .annot-name {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-primary);
      }
      .annot-time {
        font-size: 0.6875rem;
        color: var(--text-secondary);
      }
      .annot-body {
        font-size: 0.8125rem;
        line-height: 1.55;
        color: var(--text-primary);
      }
      .annot-replies {
        margin-top: 0.625rem;
        padding-left: 0.75rem;
        border-left: 1px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        animation: annot-replies-in 350ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
      }
      @keyframes annot-replies-in {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .annot-reply-toggle {
        margin-top: 0.625rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--accent-red);
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        transition: filter 200ms;
      }
      .annot-reply-toggle:hover { filter: brightness(0.85); }

      /* Audio expanded pill in orbit lane */
      .orbit-audio {
        padding: 1.25rem 1rem;
        text-align: center;
      }
      .audio-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-default, #e7e2d5);
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        max-width: 100%;
        flex-wrap: wrap;
        justify-content: center;
      }
      .audio-pill .pill-skip {
        display: inline-flex;
        align-items: center;
        gap: 0.125rem;
        padding: 0.25rem 0.5rem;
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-secondary);
        border-radius: 9999px;
        font-size: 0.625rem;
        font-weight: 500;
        border: none;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .audio-pill .pill-skip:hover { background-color: var(--border-subtle); }
      .audio-pill .pill-play {
        width: 1.875rem;
        height: 1.875rem;
        border-radius: 50%;
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        transition: background-color 200ms, transform 150ms;
      }
      .audio-pill .pill-play:hover { transform: scale(1.05); }
      .audio-pill .pill-play[data-playing="true"] {
        background-color: var(--accent-purple);
        color: var(--text-inverse);
      }
      .audio-pill .pill-track {
        width: 6rem;
        height: 4px;
        background-color: var(--bg-soft, #f5f0e8);
        border-radius: 9999px;
        overflow: hidden;
        cursor: pointer;
        transition: height 200ms;
      }
      .audio-pill .pill-track:hover { height: 6px; }
      .audio-pill .pill-fill {
        height: 100%;
        background-color: var(--accent-purple);
        transition: width 100ms linear;
      }
      .audio-pill .pill-time {
        color: var(--text-primary);
        font-weight: 600;
        font-size: 0.625rem;
        font-variant-numeric: tabular-nums;
      }
      .audio-pill .pill-speed {
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-secondary);
        font-family: 'Inter', sans-serif;
        font-size: 0.625rem;
        font-weight: 700;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        border: none;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .audio-pill .pill-speed:hover { background-color: var(--border-subtle); }

      /* Reading-surface specific panel styles (legacy v4 — kept for now) */
      .panel-reading-chapter {
        padding: 1.5rem 1.5rem 1.25rem;
      }
      .panel-reading-chapter .reading-breadcrumb {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .panel-reading-chapter .reading-breadcrumb a,
      .panel-reading-chapter .reading-breadcrumb .accent {
        color: var(--accent-red);
      }
      .panel-reading-chapter .reading-chrome-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .panel-reading-chapter .reading-chrome-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.5rem;
      }
      .panel-reading-chapter .reading-chapter-title {
        font-family: 'Lora', Georgia, serif;
        font-weight: 700;
        font-size: 1.5rem;
        color: var(--accent-red);
        margin: 0 0 0.5rem;
        line-height: 1.2;
      }
      .panel-reading-chapter .reading-chapter-subtitle {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        color: var(--text-secondary);
        font-size: 0.9375rem;
        margin-bottom: 0.75rem;
      }
      .panel-reading-chapter .reading-chrome-rule {
        width: 4rem;
        height: 2px;
        background-color: var(--accent-purple);
        margin: 0 auto;
      }
      .panel-reading-chapter .reading-body {
        max-width: 36rem;
        margin: 0 auto;
      }
      .panel-reading-chapter .reading-body p {
        font-family: 'Lora', Georgia, serif;
        font-size: 1.0625rem;
        line-height: 1.75;
        color: var(--text-primary);
        margin: 0 0 1rem;
      }
      .panel-reading-chapter mark.annotated {
        background-color: rgba(var(--accent-purple-rgb), 0.16);
        color: inherit;
        padding: 0 2px;
        border-radius: 2px;
        cursor: pointer;
        transition: background-color 200ms;
      }
      .panel-reading-chapter mark.annotated:hover {
        background-color: rgba(var(--accent-purple-rgb), 0.28);
      }
      /* Audio collapsed button — sits at the chapter foot per live */
      .panel-reading-chapter .audio-collapsed-row {
        display: flex;
        justify-content: center;
        margin-top: 1.5rem;
      }
      .audio-listen-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background-color: var(--bg-card, #ffffff);
        color: var(--text-primary);
        border: 1px solid var(--border-default, #e7e2d5);
        border-radius: 0.5rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
      }
      .audio-listen-button:hover {
        background-color: var(--bg-soft, #f5f0e8);
      }
      .audio-listen-meta {
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-weight: 400;
      }

      /* Annotation card panel — Bucket 2 v1 visual style */
      .panel-annotation {
        padding: 1.5rem;
      }
      .panel-annotation .annotation-anchor-line {
        font-family: 'Lora', Georgia, serif;
        font-size: 0.9375rem;
        line-height: 1.65;
        color: var(--text-secondary);
        padding-bottom: 0.875rem;
        margin-bottom: 0.875rem;
        border-bottom: 1px solid var(--border-subtle);
      }
      .panel-annotation .annotation-anchor-line mark {
        background-color: rgba(var(--accent-purple-rgb), 0.16);
        color: var(--text-primary);
        padding: 0 2px;
        border-radius: 2px;
      }
      .annotation-card {
        background-color: rgba(var(--accent-purple-rgb), 0.06);
        border-left: 2px solid var(--accent-purple);
        padding: 0.75rem 0.875rem;
        border-radius: 0 0.25rem 0.25rem 0;
        font-family: 'Inter', sans-serif;
      }
      .annotation-card .annotation-author {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.375rem;
      }
      .annotation-card .annotation-avatar {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: white;
        font-size: 0.625rem;
        flex-shrink: 0;
      }
      .annotation-card .annotation-name {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-primary);
      }
      .annotation-card .annotation-time {
        font-size: 0.6875rem;
        color: var(--text-secondary);
      }
      .annotation-card .annotation-body {
        font-size: 0.8125rem;
        line-height: 1.55;
        color: var(--text-primary);
      }

      /* Annotation depth panel — single annotation + reply chain */
      .panel-annotation-depth .annotation-replies {
        margin-top: 0.75rem;
        padding-left: 0.875rem;
        border-left: 1px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }
      .panel-annotation-depth .annotation-reply {
        font-family: 'Inter', sans-serif;
      }
      .panel-annotation-depth .annotation-reply .annotation-author {
        margin-bottom: 0.25rem;
      }
      .panel-annotation-depth .reply-affordance {
        margin-top: 0.625rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--accent-red);
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
      }

      /* Glossary popover panel — full GlossaryPopover treatment */
      .panel-glossary {
        padding: 1.5rem 1.5rem 1.25rem;
      }
      .panel-glossary .glossary-anchor-line {
        font-family: 'Lora', Georgia, serif;
        font-size: 0.9375rem;
        line-height: 1.65;
        color: var(--text-secondary);
        padding-bottom: 0.875rem;
        margin-bottom: 0.875rem;
        border-bottom: 1px solid var(--border-subtle);
      }
      .panel-glossary .glossary-term-inline {
        cursor: pointer;
        background-image: repeating-linear-gradient(to right,
          var(--accent-purple) 0,
          var(--accent-purple) 2px,
          transparent 2px,
          transparent 4px);
        background-size: 100% 1.5px;
        background-repeat: no-repeat;
        background-position: 0 100%;
        padding-bottom: 1px;
        color: var(--text-primary);
      }
      .panel-glossary .glossary-popover-card {
        border: 1px solid var(--border-subtle);
        border-radius: 0.5rem;
        padding: 1rem 1.125rem;
        background-color: var(--bg-page);
      }
      .panel-glossary .glossary-popover-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-purple);
        margin-bottom: 0.375rem;
      }
      .panel-glossary .glossary-popover-term {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1.375rem;
        line-height: 1.2;
        margin-bottom: 0.625rem;
      }
      .panel-glossary .glossary-popover-def {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        line-height: 1.55;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
      }
      .panel-glossary .related-terms-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 0.375rem;
      }
      .panel-glossary .related-terms {
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        margin-bottom: 0.875rem;
      }
      .panel-glossary .related-term {
        color: var(--accent-purple);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 0.18em;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        font: inherit;
      }
      .panel-glossary .glossary-popover-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding-top: 0.625rem;
        border-top: 1px solid var(--border-subtle);
      }
      .panel-glossary .open-full-link {
        font-weight: 500;
        color: var(--accent-red);
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
      }

      /* Confusion popover panel — full ConfusionPopover treatment */
      .panel-confusion {
        padding: 1.5rem 1.5rem 1.25rem;
      }
      .panel-confusion .confusion-anchor-paragraph {
        font-family: 'Lora', Georgia, serif;
        font-size: 0.9375rem;
        line-height: 1.65;
        color: var(--text-secondary);
        padding-bottom: 0.875rem;
        margin-bottom: 0.875rem;
        border-bottom: 1px solid var(--border-subtle);
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
      }
      .panel-confusion .confusion-anchor-paragraph .confusion-flag-button {
        position: relative;
        right: auto;
        top: auto;
        flex-shrink: 0;
        margin-top: 0.25rem;
        opacity: 1;
      }
      .panel-confusion .confusion-popover-card {
        border: 1px solid var(--border-subtle);
        border-radius: 0.5rem;
        padding: 1rem 1.125rem;
        background-color: var(--bg-page);
      }
      .panel-confusion .confusion-popover-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--accent-amber);
        margin-bottom: 0.5rem;
      }
      .panel-confusion .confusion-popover-headline {
        font-family: 'Lora', Georgia, serif;
        font-style: italic;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 1.0625rem;
        line-height: 1.3;
        margin-bottom: 0.625rem;
      }
      .panel-confusion .confusion-popover-explainer {
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
        line-height: 1.55;
        color: var(--text-secondary);
        margin-bottom: 0.875rem;
      }
      .panel-confusion .stuck-button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background-color: var(--bg-card-alt, #f5f0e8);
        border: 1px solid var(--border-subtle);
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
        cursor: pointer;
      }
      .panel-confusion .stuck-button[data-flagged="true"] {
        border-color: var(--accent-amber);
        background-color: rgba(var(--accent-amber-rgb), 0.06);
      }
      .panel-confusion .stuck-button .left {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .panel-confusion .anonymous-tag {
        font-family: 'Inter', sans-serif;
        font-size: 0.5625rem;
        font-weight: 600;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }
      .panel-confusion .think-together-cta {
        display: block;
        width: 100%;
        background-color: var(--accent-red);
        color: var(--text-inverse);
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.8125rem;
        font-weight: 500;
        text-align: center;
        border: none;
        cursor: pointer;
      }

      /* Selection action bar panel */
      .panel-selection {
        padding: 2rem 1.5rem 1.5rem;
      }
      .panel-selection .selection-anchor {
        font-family: 'Lora', Georgia, serif;
        font-size: 0.9375rem;
        line-height: 1.7;
        color: var(--text-primary);
        position: relative;
      }
      .panel-selection .selection-highlight {
        background-color: rgba(91, 145, 255, 0.18);
        padding: 0 1px;
      }
      .panel-selection .selection-bar-anchored {
        position: absolute;
        background-color: var(--bg-nav);
        color: var(--text-inverse);
        border-radius: 0.375rem;
        padding: 0.25rem;
        display: flex;
        gap: 0.125rem;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
        font-family: 'Inter', sans-serif;
      }
      .panel-selection .selection-bar-anchored button {
        background: transparent;
        color: var(--text-inverse);
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.375rem 0.75rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
        white-space: nowrap;
      }
      .panel-selection .selection-bar-anchored button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .panel-selection .selection-feedback {
        margin-top: 0.875rem;
        font-family: 'Inter', sans-serif;
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-style: italic;
        min-height: 1.2em;
      }

      /* Audio expanded panel — the floating pill replicated */
      .panel-audio {
        padding: 1.5rem 1.5rem 1.25rem;
        text-align: center;
      }
      .panel-audio .audio-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem 0.875rem;
        background-color: var(--bg-card, #ffffff);
        border: 1px solid var(--border-default, #e7e2d5);
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        font-family: 'Inter', sans-serif;
        font-size: 0.6875rem;
      }
      .panel-audio .audio-skip {
        display: inline-flex;
        align-items: center;
        gap: 0.125rem;
        padding: 0.25rem 0.5rem;
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-secondary);
        border-radius: 9999px;
        font-size: 0.625rem;
        font-weight: 500;
        border: none;
        cursor: pointer;
      }
      .panel-audio .audio-play-btn {
        width: 1.875rem;
        height: 1.875rem;
        border-radius: 50%;
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
      }
      .panel-audio .audio-play-btn[data-playing="true"] {
        background-color: var(--accent-purple);
        color: var(--text-inverse);
      }
      .panel-audio .audio-track {
        width: 8rem;
        height: 6px;
        background-color: var(--bg-soft, #f5f0e8);
        border-radius: 9999px;
        overflow: hidden;
        cursor: pointer;
      }
      .panel-audio .audio-fill {
        height: 100%;
        background-color: var(--accent-purple);
        transition: width 100ms linear;
      }
      .panel-audio .audio-time {
        color: var(--text-primary);
        font-weight: 600;
        font-size: 0.6875rem;
        font-variant-numeric: tabular-nums;
      }
      .panel-audio .audio-speed {
        background-color: var(--bg-soft, #f5f0e8);
        color: var(--text-secondary);
        font-family: 'Inter', sans-serif;
        font-size: 0.625rem;
        font-weight: 700;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        border: none;
        cursor: pointer;
      }

      /* ── Reduced-motion override ──────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        .welcome-section,
        .welcome-section .welcome-visual {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
        .opener-stagger > * { opacity: 1 !important; transform: none !important; transition: none !important; }
        .panel {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
        .marginalia-card,
        .glossary-popover,
        .confusion-popover,
        .selection-action-bar,
        .branch-form,
        .child-thread-result,
        .reference-quote-inserted,
        .personal-body-text {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
        .branch-form { max-height: none !important; }
        .attention-bar { width: var(--bar-target, 100%) !important; transition: none !important; }
        .audio-fill { width: 35% !important; transition: none !important; }
        .dashboard-header,
        .dashboard-orientation,
        .hero-quote-section,
        .attention-section,
        .stuck-section {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
      }
    `}</style>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Reading surface — chapter view, interactive prompts + ambient confusion.
 * ───────────────────────────────────────────────────────────────── */

interface SurfaceProps {
  sectionRef: (el: HTMLElement | null) => void
  active: boolean
  reduced: boolean
}

/**
 * usePanelVisible — IntersectionObserver-driven entry-fade hook.
 * Returns a ref to attach to the panel + boolean visibility state.
 * Reduced-motion users get visible=true from first paint.
 */
function usePanelVisible(reduced: boolean) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (reduced) {
      setVisible(true)
      return
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduced])
  return [ref, visible] as const
}

/* Reading surface — orbit composition (Brief 1 sub-batch 6 v5).
 *
 * Layout: 2-column grid at ≥880px. Chapter at 2/3 width on the left; orbit
 * lane at 1/3 width on the right. The chapter dominates; smaller elements
 * orbit it spatially (marginalia anchored to source paragraph, audio
 * expanded at chapter foot). Popovers float from their chapter anchors,
 * overlapping into the orbit lane.
 *
 * Adventure-mode interactivity: every panel is real and locally responsive.
 *   - Glossary related-term buttons swap content (commodity → use-value → ...)
 *   - Confusion "I'm also stuck" toggles flagged state, count climbs ambient
 *   - Selection action bar buttons surface italic feedback
 *   - Audio collapsed click + expanded controls play the actual LibriVox MP3
 *     (chapter 1, capital_vol1_0810_librivox/capitalvol1_04_marx.mp3)
 *   - Marginalia card click expands to reveal reply chain (Bucket 2 v1 visual)
 *
 * No captions, no panel-tag labels, no surface frame copy. Eyebrow only.
 *
 * Affordance density: every visible element has a hover state. Cursor pointers,
 * subtle background tints, transform: scale on play button, brightness filter
 * on related terms, etc. Panels feel reactive at rest.
 *
 * Live-component fidelity: chapter view header (eyebrow + pink Lora-bold
 * title + italic subtitle + 4rem×2px purple rule), GlossaryPopover (purple
 * eyebrow + Lora-italic term + def + related terms + footer), ConfusionPopover
 * (amber eyebrow + Lora-italic count line + anonymous explainer + two CTAs),
 * SelectionActionBar (Annotate + "give this its own space"), AudioPlayer
 * (collapsed Headphones-icon button + expanded floating pill).
 *
 * Bucket 2 visual exception held: marginalia card v1 styling.
 */

const READING_AUDIO_URL =
  'https://www.archive.org/download/capital_vol1_0810_librivox/capitalvol1_04_marx.mp3'
const READING_AUDIO_DURATION = 1186.6 // 19:46

function ReadingSurface({ sectionRef, reduced }: SurfaceProps) {
  // Audio — single position at chapter foot, two states. Default: collapsed
  // "Listen to this chapter" button (matches live AudioPlayer's collapsed
  // state). On click: transitions in place to the full controls (skip / play
  // / skip / scrubber / time / speed) and starts real LibriVox playback.
  // Once expanded, stays expanded — same as the live behaviour where the
  // user's session has audio active.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioExpanded, setAudioExpanded] = useState(false)
  const [audioCurrent, setAudioCurrent] = useState(0)
  const [audioRate, setAudioRate] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setAudioCurrent(audio.currentTime)
    const onPause = () => setAudioPlaying(false)
    const onPlay = () => setAudioPlaying(true)
    const onEnded = () => setAudioPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = audioRate
  }, [audioRate])

  const handleListenClick = () => {
    // Collapsed → expanded transition. Start playback at the same time so
    // the user's gesture has immediate effect.
    setAudioExpanded(true)
    const audio = audioRef.current
    if (audio && audio.paused) {
      audio.play().catch(err => {
        console.warn('[CCP] Audio play failed:', err)
        setAudioPlaying(false)
      })
    }
  }
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(err => {
        console.warn('[CCP] Audio play failed:', err)
        setAudioPlaying(false)
      })
    } else {
      audio.pause()
    }
  }
  const skip = (delta: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(
      READING_AUDIO_DURATION,
      audioRef.current.currentTime + delta
    ))
  }
  const cycleSpeed = () => {
    setAudioRate(r => r === 1 ? 1.25 : r === 1.25 ? 1.5 : r === 1.5 ? 0.75 : 1)
  }
  const seekFromTrack = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * READING_AUDIO_DURATION
  }
  const audioProgress = (audioCurrent / READING_AUDIO_DURATION) * 100
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  // Glossary
  const [glossaryOpen, setGlossaryOpen] = useState(true)
  const [glossaryTerm, setGlossaryTerm] = useState<'commodity' | 'use-value' | 'exchange-value'>('commodity')
  const definitions: Record<string, { def: string; related: Array<'commodity' | 'use-value' | 'exchange-value'> }> = {
    'commodity': {
      def: 'An external object whose properties satisfy human wants of some sort. For Marx, the elementary form in which capitalist wealth presents itself.',
      related: ['use-value', 'exchange-value'],
    },
    'use-value': {
      def: 'The qualitative side of a commodity — what it is good for, what human want it satisfies. Realised only in use or consumption.',
      related: ['commodity', 'exchange-value'],
    },
    'exchange-value': {
      def: 'The quantitative side — the proportion in which a commodity exchanges for other commodities. Appears at first sight as something accidental.',
      related: ['commodity', 'use-value'],
    },
  }
  const glossaryEntry = definitions[glossaryTerm]

  // Confusion — static count per Mars's v5 cut #2 (no animated climb).
  // Toggle still increments locally (adventure-mode interactivity stays).
  const [confusionOpen, setConfusionOpen] = useState(true)
  const [confusionFlagged, setConfusionFlagged] = useState(false)
  const baseCount = 7
  const confusionCount = baseCount + (confusionFlagged ? 1 : 0)
  // Static high intensity matches the static count (7+ → high)
  const intensity = 'high' as const

  const toggleStuck = () => setConfusionFlagged(f => !f)

  // Selection action bar — buttons clickable but no follow-up explanation
  // text per Mars's v5 cut #3. Platform's own copy ("Annotate" / "Give
  // this its own space") is the teaching.
  const onAnnotate = () => { /* no-op for the mockup; live opens composer */ }
  const onGiveOwnSpace = () => { /* no-op for the mockup; live routes to /threads/new */ }

  // Marginalia
  const [marginaliaExpanded, setMarginaliaExpanded] = useState(false)

  // Entry visibility for chapter + orbit marginalia card
  const [chapterRef, chapterVisible] = usePanelVisible(reduced)
  const [marginaliaRef, marginaliaVisible] = usePanelVisible(reduced)

  return (
    <section
      ref={sectionRef}
      className="welcome-section is-multipanel"
      data-surface="reading"
      aria-label="Reading"
    >
      <p className="welcome-section-marker text-eyebrow">02 / Reading</p>

      <audio ref={audioRef} src={READING_AUDIO_URL} preload="none" />

      <div className="reading-orbit-grid">
        {/* Chapter column */}
        <div ref={chapterRef} className="reading-chapter" data-visible={chapterVisible ? 'true' : 'false'}>
          <p className="breadcrumb">
            <span className="accent">Reading</span>
            <span>›</span>
            <span className="accent">Capital, Vol I</span>
            <span>›</span>
            <span style={{ color: 'var(--text-primary)' }}>Chapter 1, Section 1</span>
          </p>

          <div className="chrome-header">
            <p className="chrome-eyebrow">01 / Chapter 1, §1 · ~11 Min Read</p>
            <h1 className="chapter-title">The Two Factors of a Commodity</h1>
            <p className="chapter-subtitle">Use-value and value</p>
            <div className="chrome-rule" />
          </div>

          <div className="body">
            {/* Para 1 — annotated highlight (anchor for marginalia in orbit lane) */}
            <p>
              The wealth of those societies in which the capitalist mode of production prevails, presents itself as &ldquo;an immense accumulation of <mark className="annotated">commodities</mark>,&rdquo; its unit being a single commodity.
            </p>

            {/* Para 2 — glossary term + floating popover */}
            <p style={{ position: 'relative' }}>
              Our investigation must therefore begin with the analysis of a{' '}
              <span
                className="glossary-anchor"
                onClick={() => setGlossaryOpen(o => !o)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setGlossaryOpen(o => !o) }}
                aria-label="Open glossary entry for commodity"
              >
                commodity
              </span>
              .
              <span
                className="floating-glossary"
                data-open={glossaryOpen ? 'true' : 'false'}
                style={{ display: 'block' }}
              >
                <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
                    <span className="pop-eyebrow" style={{ display: 'block' }}>Glossary · Introduced Week 1</span>
                    <span className="pop-term" style={{ display: 'block' }}>{glossaryTerm}</span>
                  </span>
                  <button
                    type="button"
                    className="pop-close"
                    onClick={(e) => { e.stopPropagation(); setGlossaryOpen(false) }}
                    aria-label="Close glossary"
                  >
                    ✕
                  </button>
                </span>
                <span className="pop-def" style={{ display: 'block' }}>{glossaryEntry.def}</span>
                <span className="related-eyebrow" style={{ display: 'block' }}>Related terms</span>
                <span className="related" style={{ display: 'block' }}>
                  {glossaryEntry.related.map((t, i) => (
                    <span key={t}>
                      <button
                        type="button"
                        className="related-term-btn"
                        onClick={(e) => { e.stopPropagation(); setGlossaryTerm(t) }}
                      >
                        {t}
                      </button>
                      {i < glossaryEntry.related.length - 1 ? ' · ' : ''}
                    </span>
                  ))}
                </span>
                <span className="pop-footer" style={{ display: 'flex' }}>
                  <span>Edited by 3 members</span>
                  <button type="button" className="open-full" onClick={(e) => e.stopPropagation()}>
                    Open full entry →
                  </button>
                </span>
              </span>
            </p>

            {/* Para 3 — confusion flag + floating popover */}
            <div className="para-with-flag" style={{ marginBottom: '1.125rem', position: 'relative' }}>
              <p style={{ margin: 0 }}>
                Every useful thing, as iron, paper, etc., may be looked at from the two points of view of quality and quantity. Every such thing is a whole composed of many properties.
              </p>
              <button
                type="button"
                className="flag-anchor"
                data-intensity={intensity}
                onClick={() => setConfusionOpen(o => !o)}
                aria-label={`${confusionCount} ${confusionCount === 1 ? 'person has' : 'people have'} flagged this paragraph`}
              >
                ?
              </button>
              <div
                className="floating-confusion"
                data-open={confusionOpen ? 'true' : 'false'}
                style={{ top: '2.5rem', left: '12%' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <p className="pop-eyebrow" style={{ flex: 1, margin: 0 }}>This passage is confusing</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setConfusionOpen(false) }}
                    aria-label="Close confusion details"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', padding: '0.125rem' }}
                  >
                    ✕
                  </button>
                </div>
                <p className="pop-headline">
                  {confusionCount === 0
                    ? 'Nobody has flagged this yet.'
                    : `${confusionCount} ${confusionCount === 1 ? 'person has' : 'people have'} flagged this paragraph`}
                </p>
                <p className="pop-explainer">
                  Flags are anonymous. Nobody sees who flagged what, only how many.
                </p>
                <button
                  type="button"
                  className="stuck-button"
                  data-flagged={confusionFlagged ? 'true' : 'false'}
                  onClick={toggleStuck}
                >
                  <span className="stuck-left">
                    <Flag size={14} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--accent-amber)', fill: confusionFlagged ? 'var(--accent-amber)' : 'none' }} />
                    {confusionFlagged ? "You're flagged here" : "I'm also stuck here"}
                  </span>
                  <span className="anonymous-tag">Anonymous</span>
                </button>
                <button type="button" className="think-cta">
                  Start thinking together
                </button>
              </div>
            </div>

            {/* Para 4 — selection highlight + floating action bar */}
            <p>
              It is value, rather, that converts every product into a social hieroglyphic. Later on, we try to decipher the hieroglyphic, to get behind the secret of our own social products: for to stamp an object of utility as a value, is just as much a social product as language.
            </p>
            <div style={{ position: 'relative' }}>
              <p>
                The <span className="selection-highlight">value of a commodity is independent of its physical body</span> and is realised only in exchange.
              </p>
              <div className="selection-bar-float" style={{ top: '-2rem', left: '8%' }}>
                <button type="button" onClick={onAnnotate}>Annotate</button>
                <button type="button" onClick={onGiveOwnSpace}>Give this its own space</button>
              </div>
            </div>
          </div>

          {/* Audio at chapter foot. Default: collapsed Listen button.
              On click: transitions to full pill controls in place (skip /
              play / skip / scrubber / time / speed) and starts playback. */}
          <div className="audio-foot">
            {!audioExpanded ? (
              <button
                type="button"
                className="audio-listen-btn"
                onClick={handleListenClick}
                aria-label="Listen to this chapter"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
                Listen to this chapter
                <span className="listen-meta">· 19:46 · Read by Carl Manchester</span>
              </button>
            ) : (
              <div className="audio-pill" role="toolbar" aria-label="Audio player">
                <button type="button" className="pill-skip" onClick={() => skip(-15)} aria-label="Skip back 15 seconds">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 17l-5-5 5-5" /><path d="M18 17l-5-5 5-5" />
                  </svg>
                  15s
                </button>
                <button
                  type="button"
                  className="pill-play"
                  data-playing={audioPlaying ? 'true' : 'false'}
                  onClick={togglePlay}
                  aria-label={audioPlaying ? 'Pause' : 'Play'}
                >
                  {audioPlaying
                    ? <Pause size={14} strokeWidth={2} aria-hidden="true" />
                    : <Play size={14} strokeWidth={2} aria-hidden="true" />}
                </button>
                <button type="button" className="pill-skip" onClick={() => skip(15)} aria-label="Skip forward 15 seconds">
                  15s
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 17l5-5-5-5" /><path d="M6 17l5-5-5-5" />
                  </svg>
                </button>
                <div className="pill-track" onClick={seekFromTrack} role="slider" aria-label="Audio progress" aria-valuenow={Math.round(audioProgress)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="pill-fill" style={{ width: `${audioProgress}%` }} />
                </div>
                <span className="pill-time">{fmt(audioCurrent)} / 19:46</span>
                <button type="button" className="pill-speed" onClick={cycleSpeed} aria-label={`Playback speed: ${audioRate}x`}>
                  {audioRate}×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Orbit lane */}
        <div className="reading-orbit">
          {/* Marginalia anchored to para 1 vertical, click to expand replies.
             Conditional rendering of replies (cleaner than CSS max-height
             transition; v5.1 walked as not-expanding because the CSS-driven
             approach didn't reliably show the chain). X close visible only
             when expanded, top-right. */}
          <div
            ref={marginaliaRef}
            className="orbit-card orbit-marginalia"
            data-visible={marginaliaVisible ? 'true' : 'false'}
            data-expanded={marginaliaExpanded ? 'true' : 'false'}
            onClick={() => setMarginaliaExpanded(e => !e)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setMarginaliaExpanded(x => !x) }}
          >
            <p className="anchor-line">
              presents itself as <mark>&ldquo;an immense accumulation of commodities&rdquo;</mark>
            </p>
            <div className="annot-card-frame" style={{ position: 'relative' }}>
              {marginaliaExpanded && (
                <button
                  type="button"
                  className="annot-close-x"
                  onClick={(e) => { e.stopPropagation(); setMarginaliaExpanded(false) }}
                  aria-label="Collapse replies"
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    padding: '0.125rem 0.25rem',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
              <div className="annot-author-row">
                <span className="annot-avatar" style={{ backgroundColor: '#7a4f9c' }}>L</span>
                <div>
                  <div className="annot-name">Liz</div>
                  <div className="annot-time">2 days ago</div>
                </div>
              </div>
              <div className="annot-body">
                I keep coming back to this opening — the way Marx insists we start with the commodity, not with markets or money. The choice of starting point is the whole argument.
              </div>
              {marginaliaExpanded && (
                <div className="annot-replies">
                  <div>
                    <div className="annot-author-row" style={{ marginBottom: '0.25rem' }}>
                      <span className="annot-avatar" style={{ backgroundColor: '#3f6f4a' }}>D</span>
                      <div>
                        <div className="annot-name">Daniel</div>
                        <div className="annot-time">1 day ago</div>
                      </div>
                    </div>
                    <div className="annot-body">
                      Same. The &lsquo;immense&rsquo; is doing work too — accumulation as the form, before any specific transaction.
                    </div>
                  </div>
                  <div>
                    <div className="annot-author-row" style={{ marginBottom: '0.25rem' }}>
                      <span className="annot-avatar" style={{ backgroundColor: '#a3742d' }}>P</span>
                      <div>
                        <div className="annot-name">Pita</div>
                        <div className="annot-time">8h ago</div>
                      </div>
                    </div>
                    <div className="annot-body">
                      Reading this alongside ch 3 of Heinrich helps — the &lsquo;starts with&rsquo; is methodologically loaded, not just where the book happens to begin.
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="annot-reply-toggle"
                onClick={(e) => { e.stopPropagation(); setMarginaliaExpanded(x => !x) }}
                aria-expanded={marginaliaExpanded}
              >
                {marginaliaExpanded ? '— Collapse replies' : '↩ 2 replies'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

/* Group surface — vertical flow inside thread page (Brief 1 sub-batch 6 v6).
 *
 * Composition: full-fidelity thread page mockup. Branched-from breadcrumb
 * at top (one-level per live), badges row, pink Lora-bold sans-serif
 * title, author with hashColor avatar, Lora prose body, OP action row
 * with Sprout Branch button, hr, replies stack, sticky bottom main
 * reply input. Conversation graph sidebar at xl: viewports.
 *
 * Default state asymmetric (Mars's Q2 lock):
 *   - Reply 1 (Pita): hover-revealed actions row only
 *   - Reply 2 (Eli): branched-into indicator visible below it
 *   - Reply 3 (Daniel): Reply form open inline below it
 * Branch button on every reply via hover-revealed actions row. Click →
 * inline BranchThreadForm opens. Submit collapses + reveals branched-into
 * indicator (Mars's Q1 lock — match live, no inline child card).
 *
 * No captions, no panel-tag labels, no surface frame copy. Eyebrow only.
 */

function GroupSurface({ sectionRef, reduced }: SurfaceProps) {
  const [branchOpenFor, setBranchOpenFor] = useState<string | null>(null)
  const [branchSubmittedFor, setBranchSubmittedFor] = useState<Set<string>>(new Set())
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>('daniel')
  const [activeReply, setActiveReply] = useState<string | null>(null)

  const onBranchClick = (replyId: string) => {
    setBranchOpenFor(prev => (prev === replyId ? null : replyId))
    setReplyOpenFor(null)
  }
  const onBranchSubmit = (replyId: string) => {
    setBranchOpenFor(null)
    setBranchSubmittedFor(prev => {
      const next = new Set(prev)
      next.add(replyId)
      return next
    })
  }
  const onReplyClick = (replyId: string) => {
    setReplyOpenFor(prev => (prev === replyId ? null : replyId))
    setBranchOpenFor(null)
  }

  const [threadRef, threadVisible] = usePanelVisible(reduced)
  const [sidebarRef, sidebarVisible] = usePanelVisible(reduced)

  return (
    <section
      ref={sectionRef}
      className="welcome-section is-multipanel"
      data-surface="group"
      aria-label="Group"
    >
      <p className="welcome-section-marker text-eyebrow">03 / Group</p>

      <div className="group-thread-grid">
        <div ref={threadRef} className="group-thread" data-visible={threadVisible ? 'true' : 'false'}>
          <a className="group-back-link" role="button" tabIndex={0}>← Back to Threads</a>

          <div className="branched-from-breadcrumb" role="link" tabIndex={0}>
            <p className="branched-from-eyebrow">Branched from</p>
            <p className="branched-from-title">Reading §1 — first impressions</p>
          </div>

          <div className="group-badges-row">
            <span className="group-type-pill" role="button" tabIndex={0}>Discussion</span>
            <span className="group-week-pill" role="button" tabIndex={0}>Week 12: Commodities &amp; Money</span>
          </div>

          <h1 className="group-thread-title">What&rsquo;s confusing in §1?</h1>

          <div className="group-author-row">
            <span className="group-author-avatar" style={{ backgroundColor: '#7a4f9c' }}>L</span>
            <div>
              <div className="group-author-name">Liz</div>
              <div className="group-author-time">2h ago</div>
            </div>
          </div>

          <div className="group-thread-body">
            I keep getting tangled in the &ldquo;two points of view&rdquo; framing — quality and quantity sounds parallel but I don&rsquo;t think it actually is. What am I missing?
          </div>

          <div className="group-op-action-row">
            <button type="button" className="group-branch-button">
              <Sprout size={14} strokeWidth={2} aria-hidden="true" />
              Branch
            </button>
          </div>

          <hr className="group-replies-divider" />

          <div className="group-reply-list">
            {/* Reply 1 — Pita. Default state. */}
            <div
              className={`group-reply${activeReply === 'pita' ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveReply('pita')}
              onMouseLeave={() => setActiveReply(prev => (prev === 'pita' ? null : prev))}
            >
              <div className="group-reply-row">
                <span className="group-reply-avatar" style={{ backgroundColor: '#3f6f4a' }}>P</span>
                <div className="group-reply-content">
                  <div className="group-reply-meta">
                    <span className="group-author-name">Pita</span>
                    <span className="group-author-time">1h</span>
                  </div>
                  <div className="group-reply-body">
                    The two-points-of-view bit is what landed for me. It feels like he&rsquo;s asking us to hold both at once.
                  </div>
                  <div className="group-reply-actions">
                    <button type="button" className="group-reply-action" onClick={() => onReplyClick('pita')}>Reply</button>
                    <button type="button" className="group-reply-action" onClick={() => onBranchClick('pita')}>
                      <Sprout size={12} strokeWidth={2} aria-hidden="true" />
                      Branch
                    </button>
                  </div>
                  {branchOpenFor === 'pita' && (
                    <BranchFormInline
                      replyAuthor="Pita"
                      parentBody="The two-points-of-view bit is what landed for me. It feels like he's asking us to hold both at once."
                      preFilledTitle="Holding both at once"
                      onCancel={() => setBranchOpenFor(null)}
                      onSubmit={() => onBranchSubmit('pita')}
                    />
                  )}
                  {replyOpenFor === 'pita' && (
                    <ReplyFormInline replyAuthor="Pita" onCancel={() => setReplyOpenFor(null)} />
                  )}
                  {branchSubmittedFor.has('pita') && (
                    <BranchedIntoIndicator childTitle="Holding both at once" />
                  )}
                </div>
              </div>
            </div>

            {/* Reply 2 — Eli. Branched-into indicator visible by default. */}
            <div
              className={`group-reply${activeReply === 'eli' ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveReply('eli')}
              onMouseLeave={() => setActiveReply(prev => (prev === 'eli' ? null : prev))}
            >
              <div className="group-reply-row">
                <span className="group-reply-avatar" style={{ backgroundColor: '#a3742d' }}>E</span>
                <div className="group-reply-content">
                  <div className="group-reply-meta">
                    <span className="group-author-name">Eli</span>
                    <span className="group-author-time">45m</span>
                  </div>
                  <div className="group-reply-body">
                    But quality and quantity here aren&rsquo;t parallel. The quantity is what becomes value; the quality only matters for whether it&rsquo;s wanted at all.
                  </div>
                  <div className="group-reply-actions">
                    <button type="button" className="group-reply-action" onClick={() => onReplyClick('eli')}>Reply</button>
                    <button type="button" className="group-reply-action" onClick={() => onBranchClick('eli')}>
                      <Sprout size={12} strokeWidth={2} aria-hidden="true" />
                      Branch
                    </button>
                  </div>
                  <BranchedIntoIndicator childTitle="Quality vs quantity here" />
                  {branchOpenFor === 'eli' && (
                    <BranchFormInline
                      replyAuthor="Eli"
                      parentBody="But quality and quantity here aren't parallel. The quantity is what becomes value; the quality only matters for whether it's wanted at all."
                      preFilledTitle="Eli's distinction"
                      onCancel={() => setBranchOpenFor(null)}
                      onSubmit={() => onBranchSubmit('eli')}
                    />
                  )}
                  {replyOpenFor === 'eli' && (
                    <ReplyFormInline replyAuthor="Eli" onCancel={() => setReplyOpenFor(null)} />
                  )}
                </div>
              </div>
            </div>

            {/* Reply 3 — Daniel. Reply form open by default. */}
            <div
              className={`group-reply${activeReply === 'daniel' ? ' is-active' : ''}`}
              onMouseEnter={() => setActiveReply('daniel')}
              onMouseLeave={() => setActiveReply(prev => (prev === 'daniel' ? null : prev))}
            >
              <div className="group-reply-row">
                <span className="group-reply-avatar" style={{ backgroundColor: '#5b4b8a' }}>D</span>
                <div className="group-reply-content">
                  <div className="group-reply-meta">
                    <span className="group-author-name">Daniel</span>
                    <span className="group-author-time">20m</span>
                  </div>
                  <div className="group-reply-body">
                    I keep thinking about how this connects to commodity fetishism in §4 — the way commodities take on social properties.
                  </div>
                  <div className="group-reply-actions">
                    <button type="button" className="group-reply-action" onClick={() => onReplyClick('daniel')}>Reply</button>
                    <button type="button" className="group-reply-action" onClick={() => onBranchClick('daniel')}>
                      <Sprout size={12} strokeWidth={2} aria-hidden="true" />
                      Branch
                    </button>
                  </div>
                  {replyOpenFor === 'daniel' && (
                    <ReplyFormInline replyAuthor="Daniel" onCancel={() => setReplyOpenFor(null)} />
                  )}
                  {branchOpenFor === 'daniel' && (
                    <BranchFormInline
                      replyAuthor="Daniel"
                      parentBody="I keep thinking about how this connects to commodity fetishism in §4 — the way commodities take on social properties."
                      preFilledTitle="Commodity fetishism connection"
                      onCancel={() => setBranchOpenFor(null)}
                      onSubmit={() => onBranchSubmit('daniel')}
                    />
                  )}
                  {branchSubmittedFor.has('daniel') && (
                    <BranchedIntoIndicator childTitle="Commodity fetishism connection" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky bottom main reply input */}
          <div className="group-main-reply">
            <p className="group-main-reply-context">Replying to thread</p>
            <div className="group-main-reply-row">
              <textarea
                className="group-main-reply-textarea"
                placeholder="Join the conversation… (⌘+Enter to send)"
                rows={1}
              />
              <button type="button" className="group-main-reply-post">Post</button>
            </div>
            <p className="group-main-reply-hint">
              Supports **bold**, *italic*, &gt; blockquotes
            </p>
          </div>
        </div>

        {/* Sidebar — conversation graph, xl: only */}
        <aside ref={sidebarRef} className="group-sidebar" data-visible={sidebarVisible ? 'true' : 'false'}>
          <div className="conversation-graph">
            <p className="conversation-graph-eyebrow">Conversation graph</p>
            <div className="conversation-graph-section">
              <p className="conversation-graph-label">Parent thread</p>
              <a className="conversation-graph-link" role="button" tabIndex={0}>
                ← Reading §1 — first impressions
              </a>
            </div>
            <div className="conversation-graph-section">
              <p className="conversation-graph-label">{1 + branchSubmittedFor.size} {1 + branchSubmittedFor.size === 1 ? 'branch' : 'branches'} from this thread</p>
              <a className="conversation-graph-link" role="button" tabIndex={0}>
                🌱 Quality vs quantity here
              </a>
              {Array.from(branchSubmittedFor).map(id => {
                const titles: Record<string, string> = {
                  'pita': 'Holding both at once',
                  'daniel': 'Commodity fetishism connection',
                }
                if (id === 'eli' || !titles[id]) return null
                return (
                  <a key={id} className="conversation-graph-link" role="button" tabIndex={0}>
                    🌱 {titles[id]}
                  </a>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

/* Inline reply form — opens below a reply when Reply clicked */
function ReplyFormInline({ replyAuthor, onCancel }: { replyAuthor: string; onCancel: () => void }) {
  return (
    <div className="reply-form-inline">
      <span className="replying-to-tag">Replying to {replyAuthor}</span>
      <textarea
        className="reply-form-textarea"
        placeholder={`Reply to ${replyAuthor}…`}
        rows={2}
      />
      <div className="reply-form-actions">
        <button type="button" className="reply-form-post">Post Reply</button>
        <button type="button" className="reply-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

/* Inline branch form — pre-populates with quoted parent body + author
   attribution per live BranchThreadForm. Submit collapses + reveals
   branched-into indicator (Mars's Q1 lock). */
function BranchFormInline({
  replyAuthor,
  parentBody,
  preFilledTitle,
  onCancel,
  onSubmit,
}: {
  replyAuthor: string
  parentBody: string
  preFilledTitle: string
  onCancel: () => void
  onSubmit: () => void
}) {
  const [title, setTitle] = useState(preFilledTitle)
  return (
    <div className="branch-form-inline">
      <p className="branch-form-eyebrow-new">New thread, branched from this</p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="branch-form-title-new"
        style={{ width: '100%', display: 'block' }}
      />
      <div className="branch-form-quoted-new">
        &ldquo;{parentBody}&rdquo;
        <p className="branch-form-attribution">— {replyAuthor}</p>
      </div>
      <div className="branch-form-actions-new">
        <button type="button" className="reply-form-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="branch-form-create" onClick={onSubmit}>Create thread</button>
      </div>
    </div>
  )
}

/* Branched-into indicator — small link below a reply, matches live's
   per-reply branched-into rendering. */
function BranchedIntoIndicator({ childTitle }: { childTitle: string }) {
  return (
    <div className="branched-into-indicator" role="link" tabIndex={0}>
      <Sprout size={12} strokeWidth={2} aria-hidden="true" />
      <span>branched into <span className="child-title">{childTitle}</span></span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Personal surface — journal editor, interactive Reference modal.
 * ───────────────────────────────────────────────────────────────── */

type PersonalPromptStep = 'reference' | 'expand' | 'insert' | 'done'

function PersonalSurface({ sectionRef, active, reduced }: SurfaceProps) {
  const [step, setStep] = useState<PersonalPromptStep>('reference')
  const [bodyTextShown, setBodyTextShown] = useState(false)
  const [referenceModalOpen, setReferenceModalOpen] = useState(false)
  const [resultExpanded, setResultExpanded] = useState(false)
  const [quoteInserted, setQuoteInserted] = useState(false)

  // Ambient: title + body type in on section visible
  useEffect(() => {
    if (!active || reduced) {
      if (reduced) setBodyTextShown(true)
      return
    }
    const t = setTimeout(() => setBodyTextShown(true), 800)
    return () => clearTimeout(t)
  }, [active, reduced])

  const onReferenceClick = useCallback(() => {
    setReferenceModalOpen(true)
    setStep(s => s === 'reference' ? 'expand' : s)
  }, [])

  const onResultClick = useCallback(() => {
    setResultExpanded(true)
    setStep(s => s === 'expand' ? 'insert' : s)
  }, [])

  const onInsertQuote = useCallback(() => {
    setQuoteInserted(true)
    setReferenceModalOpen(false)
    setResultExpanded(false)
    setStep('done')
  }, [])

  const onCloseModal = useCallback(() => {
    setReferenceModalOpen(false)
    setResultExpanded(false)
  }, [])

  const promptText = {
    reference: 'Click Reference to pull a passage from your reading',
    expand: 'Click a passage to expand it',
    insert: 'Click Insert quote',
    done: 'Private space, your thinking, autosaved',
  }

  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="personal"
      aria-label="Personal"
    >
      <p className="welcome-section-marker text-eyebrow">04 / Personal</p>

      <div className="welcome-visual">
        <div className="welcome-mockup personal-mockup mx-auto">
          <p className="mockup-example-tag text-eyebrow">Example</p>

          <p className="personal-back-link">← Back to journal</p>

          <div className="personal-header-row">
            <p className="personal-eyebrow">New entry · Private</p>
            {/* Lock pill — v1 Bucket 2 styling kept per Mars's P1 lock,
                top-right placement per status-indicator framing. Mars
                handling separate live catch-up. */}
            <span className="personal-lock-pill" aria-label="Privacy">
              <Lock size={12} strokeWidth={2} aria-hidden="true" />
              Only you
            </span>
          </div>

          <div className="personal-title-input">
            Reading the value-form section.
          </div>

          <div className="personal-toolbar">
            <button type="button" className="toolbar-btn"><strong>B</strong></button>
            <button type="button" className="toolbar-btn"><em>I</em></button>
            <span className="toolbar-divider" />
            <button type="button" className="toolbar-btn">H1</button>
            <button type="button" className="toolbar-btn">&ldquo; &rdquo;</button>
            <span className="toolbar-divider" />
            <button
              type="button"
              className="toolbar-btn"
              onClick={onReferenceClick}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--accent-purple)' }}
            >
              <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
              Reference
            </button>
            <span className="toolbar-spacer" />
            <span className="toolbar-save">
              <Cloud size={12} strokeWidth={2} aria-hidden="true" />
              Saved at 14:32
            </span>
            <span className="toolbar-divider" />
            <span className="toolbar-wordcount">147 words</span>
          </div>

          <div className="personal-body">
            <span className="personal-body-text" data-shown={bodyTextShown ? 'true' : 'false'}>
              I keep getting tangled in the relative form. Marx says the linen expresses its value in coats, but my brain keeps flipping which is which. The relative form makes value visible only by being measured against something else — that&rsquo;s the move I think.
              {quoteInserted && (
                <span className="reference-quote-inserted" data-shown="true">
                  &ldquo;Every useful thing, as iron, paper, etc., may be looked at from the two points of view of quality and quantity.&rdquo;
                  <br />
                  <span className="reference-cite">— Capital, Vol I, Chapter 1, Section 1</span>
                </span>
              )}
            </span>
          </div>

          {/* Reference modal — overlays the mockup */}
          <div
            className="reference-modal-backdrop"
            data-open={referenceModalOpen ? 'true' : 'false'}
            onClick={onCloseModal}
          >
            <div className="reference-modal" onClick={(e) => e.stopPropagation()}>
              <div className="reference-modal-header">
                <span className="reference-modal-title">Reference a passage</span>
                <button
                  type="button"
                  onClick={onCloseModal}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="reference-modal-body">
                <input
                  type="search"
                  className="reference-modal-search"
                  defaultValue="quality and quantity"
                  placeholder="Search Capital — try 'use-value', 'commodity', 'fetishism'…"
                />
                <div
                  className="reference-result"
                  data-expanded={resultExpanded ? 'true' : 'false'}
                  onClick={onResultClick}
                >
                  <p className="reference-result-eyebrow">Chapter 1, Section 1</p>
                  <p className="reference-result-text">
                    Every useful thing, as iron, paper, etc., may be looked at from the two points of view of <span className="reference-highlight">quality and quantity</span>. Every such thing is a whole composed of many properties.
                  </p>
                  <div className="reference-result-actions">
                    <button
                      type="button"
                      className="reference-action-secondary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Insert link only
                    </button>
                    <button
                      type="button"
                      className="reference-action-primary"
                      onClick={(e) => { e.stopPropagation(); onInsertQuote() }}
                    >
                      Insert quote
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className={`beat-label${step !== 'done' ? ' prompt' : ''}`}>
          {promptText[step]}
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────
 * Dashboard surface — fully ambient composition.
 * Header + HeroQuoteCallout + AttentionMagnitudeBars + WhereStuckWidget.
 * ───────────────────────────────────────────────────────────────── */

interface DashboardProps extends SurfaceProps {
  sessionDayPlural: string | null
  groupName: string
  heroName: string
}

function DashboardSurface({
  sectionRef,
  active,
  reduced,
  sessionDayPlural,
  groupName,
  heroName,
}: DashboardProps) {
  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="dashboard"
      aria-label="Dashboard"
    >
      <p className="welcome-section-marker text-eyebrow">05 / Dashboard</p>

      <div
        className="welcome-visual"
        data-ds-active={active && !reduced ? 'true' : 'false'}
      >
        <div className="welcome-mockup dashboard-mockup mx-auto">
          <p className="mockup-example-tag text-eyebrow">Example</p>

          {/* DashboardHeader — matches live */}
          <div className="dashboard-header">
            <p className="dashboard-greeting">Good evening, {heroName}</p>
            <p className="dashboard-group-name">{groupName}</p>
          </div>
          <p className="dashboard-orientation">
            Week 12 &middot; Week 3 on Chapter 1, §4
            {sessionDayPlural ? ` · Next session ${sessionDayPlural.replace(/s$/, '')} 7pm` : ''}
          </p>

          {/* HeroQuoteCallout — matches live */}
          <div className="hero-quote-section">
            <p className="hero-quote-eyebrow">
              <span className="hero-quote-dot" />
              The group is thinking about{' '}
              <span className="hero-quote-this-week">this week</span>
            </p>
            <blockquote className="hero-quote">
              &ldquo;A commodity appears, at first sight, a very trivial thing, and easily understood. Its analysis shows that it is, in reality, a very queer thing.&rdquo;
            </blockquote>
            <div className="hero-quote-actions">
              <span className="hero-quote-cta">Read the conversation →</span>
              <span className="hero-quote-meta">
                7 annotations &middot; Ch 1 §4 &middot; last reply 2h ago by Liz
              </span>
            </div>
          </div>

          {/* AttentionMagnitudeBars — matches live */}
          <div className="attention-section">
            <div className="attention-header">
              <h2 className="attention-h2">Where the group&rsquo;s attention is</h2>
              <span className="attention-link">Read &amp; annotate →</span>
            </div>
            <p className="attention-subtitle">
              38 annotations across 6 sections &middot; Capital Vol 1, Ch 1
            </p>
            <ul className="attention-list">
              {[
                { count: 14, label: '§1', title: 'The Two Factors of a Commodity', target: '100%', today: 2, yours: 4 },
                { count: 11, label: '§4', title: 'The Fetishism of Commodities', target: '78%', today: 1, yours: 3 },
                { count: 6, label: '§2', title: 'The Two-fold Character of Labour', target: '42%', today: 0, yours: 1 },
                { count: 3, label: '§3', title: 'The Form of Value', target: '21%', today: 0, yours: 0 },
                { count: 2, label: '§5', title: 'Exchange', target: '14%', today: 0, yours: 0 },
                { count: 0, label: '§6', title: 'The Money Form', target: '0%', today: 0, yours: 0 },
              ].map(row => (
                <li key={row.label} className="attention-row">
                  <div className="attention-row-top">
                    <span
                      className="attention-count"
                      data-zero={row.count === 0 ? 'true' : 'false'}
                    >
                      {row.count}
                    </span>
                    <span className="attention-section-label">{row.label}</span>
                    <span className="attention-title">{row.title}</span>
                    {row.today > 0 && (
                      <span className="attention-today-tag">+{row.today} today</span>
                    )}
                    {row.yours > 0 && (
                      <span className="attention-yours">{row.yours} yours</span>
                    )}
                  </div>
                  <div className="attention-bar-track">
                    <div
                      className="attention-bar"
                      style={{ ['--bar-target' as string]: row.target } as React.CSSProperties}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* WhereStuckWidget — matches live. Bridge from Reading
              surface confusion to "Bring to Tuesday" framing per
              Mars's reaction (replaces the cut confusion-as-agenda
              morph). */}
          <div className="stuck-section">
            <p className="stuck-eyebrow">Where we&rsquo;re stuck</p>
            <div className="stuck-header">
              <p className="stuck-count-line">3 paragraphs flagged in this chapter</p>
              <span className="stuck-link">Bring to Tuesday →</span>
            </div>
            <ul className="stuck-list">
              <li className="stuck-item">
                <div className="stuck-item-top">
                  <span className="stuck-ref">Ch 1, §1, ¶7</span>
                  <span className="stuck-flag-count">
                    5 <Flag size={11} strokeWidth={2} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                  </span>
                </div>
                <p className="stuck-excerpt">
                  &ldquo;Every useful thing, as iron, paper, etc., may be looked at from the two points of view of quality and quantity…&rdquo;
                </p>
              </li>
              <li className="stuck-item">
                <div className="stuck-item-top">
                  <span className="stuck-ref">Ch 1, §3, ¶12</span>
                  <span className="stuck-flag-count">
                    3 <Flag size={11} strokeWidth={2} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                  </span>
                </div>
                <p className="stuck-excerpt">
                  &ldquo;The relative form of value of one commodity, the linen, expresses…&rdquo;
                </p>
              </li>
              <li className="stuck-item">
                <div className="stuck-item-top">
                  <span className="stuck-ref">Ch 1, §4, ¶3</span>
                  <span className="stuck-flag-count">
                    2 <Flag size={11} strokeWidth={2} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                  </span>
                </div>
                <p className="stuck-excerpt">
                  &ldquo;The mystical character of commodities does not arise from their use-value…&rdquo;
                </p>
              </li>
            </ul>
          </div>
        </div>

        <p className="beat-label">
          This is where everything you&rsquo;ve seen comes together
        </p>
      </div>
    </section>
  )
}
