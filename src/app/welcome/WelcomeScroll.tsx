'use client'

import { useEffect, useRef } from 'react'
import { completeOnboarding } from './actions'

/**
 * WelcomeScroll — eight-section onboarding scroll for new members.
 *
 * Brief 1, sub-batch 6. Light scroll-driven animation only:
 *   - Sections fade in as they enter viewport (~500ms ease-out)
 *   - Subtle scale-up (0.96 → 1.0) on each section's primary visual
 *   - Proximity scroll-snap for pacing (NOT mandatory — readers can
 *     pause mid-section to study mockups without snap-jolt)
 *   - NO pinning, NO parallax, NO cross-section choreography
 *   - Native CSS + IntersectionObserver, no animation library
 *
 * Reduced-motion respect:
 *   - prefers-reduced-motion: reduce → no fade, no scale, no snap.
 *     Static viewport-height sections, normal scroll behavior.
 *
 * Section structure (all eight):
 *   1. WELCOME — personalised hero
 *   2. THE RHYTHM — recurring-mode-aware "Your part / Our part"
 *   3. READING TOGETHER — chapter view + glossary popover mockup
 *   3.II. CONFUSION FLAGS — confusion popover mockup
 *   4. ANNOTATIONS — annotation editor mockup
 *   5. THE DASHBOARD — dashboard mockup (dual-counter format)
 *   6. MORE TO EXPLORE — the rest of the platform
 *   7. WHAT THIS ISN'T — calm-technology principles
 *   8. READY — CTA that flips has_completed_onboarding=true
 *
 * EXAMPLE captions: sections 3, 3.II, 4, 5 carry quiet eyebrow
 * captions to prevent confusion that named members are real.
 *
 * Section 6 portability fix: mum's PDF v3 had "Mars sees the flag
 * counts on his dashboard" — replaced here with "the host" since
 * the scroll text is platform-facing (visible to every Watermelon
 * member, not Mars-specific).
 *
 * Section 12 (now §6 here) "32-week arc" replaced with the
 * recurring-mode-accurate copy per Brief 1 investigation note.
 *
 * Mockup approach: simplified-but-recognizable. Captures the gist
 * of each feature without pixel-perfect platform replication.
 * Mobile parity at 375px — section 5 dashboard mockup uses a
 * scaled-desktop-aspect layout that compresses cleanly under 600px.
 */

interface Props {
  displayName: string | null
  groupName: string
  /** "Tuesdays" / "Wednesdays" / etc. — null when host hasn't set
   *  next_session_at; section 2 collapses to "Meet weekly." in that
   *  case rather than rendering a fake day. */
  sessionDayPlural: string | null
}

export default function WelcomeScroll({
  displayName,
  groupName,
  sessionDayPlural,
}: Props) {
  const sectionRefs = useRef<HTMLElement[]>([])

  useEffect(() => {
    // Skip the observer entirely if reduced motion is preferred —
    // sections render fully visible from first paint via the CSS
    // override below, no JS-toggled state needed.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) {
      sectionRefs.current.forEach(s => s?.setAttribute('data-visible', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true')
          }
        }
      },
      {
        // Trigger when the section is ~25% in view — ahead of the
        // user's reading focus, so the fade-in is mostly done by
        // the time they arrive at the section's centre.
        threshold: 0.25,
      }
    )

    sectionRefs.current.forEach(s => s && observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const setRef = (i: number) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current[i] = el
  }

  const heroName = displayName ?? 'reader'

  return (
    <main
      className="welcome-scroll"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      {/* Inline styles — scoped, single-consumer, avoids touching
          globals.css for what's effectively a one-page treatment. */}
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
          opacity: 0;
          transition: opacity 500ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        }
        .welcome-section[data-visible="true"] {
          opacity: 1;
        }
        .welcome-visual {
          transform: scale(0.96);
          transition: transform 500ms var(--ease-out-expo, cubic-bezier(0.22, 1, 0.36, 1));
        }
        .welcome-section[data-visible="true"] .welcome-visual {
          transform: scale(1);
        }
        .welcome-platform-tag {
          position: absolute;
          top: 1.5rem;
          left: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .welcome-section-marker {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
        }
        .welcome-mockup {
          background-color: var(--bg-card, #ffffff);
          border: 1px solid var(--border-subtle);
          border-radius: 0.5rem;
          padding: 1.5rem;
          max-width: 28rem;
          width: 100%;
          margin: 1.5rem auto 0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .welcome-dashboard-mockup {
          max-width: 44rem;
          font-size: 0.75rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .welcome-scroll {
            scroll-snap-type: none;
          }
          .welcome-section,
          .welcome-section .welcome-visual {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ── 1. WELCOME ──────────────────────────────────────────── */}
      <section
        ref={setRef(0)}
        className="welcome-section relative"
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
        <p className="welcome-section-marker text-eyebrow">01 / Welcome</p>

        <div className="welcome-visual text-center max-w-2xl">
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
            Welcome to {groupName},
            <span className="block">{heroName}.</span>
          </h1>
          <p
            className="text-base sm:text-lg max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            A small group reading Marx&rsquo;s Capital, Volume I together.
          </p>
        </div>
      </section>

      {/* ── 2. THE RHYTHM ───────────────────────────────────────── */}
      <section
        ref={setRef(1)}
        className="welcome-section relative"
        aria-label="The rhythm"
      >
        <p className="welcome-section-marker text-eyebrow">02 / The rhythm</p>

        <div className="welcome-visual w-full max-w-3xl">
          <p className="text-eyebrow mb-4 text-center">How the week works</p>
          <h2
            className="text-display-md text-center mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            {sessionDayPlural
              ? <>Read at your pace. Meet on {sessionDayPlural}.</>
              : <>Read at your pace. Meet weekly.</>}
          </h2>
          <p
            className="text-base sm:text-lg text-center max-w-2xl mx-auto mb-12"
            style={{ color: 'var(--text-secondary)' }}
          >
            There&rsquo;s a chapter in front of the group. You read it on your own time, before the next meeting. We meet to work through it together. What&rsquo;s confusing, what&rsquo;s connecting, what the group is making of it.
          </p>

          <div className="grid sm:grid-cols-2 gap-8 sm:gap-12 max-w-2xl mx-auto">
            <div>
              <p className="text-eyebrow mb-3">Your part</p>
              <h3
                className="text-lg font-semibold mb-3"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: "'Lora', Georgia, serif",
                  fontStyle: 'italic',
                }}
              >
                Read the chapter when you can.
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Annotate what stops you. Flag what confuses you. Bring something. A question, a passage, a half-formed thought.
              </p>
            </div>
            <div>
              <p className="text-eyebrow mb-3">Our part</p>
              <h3
                className="text-lg font-semibold mb-3"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: "'Lora', Georgia, serif",
                  fontStyle: 'italic',
                }}
              >
                Meet for an hour, every {sessionDayPlural ?? 'week'}.
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                We work through whatever chapter we&rsquo;re on. When the group&rsquo;s ready, we move to the next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. READING TOGETHER ─────────────────────────────────── */}
      <section
        ref={setRef(2)}
        className="welcome-section relative"
        aria-label="Reading together"
      >
        <p className="welcome-section-marker text-eyebrow">03 / Reading together</p>

        <div className="welcome-visual w-full max-w-3xl text-center">
          <p className="text-eyebrow mb-4">In the chapter view</p>
          <h2
            className="text-display-md mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            The platform helps you track what&rsquo;s confusing and what&rsquo;s worth discussing.
          </h2>
          <p
            className="text-base max-w-2xl mx-auto mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Underlined terms have glossary entries. Tap for a definition, click through for the full entry. The glossary builds across the year as the group works through new concepts.
          </p>
          <p className="text-eyebrow mt-8 mb-3">Example</p>
          <div className="welcome-mockup text-left">
            <p className="text-eyebrow mb-3">Capital · Chapter 1, §1 · Commodities</p>
            <p
              className="mb-4"
              style={{
                fontFamily: "'Lora', Georgia, serif",
                color: 'var(--text-primary)',
                lineHeight: 1.7,
              }}
            >
              The wealth of those societies in which the capitalist mode of production prevails, presents itself as &ldquo;an immense accumulation of{' '}
              <span
                style={{
                  borderBottom: '2px dotted var(--accent-purple)',
                  cursor: 'help',
                }}
              >
                commodities
              </span>
              ,&rdquo; its unit being a single commodity. Our investigation must therefore begin with the analysis of a commodity.
            </p>
            <div
              className="rounded p-3 text-sm mt-4"
              style={{
                backgroundColor: 'rgba(var(--accent-purple-rgb, 92, 61, 143), 0.06)',
                borderLeft: '3px solid var(--accent-purple)',
              }}
            >
              <p className="text-eyebrow mb-1">Glossary</p>
              <p
                className="font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                commodity
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                An external object, a thing whose properties satisfy human wants of some sort. For Marx, the elementary form in which capitalist wealth presents itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3.II. CONFUSION FLAGS ───────────────────────────────── */}
      <section
        ref={setRef(3)}
        className="welcome-section relative"
        aria-label="Confusion flags"
      >
        <p className="welcome-section-marker text-eyebrow">03 · II / Confusion flags</p>

        <div className="welcome-visual w-full max-w-3xl text-center">
          <p className="text-eyebrow mb-4">Stuck, without performance</p>
          <h2
            className="text-display-md mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            &ldquo;I&rsquo;m also stuck here&rdquo; without anyone seeing it was you.
          </h2>
          <p
            className="text-base max-w-2xl mx-auto mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            When a paragraph confuses you, you can flag it. Flags are anonymous. Nobody sees who flagged what, only how many. The host uses flags to know what to make space for in the session.
          </p>
          <p className="text-eyebrow mt-8 mb-3">Example</p>
          <div className="welcome-mockup text-left">
            <p
              className="mb-4 text-sm"
              style={{
                fontFamily: "'Lora', Georgia, serif",
                color: 'var(--text-primary)',
                lineHeight: 1.7,
              }}
            >
              It is value, rather, that converts every product into a social hieroglyphic. Later on, we try to decipher the hieroglyphic, to get behind the secret of our own social products.
            </p>
            <div
              className="rounded p-3 mt-3"
              style={{
                backgroundColor: 'rgba(var(--accent-red-rgb, 163, 21, 69), 0.04)',
                borderLeft: '3px solid var(--accent-red)',
              }}
            >
              <p className="text-eyebrow mb-2">This passage is confusing</p>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                7 people have flagged this paragraph.
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                Flags are anonymous. Nobody sees who flagged what, only how many.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. ANNOTATIONS ──────────────────────────────────────── */}
      <section
        ref={setRef(4)}
        className="welcome-section relative"
        aria-label="Annotations"
      >
        <p className="welcome-section-marker text-eyebrow">04 / Annotations</p>

        <div className="welcome-visual w-full max-w-3xl text-center">
          <p className="text-eyebrow mb-4">Your thinking, when you&rsquo;re ready</p>
          <h2
            className="text-display-md mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Annotations are private when you write them. Shared when you choose.
          </h2>
          <p
            className="text-base max-w-2xl mx-auto mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Annotations are how you talk about specific passages. Half-formed thoughts, questions, things to bring up at the next meeting. Your draft thinking is yours. Only what you choose to publish is visible to others.
          </p>
          <p className="text-eyebrow mt-8 mb-3">Example</p>
          <div className="welcome-mockup text-left">
            <p className="text-eyebrow mb-2">Annotation · sit with this</p>
            <blockquote
              className="text-sm italic mb-3 pl-3"
              style={{
                color: 'var(--text-primary)',
                fontFamily: "'Lora', Georgia, serif",
                borderLeft: '2px solid var(--accent-purple)',
              }}
            >
              &ldquo;Use-values become a reality only by use or consumption: they also constitute the substance of all wealth, whatever may be the social form of that wealth.&rdquo;
            </blockquote>
            <p
              className="text-sm mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              I keep coming back to this. The double character feels obvious in the abstract but I&rsquo;m not sure I&rsquo;d recognise it if I saw it in a real exchange.
            </p>
            <div
              className="text-xs flex items-center justify-between pt-3"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <span>Share with the group</span>
              <span>On</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. THE DASHBOARD ────────────────────────────────────── */}
      <section
        ref={setRef(5)}
        className="welcome-section relative"
        aria-label="The dashboard"
      >
        <p className="welcome-section-marker text-eyebrow">05 / The dashboard</p>

        <div className="welcome-visual w-full max-w-4xl text-center">
          <p className="text-eyebrow mb-4">Where the group&rsquo;s thinking gathers</p>
          <h2
            className="text-display-md mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            The dashboard collects what the group is working through.
          </h2>
          <p
            className="text-base max-w-2xl mx-auto mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            What the group is thinking about. Where attention is concentrated this week. What conversations are unfolding. Where people are stuck. Not a metric dashboard. No scores, no rankings. Just the shape of what&rsquo;s being worked through.
          </p>
          <p className="text-eyebrow mt-8 mb-3">Example</p>

          {/* Dashboard mockup — dual-counter format per Brief 1
              investigation lean. Updated from mum's PDF "Week 4 of 32"
              to the recurring-mode shape that real members will see. */}
          <div className="welcome-mockup welcome-dashboard-mockup text-left">
            <div className="flex items-baseline justify-between mb-2">
              <p
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  fontSize: '1.125rem',
                }}
              >
                Good evening, {heroName}
              </p>
              <span
                className="text-eyebrow"
                style={{ fontSize: '0.625rem' }}
              >
                {groupName}
              </span>
            </div>
            <p
              className="text-eyebrow mb-4"
              style={{ fontSize: '0.625rem' }}
            >
              Week 12 &middot; Week 3 on Chapter 1, §4 &middot; 38 annotations &middot; 6 active threads &middot; Next session Tuesday 7pm
            </p>

            <div
              className="pt-3 mb-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <p className="text-eyebrow mb-3">Where the group&rsquo;s attention is</p>
              <div className="space-y-1">
                {[
                  { count: 14, label: '§1 The Two Factors of a Commodity', tag: '+2 today' },
                  { count: 11, label: '§4 The Fetishism of Commodities', tag: '+1 today' },
                  { count: 6, label: '§2 The Two-fold Character of Labour', tag: null },
                  { count: 3, label: '§3 The Form of Value', tag: null },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span
                      className="font-semibold"
                      style={{
                        color: 'var(--text-primary)',
                        minWidth: '2rem',
                        textAlign: 'right',
                      }}
                    >
                      {row.count}
                    </span>
                    <div
                      className="flex-1 rounded-sm"
                      style={{
                        height: '6px',
                        backgroundColor: 'rgba(var(--accent-purple-rgb, 92, 61, 143), 0.2)',
                      }}
                    >
                      <div
                        style={{
                          width: `${(row.count / 14) * 100}%`,
                          height: '100%',
                          backgroundColor: 'var(--accent-purple)',
                          borderRadius: 'inherit',
                        }}
                      />
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {row.label}
                    </span>
                    {row.tag && (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--accent-red)' }}
                      >
                        {row.tag}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="pt-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <p className="text-eyebrow mb-2">The group is thinking about this week</p>
              <blockquote
                className="text-sm italic pl-3"
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  color: 'var(--text-primary)',
                  borderLeft: '2px solid var(--accent-purple)',
                }}
              >
                &ldquo;A commodity appears, at first sight, a very trivial thing, and easily understood. Its analysis shows that it is, in reality, a very queer thing.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. MORE TO EXPLORE ─────────────────────────────────── */}
      <section
        ref={setRef(6)}
        className="welcome-section relative"
        aria-label="More to explore"
      >
        <p className="welcome-section-marker text-eyebrow">06 / More to explore</p>

        <div className="welcome-visual w-full max-w-2xl text-center">
          <p className="text-eyebrow mb-4">The rest, briefly</p>
          <h2
            className="text-display-md mb-8"
            style={{ color: 'var(--text-primary)' }}
          >
            Other parts of the platform you&rsquo;ll find as you go.
          </h2>
          <p
            className="text-base mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            The glossary collects every concept the group has worked through. The journal is your private space for longer thinking. Autosaved, only visible to you. The schedule shows when you&rsquo;ll meet next, and where the group is in the reading. Threads are where conversations continue beyond the chapter view. Resources hold the secondary readings the host references during sessions.
          </p>
          <p
            className="text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            You&rsquo;ll find the rest as you go. The platform shows you what&rsquo;s relevant when you arrive.
          </p>
        </div>
      </section>

      {/* ── 7. WHAT THIS ISN'T ──────────────────────────────────── */}
      <section
        ref={setRef(7)}
        className="welcome-section relative"
        aria-label="What this isn't"
      >
        <p className="welcome-section-marker text-eyebrow">07 / What this isn&rsquo;t</p>

        <div className="welcome-visual w-full max-w-2xl text-center">
          <p className="text-eyebrow mb-4">A platform built to be quiet</p>
          <h2
            className="text-display-md mb-8"
            style={{ color: 'var(--text-primary)' }}
          >
            No streaks. No notifications. No leaderboards.
          </h2>
          <div
            className="space-y-4 text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            <p>
              Nothing is pushing you to read. The chapter is there when you sit down with it.
            </p>
            <p>
              No reward for finishing chapters. No public count of your contributions. No notifications nagging you between sessions. The session itself is the deadline.
            </p>
            <p>
              The platform doesn&rsquo;t measure you. It measures whether the reading is happening, together, and stays out of the way.
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. READY ───────────────────────────────────────────── */}
      <section
        ref={setRef(8)}
        className="welcome-section relative"
        aria-label="Ready"
      >
        <p className="welcome-section-marker text-eyebrow">08 / Ready</p>

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
            {sessionDayPlural ? <>Meet {sessionDayPlural.replace(/s$/, '')}.</> : <>Meet weekly.</>}
            <span className="block">About 30 pages first.</span>
          </h2>
          <p
            className="text-base sm:text-lg mb-10 max-w-md mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Read the chapter before the next meeting. Bring what you&rsquo;ve got. Even half-formed is something to work with.
          </p>

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
