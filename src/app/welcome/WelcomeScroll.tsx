'use client'

import { useEffect, useRef, useState } from 'react'
import { completeOnboarding } from './actions'

/**
 * WelcomeScroll v2 — surfaces, not sections.
 *
 * Brief 1 sub-batch 6 redesign (post-V3-V6 diagnosis from Mars). Six
 * sections, four of them platform surfaces with CSS-and-state-driven
 * animated mockups, bookended by an opener and a CTA.
 *
 * Frame:
 *   1. Opener            recognition only, no platform motion
 *   2. Reading surface   chapter view + 5 capability beats
 *   3. Group surface     thread view + 2 capability beats
 *   4. Personal surface  journal editor + 1 extended motion (3 labels)
 *   5. Dashboard         landing surface + 2 hero beats + ambient
 *   6. CTA               minimal, dashboard precedes it as the visual
 *
 * Pedagogy:
 *   - Mockup IS the platform doing something — anchored, not floating
 *   - Words name what was just shown, don't describe what to imagine
 *   - Irregular-rhythm motion conveys multiple actors without naming
 *     them (confusion counter on Reading; magnitude bars on Dashboard)
 *   - Gesture parity across surfaces: highlight-and-branch motion is
 *     visually identical between Group (thread → child thread) and
 *     Personal (journal → thread). Same affordance, same animation
 *     curve, same arrival direction. Label "the same move, made public"
 *     names it explicitly when it happens
 *   - Two deliberate absence-moments held in framing:
 *       (a) Group surface — thread reply with no like button
 *       (b) Dashboard — widgets without streak counters / notification
 *           badges / progress percentages
 *     Calm-technology taught through what's missing, not declared
 *
 * Quality > implementation ease (Mars's lock):
 *   - Confusion counter uses React state + setTimeout sequence with
 *     hand-tuned non-uniform intervals — arrivals at 250/350/500ms
 *     (initial cluster), pause, 1200/1400ms (sympathetic cluster),
 *     pause, 2200/2900ms (gradual final additions). Pattern reflects
 *     a real social dynamic (first noticer, sympathetic chime-ins,
 *     considered additions). CSS keyframes were the lighter option;
 *     setTimeout chosen for the rhythm freedom and pause control
 *   - Magnitude-bar fills use CSS keyframes with non-uniform
 *     animation-delay per bar — §1 starts at 0s, §4 at 0.3s, §5 at
 *     0.5s overlapping §4, §2 at 0.7s, §3 at 1.2s. Same multi-actor
 *     read through the texture of the unfolding
 *
 * Mobile parity:
 *   - Each mockup uses a max-width that compresses cleanly under 600px
 *   - Reading surface: narrow column natively
 *   - Dashboard mockup: stacked widgets at <640px, side-by-side above
 *
 * prefers-reduced-motion:
 *   - All animations disabled, mockups display in their final/visible
 *     state from first paint
 *   - Loop intervals don't run; static mockups show counter at 7,
 *     bars filled, popovers open, etc.
 */

interface Props {
  displayName: string | null
  groupName: string
  /** "Tuesdays" / "Wednesdays" / etc. or null when host hasn't set
   *  next_session_at. Used by section 5's rhythm strip to highlight
   *  the recurring meeting day. When null, rhythm strip uses a
   *  generic "we meet weekly" frame without a specific day. */
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
  // sequences (counter on Reading, label cycles, etc).
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
      // All sections rendered visible from first paint, no observer
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

        /* ── Opener stagger ─────────────────────────────────────── */
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

        /* ── Mockup container ───────────────────────────────────── */
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
        }

        /* ── Reading surface ────────────────────────────────────── */
        .reading-mockup { max-width: 36rem; padding: 1.25rem; }
        .reading-eyebrow { color: var(--text-secondary); }
        .reading-body p {
          font-family: 'Lora', Georgia, serif;
          color: var(--text-primary);
          line-height: 1.8;
          font-size: 0.95rem;
          margin: 0;
          padding: 0.5rem 0;
        }
        .reading-paragraph {
          position: relative;
        }

        /* Marginalia card — fades in next to the line */
        .marginalia-card {
          position: absolute;
          top: 0;
          right: -8.5rem;
          width: 8rem;
          background-color: rgba(var(--accent-purple-rgb), 0.06);
          border-left: 2px solid var(--accent-purple);
          padding: 0.5rem 0.625rem;
          border-radius: 0.25rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          line-height: 1.4;
          opacity: 0;
          transform: translateX(-4px);
        }
        [data-rs-active="true"] .marginalia-card {
          animation: marginalia-fade 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes marginalia-fade {
          0%, 5% { opacity: 0; transform: translateX(-4px); }
          12%, 90% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-4px); }
        }
        .marginalia-name {
          color: var(--accent-purple);
          font-weight: 600;
          font-size: 0.6875rem;
          margin-bottom: 0.125rem;
        }
        .marginalia-body { color: var(--text-primary); }

        /* Reply card — slides under the marginalia */
        .reply-card {
          position: absolute;
          top: 3.25rem;
          right: -8.5rem;
          width: 8rem;
          background-color: rgba(var(--accent-purple-rgb), 0.04);
          border-left: 2px solid rgba(var(--accent-purple-rgb), 0.6);
          padding: 0.5rem 0.625rem;
          border-radius: 0.25rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          line-height: 1.4;
          opacity: 0;
          transform: translateY(-6px);
        }
        [data-rs-active="true"] .reply-card {
          animation: reply-slide 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes reply-slide {
          0%, 16% { opacity: 0; transform: translateY(-6px); }
          22%, 90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }

        /* Glossary tooltip — underline draws, popover opens */
        .glossary-term {
          position: relative;
          display: inline;
          background-image: linear-gradient(to right, var(--accent-purple), var(--accent-purple));
          background-size: 0% 1.5px;
          background-repeat: no-repeat;
          background-position: 0 100%;
          padding-bottom: 1px;
        }
        [data-rs-active="true"] .glossary-term {
          animation: glossary-underline 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes glossary-underline {
          0%, 28% { background-size: 0% 1.5px; }
          32%, 90% { background-size: 100% 1.5px; }
          100% { background-size: 0% 1.5px; }
        }
        .glossary-popover {
          position: absolute;
          top: -5.5rem;
          left: 50%;
          transform: translateX(-50%) scale(0.95);
          width: 14rem;
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border-subtle);
          border-radius: 0.375rem;
          padding: 0.625rem 0.75rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          line-height: 1.4;
          opacity: 0;
          z-index: 5;
        }
        [data-rs-active="true"] .glossary-popover {
          animation: glossary-pop 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes glossary-pop {
          0%, 35% { opacity: 0; transform: translateX(-50%) scale(0.95); }
          42%, 88% { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) scale(0.95); }
        }
        .glossary-popover-term { font-weight: 600; color: var(--text-primary); }
        .glossary-popover-def { color: var(--text-secondary); margin-top: 0.25rem; }

        /* Confusion counter — irregular climb driven by React state */
        .confusion-flag {
          position: absolute;
          top: 0.25rem;
          right: -2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.125rem;
          font-family: 'Inter', sans-serif;
          opacity: 0;
        }
        [data-rs-active="true"] .confusion-flag {
          animation: confusion-fade-in 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes confusion-fade-in {
          0%, 38% { opacity: 0; }
          42%, 92% { opacity: 1; }
          100% { opacity: 0; }
        }
        .confusion-icon {
          width: 0.875rem;
          height: 0.875rem;
          border-radius: 0.125rem;
          background-color: rgba(var(--accent-red-rgb), 0.15);
          border: 1px solid var(--accent-red);
        }
        .confusion-count {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-red);
          transition: transform 80ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        }
        .confusion-count.bumped { transform: scale(1.25); }

        /* Audio scrubber */
        .audio-player {
          margin-top: 0.75rem;
          padding: 0.5rem 0.75rem;
          background-color: var(--bg-page);
          border-radius: 0.375rem;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .audio-play {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          background-color: var(--accent-purple);
          color: var(--text-inverse);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
        }
        .audio-track {
          flex: 1;
          height: 2px;
          background-color: rgba(var(--accent-purple-rgb), 0.2);
          border-radius: 1px;
          overflow: hidden;
        }
        .audio-fill {
          height: 100%;
          background-color: var(--accent-purple);
          width: 0;
        }
        [data-rs-active="true"] .audio-fill {
          animation: audio-fill 7s linear infinite;
        }
        @keyframes audio-fill {
          0%, 70% { width: 0; }
          78% { width: 5%; }
          88% { width: 35%; }
          92% { width: 60%; }
          100% { width: 60%; }
        }

        /* ── Group surface ──────────────────────────────────────── */
        .group-mockup { max-width: 36rem; padding: 1.25rem; }
        .group-thread-quote {
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
          color: var(--text-primary);
          font-size: 0.875rem;
          line-height: 1.5;
          padding: 0.5rem 0.75rem;
          border-left: 3px solid var(--accent-purple);
          background-color: rgba(var(--accent-purple-rgb), 0.04);
          border-radius: 0 0.25rem 0.25rem 0;
          margin-bottom: 0.75rem;
        }
        .group-thread-title {
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
          color: var(--text-primary);
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
          opacity: 0;
          transform: translateY(-4px);
        }
        [data-gs-active="true"] .group-thread-title {
          animation: group-title-in 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes group-title-in {
          0%, 14% { opacity: 0; transform: translateY(-4px); }
          22%, 95% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .group-confusion-source {
          opacity: 0;
        }
        [data-gs-active="true"] .group-confusion-source {
          animation: group-source-fade 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes group-source-fade {
          0%, 5% { opacity: 0; }
          8%, 18% { opacity: 1; }
          22%, 100% { opacity: 0; }
        }
        .group-reply {
          padding: 0.625rem 0.75rem;
          margin-top: 0.5rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          line-height: 1.45;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-subtle);
          position: relative;
        }
        .group-reply:last-child { border-bottom: none; }
        .group-reply-meta {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }
        /* Highlight-and-branch motion */
        .group-reply-highlight {
          background-color: rgba(var(--accent-red-rgb), 0);
          padding: 0 2px;
          border-radius: 2px;
          transition: background-color 200ms;
        }
        [data-gs-active="true"] .group-reply-highlight {
          animation: highlight-flash 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes highlight-flash {
          0%, 50% { background-color: rgba(var(--accent-red-rgb), 0); }
          55%, 78% { background-color: rgba(var(--accent-red-rgb), 0.18); }
          85%, 100% { background-color: rgba(var(--accent-red-rgb), 0); }
        }
        .branch-affordance {
          position: absolute;
          font-size: 0.6875rem;
          background-color: var(--bg-nav);
          color: var(--text-inverse);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          opacity: 0;
          right: 0.5rem;
          top: -1.5rem;
          font-family: 'Inter', sans-serif;
        }
        [data-gs-active="true"] .branch-affordance {
          animation: branch-aff 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes branch-aff {
          0%, 58% { opacity: 0; transform: translateY(-2px); }
          63%, 75% { opacity: 1; transform: translateY(0); }
          80%, 100% { opacity: 0; transform: translateY(-2px); }
        }
        .child-thread {
          position: absolute;
          right: -10rem;
          top: 1rem;
          width: 9rem;
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border-subtle);
          border-radius: 0.375rem;
          padding: 0.5rem 0.625rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          opacity: 0;
          transform: translateX(8px);
        }
        [data-gs-active="true"] .child-thread {
          animation: child-slide 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes child-slide {
          0%, 76% { opacity: 0; transform: translateX(8px); }
          82%, 95% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(8px); }
        }
        .child-thread-lineage {
          color: var(--text-secondary);
          font-size: 0.625rem;
          margin-bottom: 0.25rem;
        }
        .child-thread-title {
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        /* ── Personal surface ───────────────────────────────────── */
        .personal-mockup { max-width: 32rem; padding: 1.25rem; }
        .personal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .personal-lock {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.6875rem;
          color: var(--text-secondary);
          padding: 0.125rem 0.5rem;
          border-radius: 1rem;
          background-color: var(--bg-page);
          transition: box-shadow 400ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        }
        [data-ps-active="true"] .personal-lock {
          animation: lock-glow 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes lock-glow {
          0%, 18% { box-shadow: 0 0 0 0 rgba(var(--accent-purple-rgb), 0); }
          22%, 30% { box-shadow: 0 0 0 4px rgba(var(--accent-purple-rgb), 0.18); }
          34%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-purple-rgb), 0); }
        }
        .personal-title-field {
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
          color: var(--text-primary);
          font-size: 1rem;
          padding: 0.375rem 0.5rem;
          border-bottom: 1px solid var(--border-subtle);
          min-height: 1.75rem;
        }
        .personal-body-field {
          font-family: 'Inter', sans-serif;
          font-size: 0.8125rem;
          line-height: 1.5;
          color: var(--text-primary);
          padding: 0.625rem 0.5rem;
          min-height: 4.5rem;
          position: relative;
        }
        .personal-body-text {
          opacity: 0;
        }
        [data-ps-active="true"] .personal-body-text {
          animation: body-type 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes body-type {
          0%, 5% { opacity: 0; }
          12% { opacity: 0.3; }
          16% { opacity: 0.6; }
          20%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }
        .personal-autosave {
          font-family: 'Inter', sans-serif;
          font-size: 0.6875rem;
          color: var(--text-secondary);
          padding: 0.25rem 0.5rem;
          opacity: 0.7;
        }
        .personal-highlight {
          background-color: rgba(var(--accent-red-rgb), 0);
          padding: 0 2px;
          border-radius: 2px;
        }
        [data-ps-active="true"] .personal-highlight {
          animation: personal-flash 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes personal-flash {
          0%, 42% { background-color: rgba(var(--accent-red-rgb), 0); }
          50%, 75% { background-color: rgba(var(--accent-red-rgb), 0.18); }
          82%, 100% { background-color: rgba(var(--accent-red-rgb), 0); }
        }
        .personal-branch-affordance {
          position: absolute;
          font-size: 0.6875rem;
          background-color: var(--bg-nav);
          color: var(--text-inverse);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          opacity: 0;
          font-family: 'Inter', sans-serif;
        }
        [data-ps-active="true"] .personal-branch-affordance {
          animation: personal-branch-aff 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes personal-branch-aff {
          0%, 55% { opacity: 0; transform: translateY(-2px); }
          60%, 75% { opacity: 1; transform: translateY(0); }
          82%, 100% { opacity: 0; transform: translateY(-2px); }
        }
        .personal-thread-out {
          position: absolute;
          right: -10rem;
          top: 0.5rem;
          width: 9rem;
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border-subtle);
          border-radius: 0.375rem;
          padding: 0.5rem 0.625rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          opacity: 0;
          transform: translateX(8px);
        }
        [data-ps-active="true"] .personal-thread-out {
          animation: personal-thread-slide 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes personal-thread-slide {
          0%, 78% { opacity: 0; transform: translateX(8px); }
          85%, 95% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(8px); }
        }

        /* ── Dashboard surface ──────────────────────────────────── */
        .dashboard-mockup { max-width: 44rem; padding: 1.25rem; }
        .dashboard-greeting {
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
          color: var(--text-primary);
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .dashboard-orientation {
          font-family: 'Inter', sans-serif;
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-secondary);
          padding-bottom: 0.5rem;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-subtle);
          opacity: 0;
        }
        [data-ds-active="true"] .dashboard-orientation {
          animation: orientation-in 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes orientation-in {
          0%, 5% { opacity: 0; }
          12%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Rhythm strip — weekly cadence visualised */
        .rhythm-strip {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.875rem;
          opacity: 0;
        }
        [data-ds-active="true"] .rhythm-strip {
          animation: rhythm-in 7s var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1)) infinite;
        }
        @keyframes rhythm-in {
          0%, 12% { opacity: 0; }
          18%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }
        .rhythm-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .rhythm-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
        }
        .rhythm-day {
          font-family: 'Inter', sans-serif;
          font-size: 0.625rem;
          text-align: center;
          padding: 0.25rem 0;
          border-radius: 0.25rem;
          background-color: var(--bg-page);
          color: var(--text-secondary);
          font-weight: 500;
        }
        .rhythm-day.active {
          background-color: var(--accent-purple);
          color: var(--text-inverse);
        }

        /* Magnitude bars */
        .dashboard-attention {
          margin-bottom: 1rem;
        }
        .dashboard-attention-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .magnitude-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.25rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          color: var(--text-primary);
        }
        .magnitude-count {
          width: 1.5rem;
          text-align: right;
          font-weight: 600;
        }
        .magnitude-track {
          flex: 1;
          height: 6px;
          background-color: rgba(var(--accent-purple-rgb), 0.12);
          border-radius: 3px;
          overflow: hidden;
        }
        .magnitude-bar {
          height: 100%;
          background-color: var(--accent-purple);
          width: 0;
          border-radius: inherit;
        }
        [data-ds-active="true"] .magnitude-bar {
          animation-name: bar-fill;
          animation-duration: 7s;
          animation-iteration-count: infinite;
          animation-timing-function: var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        }
        /* Each bar has a different fill target via inline --target var
           and a different start delay (animation-delay) — non-uniform
           timing is the multi-actor read */
        @keyframes bar-fill {
          0%, 25% { width: 0; }
          /* The bar fills from 25% of the loop, with delays applied per bar */
          35% { width: var(--target, 100%); }
          90% { width: var(--target, 100%); }
          100% { width: 0; }
        }
        .magnitude-label {
          flex: 2;
          font-size: 0.6875rem;
          color: var(--text-secondary);
        }

        /* Dashboard ambient — quote callout, threads, concepts */
        .dashboard-ambient {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        @media (min-width: 640px) {
          .dashboard-ambient {
            grid-template-columns: 1fr 1fr;
          }
        }
        .dashboard-quote {
          font-family: 'Lora', Georgia, serif;
          font-style: italic;
          color: var(--text-primary);
          font-size: 0.8125rem;
          line-height: 1.5;
          padding: 0.5rem 0.75rem;
          border-left: 2px solid var(--accent-purple);
        }
        .dashboard-threads {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
        }
        .dashboard-thread-row {
          padding: 0.375rem 0;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .dashboard-thread-row:last-child { border-bottom: none; }
        .dashboard-thread-title {
          color: var(--text-primary);
          flex: 1;
        }
        .dashboard-thread-time {
          color: var(--text-secondary);
          font-size: 0.6875rem;
        }
        .dashboard-concepts {
          font-family: 'Inter', sans-serif;
          font-size: 0.6875rem;
          color: var(--text-secondary);
        }
        .dashboard-concept-eyebrow {
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .dashboard-concept-row {
          padding: 0.25rem 0;
          color: var(--text-primary);
        }

        /* ── Label cycler (below mockup) ────────────────────────── */
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
        .beat-label.fading { opacity: 0; }

        /* ── Mobile parity (≤640px) ─────────────────────────────── */
        @media (max-width: 640px) {
          /* Marginalia + reply cards reposition inline below their
             paragraph rather than floating off the right edge. */
          .marginalia-card,
          .reply-card {
            position: relative !important;
            right: auto !important;
            top: auto !important;
            width: 100%;
            margin-top: 0.5rem;
          }
          .reply-card { top: auto !important; margin-top: 0.375rem; }

          /* Confusion flag tucks above the paragraph rather than
             extending off the right edge. */
          .confusion-flag {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            flex-direction: row !important;
            justify-content: flex-end;
            margin-bottom: 0.25rem;
          }

          /* Child-thread cards (Group + Personal) drop below the
             reply / journal body rather than floating right. */
          .child-thread,
          .personal-thread-out {
            position: relative !important;
            right: auto !important;
            top: auto !important;
            width: 100% !important;
            margin-top: 0.5rem;
          }

          /* Branch affordances tighten in. */
          .branch-affordance,
          .personal-branch-affordance {
            right: 0 !important;
          }

          /* Dashboard ambient grid stays single-column on small. */
          .dashboard-ambient { grid-template-columns: 1fr !important; }

          /* Glossary popover tightens to the visible viewport. */
          .glossary-popover { width: 12rem; }
        }

        /* ── Reduced-motion override ────────────────────────────── */
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
          .reply-card,
          .glossary-popover,
          .confusion-flag,
          .group-thread-title,
          .branch-affordance,
          .child-thread,
          .personal-thread-out,
          .personal-branch-affordance,
          .dashboard-orientation,
          .rhythm-strip,
          .group-confusion-source,
          .personal-body-text { opacity: 1 !important; transform: none !important; animation: none !important; }
          .glossary-term { background-size: 100% 1.5px !important; animation: none !important; }
          .group-reply-highlight,
          .personal-highlight { background-color: rgba(var(--accent-red-rgb), 0.18) !important; animation: none !important; }
          .magnitude-bar { width: var(--target, 100%) !important; animation: none !important; }
          .audio-fill { width: 35% !important; animation: none !important; }
          .personal-lock { box-shadow: 0 0 0 4px rgba(var(--accent-purple-rgb), 0.18) !important; animation: none !important; }
        }
      `}</style>

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
 * Sub-components per surface — each manages its own beat-label cycle.
 * Mockup motion is driven by the [data-XX-active="true"] attribute
 * on a wrapper, so all CSS keyframes run as one synchronised loop.
 * Beat labels are React-state-cycled to read in turn underneath.
 * ───────────────────────────────────────────────────────────────── */

interface SurfaceProps {
  sectionRef: (el: HTMLElement | null) => void
  active: boolean
  reduced: boolean
}

function ReadingSurface({ sectionRef, active, reduced }: SurfaceProps) {
  // 5 beats over a 7s loop:
  //   0.0s marginalia
  //   1.0s replies
  //   2.0s glossary
  //   2.8s confusion (irregular climb to 7 across ~3s — see below)
  //   5.0s audio
  // Confusion-counter timing: hand-tuned non-uniform arrivals drive
  // the multi-actor read. Pattern reflects a real social dynamic —
  // first noticer (250ms), sympathetic chime-ins (350/500ms close
  // together), considered pause (jump to 1200ms), small flurry
  // (1200/1400ms), pause, gradual final additions (2200/2900ms).
  const beats: Array<{ at: number; label: string }> = [
    { at: 800, label: 'Marginalia' },
    { at: 1900, label: 'Replies tuck under' },
    { at: 2700, label: 'Glossary, in line' },
    { at: 3300, label: 'Confusion, anonymous' },
    { at: 5500, label: 'Listen along' },
  ]
  // Confusion counter — irregular increments
  const confusionArrivals = [250, 350, 500, 1200, 1400, 2200, 2900]
  const [count, setCount] = useState(0)
  const [bumped, setBumped] = useState(false)
  const [labelIdx, setLabelIdx] = useState(0)

  useEffect(() => {
    if (!active || reduced) {
      if (reduced) {
        setCount(7)
        setLabelIdx(0)
      }
      return
    }
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const runCycle = () => {
      setCount(0)
      setLabelIdx(0)
      // Confusion start offset (matches CSS keyframe 38% → 42%, ~2.94s)
      const confusionStart = 2940
      confusionArrivals.forEach((delay, i) => {
        const t = setTimeout(() => {
          setCount(i + 1)
          setBumped(true)
          const tb = setTimeout(() => setBumped(false), 80)
          timeouts.push(tb)
        }, confusionStart + delay)
        timeouts.push(t)
      })
      // Cycle labels
      beats.forEach((b, i) => {
        const t = setTimeout(() => setLabelIdx(i), b.at)
        timeouts.push(t)
      })
      // Restart at end of 7s loop
      const restart = setTimeout(runCycle, 7000)
      timeouts.push(restart)
    }

    runCycle()
    return () => timeouts.forEach(clearTimeout)
  }, [active, reduced])

  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="reading"
      aria-label="Reading"
    >
      <p className="welcome-section-marker text-eyebrow">02 / Reading</p>

      <div className="welcome-visual" data-rs-active={active && !reduced ? 'true' : 'false'}>
        <div className="welcome-mockup reading-mockup mx-auto" style={{ position: 'relative' }}>
          <p className="mockup-example-tag text-eyebrow" style={{ fontSize: '0.5625rem' }}>Example</p>
          <p className="reading-eyebrow text-eyebrow" style={{ fontSize: '0.625rem', marginBottom: '0.5rem' }}>Capital · Chapter 1, §1 · Commodities</p>

          <div className="reading-body" style={{ position: 'relative' }}>
            {/* Para 1 — gets marginalia + reply */}
            <div className="reading-paragraph">
              <p>
                The wealth of those societies in which the capitalist mode of production prevails, presents itself as &ldquo;an immense accumulation of commodities,&rdquo; its unit being a single commodity.
              </p>
              <div className="marginalia-card" aria-hidden="true">
                <div className="marginalia-name">Liz</div>
                <div className="marginalia-body">I keep coming back to this opening.</div>
              </div>
              <div className="reply-card" aria-hidden="true">
                <div className="marginalia-name">Daniel</div>
                <div className="marginalia-body">Same — the &lsquo;immense&rsquo; is doing work.</div>
              </div>
            </div>

            {/* Para 2 — gets glossary tooltip on "commodity" */}
            <div className="reading-paragraph">
              <p>
                Our investigation must therefore begin with the analysis of a{' '}
                <span className="glossary-term">
                  commodity
                  <span className="glossary-popover" aria-hidden="true">
                    <span className="glossary-popover-term">commodity</span>
                    <span className="glossary-popover-def">
                      An external object whose properties satisfy human wants of some sort.
                    </span>
                  </span>
                </span>
                .
              </p>
            </div>

            {/* Para 3 — gets confusion flag */}
            <div className="reading-paragraph">
              <p>
                Every useful thing, as iron, paper, etc., may be looked at from the two points of view of quality and quantity. Every such thing is a whole composed of many properties.
              </p>
              <div className="confusion-flag" aria-hidden="true">
                <span className="confusion-icon" />
                <span className={`confusion-count${bumped ? ' bumped' : ''}`}>{count}</span>
              </div>
            </div>
          </div>

          <div className="audio-player" aria-hidden="true">
            <span className="audio-play">▶</span>
            <span className="audio-track">
              <span className="audio-fill" />
            </span>
            <span>Listen along</span>
          </div>
        </div>

        <p className="beat-label">
          {beats[labelIdx]?.label}
        </p>
      </div>
    </section>
  )
}

function GroupSurface({ sectionRef, active, reduced }: SurfaceProps) {
  const beats = [
    { at: 0, label: 'Confusion becomes agenda' },
    { at: 4200, label: 'Branch when it deserves space' },
    { at: 5800, label: 'Lineage stays visible' },
  ]
  const [labelIdx, setLabelIdx] = useState(0)

  useEffect(() => {
    if (!active || reduced) {
      setLabelIdx(reduced ? 0 : 0)
      return
    }
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const runCycle = () => {
      setLabelIdx(0)
      beats.forEach((b, i) => {
        const t = setTimeout(() => setLabelIdx(i), b.at)
        timeouts.push(t)
      })
      const restart = setTimeout(runCycle, 7000)
      timeouts.push(restart)
    }

    runCycle()
    return () => timeouts.forEach(clearTimeout)
  }, [active, reduced])

  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="group"
      aria-label="Group"
    >
      <p className="welcome-section-marker text-eyebrow">03 / Group</p>

      <div className="welcome-visual" data-gs-active={active && !reduced ? 'true' : 'false'}>
        <div className="welcome-mockup group-mockup mx-auto" style={{ position: 'relative' }}>
          <p className="mockup-example-tag text-eyebrow" style={{ fontSize: '0.5625rem' }}>Example</p>

          {/* The "promote" motion: the source paragraph + count fade
              briefly at the start, then the thread title arrives. */}
          <div className="group-confusion-source" aria-hidden="true" style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.5rem',
          }}>
            <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>7</span>
            <span style={{ fontStyle: 'italic' }}>flagged in §1</span>
          </div>

          <p className="text-eyebrow" style={{ fontSize: '0.5625rem', marginBottom: '0.25rem' }}>Discussion</p>
          <h3 className="group-thread-title">What&rsquo;s confusing in §1?</h3>

          <div className="group-thread-quote">
            &ldquo;Every useful thing, as iron, paper, etc., may be looked at from the two points of view of quality and quantity.&rdquo;
          </div>

          <div className="group-reply">
            <div className="group-reply-meta">Pita · 2h</div>
            The two-points-of-view bit is what landed for me. It feels like he&rsquo;s asking us to hold both at once.
          </div>
          <div className="group-reply" style={{ position: 'relative' }}>
            <div className="group-reply-meta">Eli · 1h</div>
            But quality and quantity here aren&rsquo;t parallel. The{' '}
            <span className="group-reply-highlight">quantity is what becomes value, the quality only matters for whether it&rsquo;s wanted at all</span>
            .
            <span className="branch-affordance">↗ Branch this</span>
            <div className="child-thread" aria-hidden="true">
              <div className="child-thread-lineage">← Branched from &lsquo;§1&rsquo;</div>
              <div className="child-thread-title">Quality vs quantity here</div>
            </div>
          </div>
        </div>

        <p className="beat-label">
          {beats[labelIdx]?.label}
        </p>
      </div>
    </section>
  )
}

function PersonalSurface({ sectionRef, active, reduced }: SurfaceProps) {
  const beats = [
    { at: 0, label: 'Private journal' },
    { at: 2100, label: 'Private by default' },
    { at: 4500, label: 'The same move, made public' },
  ]
  const [labelIdx, setLabelIdx] = useState(0)

  useEffect(() => {
    if (!active || reduced) {
      setLabelIdx(reduced ? 0 : 0)
      return
    }
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const runCycle = () => {
      setLabelIdx(0)
      beats.forEach((b, i) => {
        const t = setTimeout(() => setLabelIdx(i), b.at)
        timeouts.push(t)
      })
      const restart = setTimeout(runCycle, 7000)
      timeouts.push(restart)
    }

    runCycle()
    return () => timeouts.forEach(clearTimeout)
  }, [active, reduced])

  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="personal"
      aria-label="Personal"
    >
      <p className="welcome-section-marker text-eyebrow">04 / Personal</p>

      <div className="welcome-visual" data-ps-active={active && !reduced ? 'true' : 'false'}>
        <div className="welcome-mockup personal-mockup mx-auto" style={{ position: 'relative' }}>
          <p className="mockup-example-tag text-eyebrow" style={{ fontSize: '0.5625rem' }}>Example</p>

          <div className="personal-header">
            <p className="text-eyebrow" style={{ fontSize: '0.5625rem' }}>Journal</p>
            <span className="personal-lock">🔒 Only you</span>
          </div>

          <div className="personal-title-field">
            Reading the value-form section.
          </div>

          <div className="personal-body-field" style={{ position: 'relative' }}>
            <span className="personal-body-text">
              I keep getting tangled in the relative form. Marx says it&rsquo;s the linen that expresses its value in coats, but my brain keeps flipping which is which.{' '}
              <span className="personal-highlight">The relative form makes the value visible only by being measured against something else</span>
              {' '}— that&rsquo;s the move I think.
            </span>
            <span className="personal-branch-affordance" style={{ right: '1rem', top: '-1.5rem' }}>↗ Branch this</span>
            <div className="personal-thread-out" aria-hidden="true">
              <div className="child-thread-lineage">← From your journal</div>
              <div className="child-thread-title">Relative form, made visible</div>
            </div>
          </div>

          <div className="personal-autosave">Saved just now</div>
        </div>

        <p className="beat-label">
          {beats[labelIdx]?.label}
        </p>
      </div>
    </section>
  )
}

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
  const beats = [
    { at: 0, label: 'Where we are' },
    { at: 2100, label: 'Where the group\u2019s attention is' },
  ]
  const [labelIdx, setLabelIdx] = useState(0)

  useEffect(() => {
    if (!active || reduced) {
      setLabelIdx(reduced ? 0 : 0)
      return
    }
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const runCycle = () => {
      setLabelIdx(0)
      beats.forEach((b, i) => {
        const t = setTimeout(() => setLabelIdx(i), b.at)
        timeouts.push(t)
      })
      const restart = setTimeout(runCycle, 7000)
      timeouts.push(restart)
    }

    runCycle()
    return () => timeouts.forEach(clearTimeout)
  }, [active, reduced])

  // Match the live SystemStatusStrip format. When sessionDayPlural is
  // null, drop the "Next session" piece and let the rhythm strip carry
  // the cadence with a generic frame.
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  // sessionDayPlural like "Tuesdays" → "T" at index 1. Monday is 1 in
  // ISO; we render M-Sun so map: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6.
  const dayMap: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
  }
  const activeDayIdx = sessionDayPlural
    ? dayMap[sessionDayPlural.replace(/s$/, '')] ?? 1
    : null

  return (
    <section
      ref={sectionRef}
      className="welcome-section"
      data-surface="dashboard"
      aria-label="Dashboard"
    >
      <p className="welcome-section-marker text-eyebrow">05 / Dashboard</p>

      <div className="welcome-visual" data-ds-active={active && !reduced ? 'true' : 'false'}>
        <div className="welcome-mockup dashboard-mockup mx-auto" style={{ position: 'relative' }}>
          <p className="mockup-example-tag text-eyebrow" style={{ fontSize: '0.5625rem' }}>Example</p>

          <p className="dashboard-greeting">Good evening, {heroName}</p>
          <p className="dashboard-orientation">
            {groupName} &middot; Week 12 &middot; Week 3 on Chapter 1, §4
            {sessionDayPlural ? ` · Next session ${sessionDayPlural.replace(/s$/, '')} 7pm` : ''}
          </p>

          {/* Rhythm strip — weekly cadence visualised */}
          <div className="rhythm-strip">
            <p className="rhythm-eyebrow">We meet weekly</p>
            <div className="rhythm-days">
              {dayLabels.map((d, i) => (
                <span
                  key={`${d}-${i}`}
                  className={`rhythm-day${activeDayIdx === i ? ' active' : ''}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Magnitude bars — irregular fill timing per bar. The
              non-uniform animation-delays produce the multi-actor
              read. Each bar's --target inline width is the percentage
              fill. */}
          <div className="dashboard-attention">
            <p className="dashboard-attention-label">Where the group&rsquo;s attention is</p>
            {[
              { count: 14, label: '§1 The Two Factors of a Commodity', target: '100%', delay: '2.1s' },
              { count: 11, label: '§4 The Fetishism of Commodities', target: '78%', delay: '2.4s' },
              { count: 6, label: '§2 The Two-fold Character of Labour', target: '42%', delay: '2.8s' },
              { count: 3, label: '§3 The Form of Value', target: '21%', delay: '3.3s' },
              { count: 2, label: '§5 Exchange', target: '14%', delay: '2.6s' },
              { count: 0, label: '§6 The Money Form', target: '0%', delay: '0s' },
            ].map(row => (
              <div key={row.label} className="magnitude-row">
                <span className="magnitude-count">{row.count}</span>
                <span className="magnitude-track">
                  <span
                    className="magnitude-bar"
                    style={{
                      ['--target' as string]: row.target,
                      animationDelay: row.delay,
                    } as React.CSSProperties}
                  />
                </span>
                <span className="magnitude-label">{row.label}</span>
              </div>
            ))}
          </div>

          {/* Ambient — quote callout, recent threads, concept scaffolding.
              These appear in the dashboard mockup but are not labelled
              with their own motion beats. Calm-technology absences held
              in framing: no streak counter, no notification badge,
              no progress percentages. */}
          <div className="dashboard-ambient">
            <div className="dashboard-quote">
              &ldquo;A commodity appears, at first sight, a very trivial thing, and easily understood.&rdquo;
            </div>
            <div className="dashboard-threads">
              <p className="dashboard-attention-label">Recent threads</p>
              <div className="dashboard-thread-row">
                <span className="dashboard-thread-title">What&rsquo;s confusing in §1?</span>
                <span className="dashboard-thread-time">2h</span>
              </div>
              <div className="dashboard-thread-row">
                <span className="dashboard-thread-title">Quality vs quantity here</span>
                <span className="dashboard-thread-time">1h</span>
              </div>
              <div className="dashboard-thread-row">
                <span className="dashboard-thread-title">The labour-time equation</span>
                <span className="dashboard-thread-time">5h</span>
              </div>
            </div>
          </div>

          <div className="dashboard-concepts" style={{ marginTop: '0.875rem' }}>
            <p className="dashboard-concept-eyebrow">Concepts this week</p>
            <div className="dashboard-concept-row">use-value &middot; the qualitative side</div>
            <div className="dashboard-concept-row">exchange-value &middot; the quantitative side</div>
            <div className="dashboard-concept-row">abstract labour &middot; labour stripped of its particular form</div>
          </div>
        </div>

        <p className="beat-label">
          {beats[labelIdx]?.label}
        </p>
      </div>
    </section>
  )
}
