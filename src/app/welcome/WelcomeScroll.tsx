'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
 * Pending external touch-up (Cowork C platform-wide chrome audit):
 *   - Audio playback may move into a roaming tools affordance
 *   - Emoji button labels (🌱 Branch, 📝 Annotate, 🚩 flag) → lucide-react swaps
 *   - Privacy treatment on Personal surface may shift
 *   Build against current live; touch-up pass after Cowork C lands.
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
        scroll-snap-type: y proximity;
        overflow-y: auto;
        height: 100vh;
      }
      .welcome-section {
        min-height: 100vh;
        scroll-snap-align: start;
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

      /* ── Reduced-motion override ──────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        .welcome-scroll { scroll-snap-type: none; }
        .welcome-section,
        .welcome-section .welcome-visual {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
        .opener-stagger > * { opacity: 1 !important; transform: none !important; transition: none !important; }
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

type ReadingPromptStep = 'glossary' | 'flag' | 'audio' | 'select' | 'done'

function ReadingSurface({ sectionRef, active, reduced }: SurfaceProps) {
  // Interactive prompt sequence — advances when each gesture is performed
  const [step, setStep] = useState<ReadingPromptStep>('glossary')

  // Per-gesture state
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const [confusionPopoverOpen, setConfusionPopoverOpen] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [selectionActionBarOpen, setSelectionActionBarOpen] = useState(false)
  const [marginaliaShown, setMarginaliaShown] = useState(false)
  // SSR-safe mobile detection — false on first paint (matches server),
  // updates via useEffect after mount. Avoids hydration mismatch.
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(hover: none)')
    setIsCoarsePointer(m.matches)
    const handler = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches)
    m.addEventListener('change', handler)
    return () => m.removeEventListener('change', handler)
  }, [])

  // Ambient confusion intensity — runs independently of interactive
  // prompts (per Mars's flag: ambient + interactive don't interfere).
  // Hand-tuned irregular-rhythm arrivals, looping with a pause.
  const [confusionCount, setConfusionCount] = useState(0)
  const arrivals = [250, 350, 500, 1200, 1400, 2200, 2900]

  useEffect(() => {
    if (!active || reduced) {
      if (reduced) setConfusionCount(7)
      return
    }
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const runCycle = () => {
      setConfusionCount(0)
      arrivals.forEach((delay, i) => {
        const t = setTimeout(() => setConfusionCount(i + 1), delay)
        timeouts.push(t)
      })
      const restart = setTimeout(runCycle, 7500)
      timeouts.push(restart)
    }

    runCycle()
    return () => timeouts.forEach(clearTimeout)
  }, [active, reduced])

  // Map confusion count to intensity class
  const intensity =
    confusionCount === 0 ? '0' :
    confusionCount <= 2 ? 'low' :
    confusionCount <= 5 ? 'mid' : 'high'

  // Gesture handlers — each advances the step on first invocation
  const onGlossaryEnter = useCallback(() => {
    setGlossaryOpen(true)
    setStep(s => s === 'glossary' ? 'flag' : s)
  }, [])
  const onGlossaryLeave = useCallback(() => setGlossaryOpen(false), [])

  const onFlagClick = useCallback(() => {
    setConfusionPopoverOpen(true)
    setStep(s => s === 'flag' ? 'audio' : s)
  }, [])
  const onConfusionPopoverClose = useCallback(() => setConfusionPopoverOpen(false), [])

  const onAudioToggle = useCallback(() => {
    setAudioPlaying(p => !p)
    setStep(s => s === 'audio' ? 'select' : s)
  }, [])

  // Selection gesture — listen for selectionchange within the body
  const bodyRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!active || reduced) return

    // Mobile fallback: any tap on a paragraph triggers the selection
    // action bar (single-tap accuracy loss accepted per R3 lock).
    // Desktop: window.getSelection() check on selectionchange.
    const handleSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      if (sel.isCollapsed) return
      // Check selection is within bodyRef
      if (bodyRef.current && bodyRef.current.contains(range.commonAncestorContainer)) {
        setSelectionActionBarOpen(true)
        setStep(s => s === 'select' ? 'done' : s)
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [active, reduced])

  // Mobile single-tap fallback — paragraph onClick
  const onParagraphTap = useCallback(() => {
    if (isCoarsePointer) {
      setSelectionActionBarOpen(true)
      setStep(s => s === 'select' ? 'done' : s)
    }
  }, [isCoarsePointer])

  const onAnnotateClick = useCallback(() => {
    setSelectionActionBarOpen(false)
    setMarginaliaShown(true)
  }, [])

  const onGiveOwnSpaceClick = useCallback(() => {
    // Mock — closes the bar; the real platform routes to /threads/new
    setSelectionActionBarOpen(false)
  }, [])

  const promptText = {
    glossary: 'Hover the highlighted term to see the glossary',
    flag: 'Click the flag to see who else is stuck here',
    audio: 'Click play to listen along',
    select: isCoarsePointer
      ? 'Tap a passage to leave marginalia'
      : 'Highlight a passage to leave marginalia',
    done: 'You can also pull a passage straight into a thread',
  }

  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="reading"
      aria-label="Reading"
    >
      <p className="welcome-section-marker text-eyebrow">02 / Reading</p>

      <div className="welcome-visual">
        <div className="welcome-mockup reading-mockup mx-auto">
          <p className="mockup-example-tag text-eyebrow">Example</p>

          <p className="reading-breadcrumb">
            <span style={{ color: 'var(--accent-red)' }}>Reading</span>
            <span>›</span>
            <span style={{ color: 'var(--accent-red)' }}>Capital, Vol I</span>
            <span>›</span>
            <span style={{ color: 'var(--text-primary)' }}>Chapter 1, Section 1</span>
          </p>

          <div className="reading-chrome-header">
            <p className="reading-chrome-eyebrow">01 / Chapter 1, §1 · ~11 Min Read</p>
            <h1 className="reading-chapter-title">The Two Factors of a Commodity</h1>
            <p className="reading-chapter-subtitle">Use-value and value</p>
            <div className="reading-chrome-rule" />
          </div>

          <div className="reading-body" ref={bodyRef}>
            <div className="reading-paragraph" onClick={onParagraphTap}>
              <p>
                The wealth of those societies in which the capitalist mode of production prevails, presents itself as &ldquo;an immense accumulation of commodities,&rdquo; its unit being a single commodity.
              </p>
              <div className="marginalia-card" data-shown={marginaliaShown ? 'true' : 'false'}>
                <div className="marginalia-name">You</div>
                <div className="marginalia-body">The &lsquo;immense&rsquo; is doing work here.</div>
              </div>
            </div>

            <div className="reading-paragraph" onClick={onParagraphTap}>
              <p>
                Our investigation must therefore begin with the analysis of a{' '}
                <span
                  className="glossary-term"
                  onMouseEnter={onGlossaryEnter}
                  onMouseLeave={onGlossaryLeave}
                  onClick={(e) => { e.stopPropagation(); onGlossaryEnter() }}
                >
                  commodity
                  <span className="glossary-popover" data-open={glossaryOpen ? 'true' : 'false'}>
                    <p className="glossary-popover-eyebrow">Glossary · Introduced Week 1</p>
                    <p className="glossary-popover-term">commodity</p>
                    <p className="glossary-popover-def">
                      An external object whose properties satisfy human wants of some sort. For Marx, the elementary form in which capitalist wealth presents itself.
                    </p>
                    <p className="glossary-popover-related-eyebrow">Related terms</p>
                    <p className="glossary-popover-related">
                      <span>use-value</span> &middot; <span>exchange-value</span> &middot; <span>value</span>
                    </p>
                    <div className="glossary-popover-footer">
                      <span>Edited by 3 members</span>
                      <span className="open-full">Open full entry →</span>
                    </div>
                  </span>
                </span>
                .
              </p>
            </div>

            <div className="reading-paragraph" onClick={onParagraphTap}>
              <p>
                Every useful thing, as iron, paper, etc., may be looked at from the two points of view of quality and quantity. Every such thing is a whole composed of many properties.
              </p>
              <button
                type="button"
                className="confusion-flag-button"
                data-intensity={intensity}
                onClick={onFlagClick}
                aria-label="Open confusion details"
              >
                ?
              </button>
              <div className="confusion-popover" data-open={confusionPopoverOpen ? 'true' : 'false'}>
                <p className="confusion-popover-eyebrow">This passage is confusing</p>
                <p className="confusion-popover-headline">
                  {confusionCount === 0
                    ? 'Nobody has flagged this yet.'
                    : `${confusionCount} ${confusionCount === 1 ? 'person has' : 'people have'} flagged this paragraph`}
                </p>
                <p className="confusion-popover-explainer">
                  Flags are anonymous. Nobody sees who flagged what, only how many.
                </p>
                <div className="confusion-popover-action">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ color: 'var(--accent-amber)' }}>⚑</span>
                    I&rsquo;m also stuck here
                  </span>
                  <span className="anonymous-tag">Anonymous</span>
                </div>
                <button type="button" className="confusion-popover-cta" onClick={onConfusionPopoverClose}>
                  Start thinking together
                </button>
              </div>
            </div>

            {/* Selection action bar — appears on text selection within
                the body. Two buttons: Annotate · Give this its own space.
                Live SelectionActionBar wording preserved. */}
            <div
              className="selection-action-bar"
              data-open={selectionActionBarOpen ? 'true' : 'false'}
              style={{ left: '50%', transform: 'translateX(-50%)', top: '0.5rem' }}
            >
              <button type="button" onClick={onAnnotateClick}>Annotate</button>
              <button type="button" onClick={onGiveOwnSpaceClick}>Give this its own space</button>
            </div>
          </div>

          <div className="reading-audio-player">
            <span className="audio-skip">15s ◁</span>
            <button
              type="button"
              className="audio-play-btn"
              data-playing={audioPlaying ? 'true' : 'false'}
              onClick={onAudioToggle}
              aria-label={audioPlaying ? 'Pause' : 'Play'}
            >
              {audioPlaying ? '⏸' : '▶'}
            </button>
            <span className="audio-skip">▷ 15s</span>
            <span className="audio-track">
              <span
                className="audio-fill"
                style={{ width: audioPlaying ? '35%' : '0%' }}
              />
            </span>
            <span className="audio-time">0:42 / 11:32</span>
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
 * Group surface — thread view, interactive branching gesture.
 * ───────────────────────────────────────────────────────────────── */

type GroupPromptStep = 'open' | 'submit' | 'done'

function GroupSurface({ sectionRef, active, reduced }: SurfaceProps) {
  const [step, setStep] = useState<GroupPromptStep>('open')
  const [branchFormOpen, setBranchFormOpen] = useState(false)
  const [childThreadShown, setChildThreadShown] = useState(false)

  useEffect(() => {
    if (reduced) {
      setBranchFormOpen(true)
      setChildThreadShown(true)
      setStep('done')
    }
  }, [reduced])

  const onBranchClick = useCallback(() => {
    setBranchFormOpen(true)
    setStep(s => s === 'open' ? 'submit' : s)
  }, [])

  const onSubmitBranch = useCallback(() => {
    setChildThreadShown(true)
    setStep('done')
  }, [])

  const onCancelBranch = useCallback(() => {
    setBranchFormOpen(false)
    setStep('open')
  }, [])

  const promptText = {
    open: 'Click 🌱 Branch on a reply to spawn a new thread',
    submit: 'Click Submit — the new thread keeps the lineage',
    done: 'Lineage stays visible',
  }

  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="group"
      aria-label="Group"
    >
      <p className="welcome-section-marker text-eyebrow">03 / Group</p>

      <div className="welcome-visual">
        <div className="welcome-mockup group-mockup mx-auto">
          <p className="mockup-example-tag text-eyebrow">Example</p>

          <p className="group-back-link">← Back to Threads</p>

          <div className="group-badges">
            <span className="thread-type-badge">Discussion</span>
            <span className="thread-week-pill">Week 12</span>
          </div>

          <h1 className="group-title">What&rsquo;s confusing in §1?</h1>

          <div className="group-author-row">
            <span
              className="author-avatar"
              style={{ backgroundColor: '#7a4f9c' }}
            >L</span>
            <div>
              <div className="author-name">Liz</div>
              <div className="author-time">2h ago</div>
            </div>
          </div>

          <div className="group-body">
            I keep getting tangled in the &ldquo;two points of view&rdquo; framing. Quality vs quantity sounds parallel but I don&rsquo;t think it is — what am I missing?
          </div>

          <div className="group-action-row">
            <button type="button" className="branch-button">🌱 Branch</button>
          </div>

          <hr className="group-replies-divider" />

          <div className="group-reply">
            <span
              className="author-avatar"
              style={{ backgroundColor: '#3f6f4a' }}
            >P</span>
            <div className="group-reply-content">
              <div className="group-reply-meta">
                <span className="author-name">Pita</span>
                <span className="author-time">1h</span>
              </div>
              <div className="group-reply-body">
                The two-points-of-view bit is what landed for me. It feels like he&rsquo;s asking us to hold both at once.
              </div>
            </div>
          </div>

          <div className="group-reply">
            <span
              className="author-avatar"
              style={{ backgroundColor: '#a3742d' }}
            >E</span>
            <div className="group-reply-content">
              <div className="group-reply-meta">
                <span className="author-name">Eli</span>
                <span className="author-time">45m</span>
              </div>
              <div className="group-reply-body">
                But quality and quantity here aren&rsquo;t parallel. The quantity is what becomes value, the quality only matters for whether it&rsquo;s wanted at all.
              </div>
              <div className="group-reply-actions">
                <button
                  type="button"
                  className="branch-button"
                  onClick={onBranchClick}
                >
                  🌱 Branch
                </button>
              </div>

              {/* BranchThreadForm — opens inline below the reply.
                  Pre-populated title + quoted body per Mars's G2 lock. */}
              <div className="branch-form" data-open={branchFormOpen ? 'true' : 'false'}>
                <p className="branch-form-eyebrow">New thread, branched from this</p>
                <div className="branch-form-title">
                  Quality vs quantity here
                </div>
                <div className="branch-form-quoted">
                  &ldquo;The quantity is what becomes value, the quality only matters for whether it&rsquo;s wanted at all.&rdquo;
                  <br />
                  — Eli
                </div>
                <div className="branch-form-actions">
                  <button type="button" className="branch-form-cancel" onClick={onCancelBranch}>
                    Cancel
                  </button>
                  <button type="button" className="branch-form-submit" onClick={onSubmitBranch}>
                    Create thread
                  </button>
                </div>
              </div>

              {/* Child thread result — appears post-submit */}
              <div className="child-thread-result" data-shown={childThreadShown ? 'true' : 'false'}>
                <p className="child-thread-lineage">← Branched from &lsquo;What&rsquo;s confusing in §1?&rsquo;</p>
                <p className="child-thread-title">Quality vs quantity here</p>
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
              <span aria-hidden="true">🔒</span>
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
            <button type="button" className="toolbar-btn" onClick={onReferenceClick}>
              📖 Reference
            </button>
            <span className="toolbar-spacer" />
            <span className="toolbar-save">
              <span aria-hidden="true">☁</span> Saved at 14:32
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
                  <span className="stuck-flag-count">5 ⚑</span>
                </div>
                <p className="stuck-excerpt">
                  &ldquo;Every useful thing, as iron, paper, etc., may be looked at from the two points of view of quality and quantity…&rdquo;
                </p>
              </li>
              <li className="stuck-item">
                <div className="stuck-item-top">
                  <span className="stuck-ref">Ch 1, §3, ¶12</span>
                  <span className="stuck-flag-count">3 ⚑</span>
                </div>
                <p className="stuck-excerpt">
                  &ldquo;The relative form of value of one commodity, the linen, expresses…&rdquo;
                </p>
              </li>
              <li className="stuck-item">
                <div className="stuck-item-top">
                  <span className="stuck-ref">Ch 1, §4, ¶3</span>
                  <span className="stuck-flag-count">2 ⚑</span>
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
