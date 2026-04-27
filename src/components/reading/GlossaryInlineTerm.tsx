'use client'

/**
 * GlossaryInlineTerm — chunk 3b piece 2b.
 *
 * Wraps a glossary-tagged term in chapter prose. Two interactions on
 * the same trigger element:
 *   - Hover (desktop) → small tooltip per frame 05: "TERM · GLOSSARY"
 *     eyebrow + one-line definition. No close, no related terms.
 *   - Click → opens the richer GlossaryPopover (managed by ChapterReader)
 *     and explicitly dismisses any open tooltip via Tooltip's
 *     onClick auto-dismiss (chunk 3b piece 2b primitive update).
 *
 * The placeholder treatment is the existing single-underline. Round 5
 * design will replace this with a refined treatment; for 2b this ships
 * as-is per Piece 5 of the brief.
 */

import { Tooltip } from '@/components/overlay'

interface GlossaryInlineTermProps {
  term: string
  /** One-line definition for the hover tooltip. */
  shortDefinition: string
  /** Click handler — opens the GlossaryPopover at the chapter level. */
  onClick: (e: React.MouseEvent<HTMLSpanElement>) => void
  children: React.ReactNode
}

export default function GlossaryInlineTerm({
  term,
  shortDefinition,
  onClick,
  children,
}: GlossaryInlineTermProps) {
  return (
    <Tooltip
      scope="body"
      content={
        <div>
          <p className="text-eyebrow mb-1" style={{ color: 'var(--accent-purple)' }}>
            {term} · Glossary
          </p>
          <p style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {shortDefinition}
          </p>
        </div>
      }
      maxWidth={280}
    >
      <span
        onClick={onClick}
        className="glossary-inline-term cursor-pointer"
        style={{
          textDecoration: 'underline',
          textDecorationStyle: 'solid',
          textDecorationThickness: '1px',
          textDecorationColor: 'var(--accent-purple)',
          textUnderlineOffset: '0.18em',
        }}
        role="button"
        tabIndex={0}
        aria-label={`${term} — glossary term, click for definition`}
      >
        {children}
      </span>
    </Tooltip>
  )
}
