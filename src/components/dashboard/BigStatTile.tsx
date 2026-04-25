import Link from 'next/link'

interface BigStatTileProps {
  /** The big number / glyph / short string. Empty or '—' shows as muted. */
  value: string | number
  /** Caption below the value — short, all-caps, eyebrow style. */
  caption: string
  /** Optional href — wraps the tile in a Link if provided. */
  href?: string
  /** Optional ARIA label override (defaults to '<caption>: <value>'). */
  ariaLabel?: string
}

/**
 * Big-stat tile for the dashboard's top status row.
 * Per IMPROVEMENTS_PLAN §2.5 + §5.1.3. Big number in Lora italic at ~2.5rem,
 * eyebrow caption below. Hairline-divided in a horizontal row, no card box.
 *
 * The tile reads as 'editorial magazine pull-quote' rather than 'KPI dashboard
 * widget' — by intent, per §2.5.
 */
export default function BigStatTile({ value, caption, href, ariaLabel }: BigStatTileProps) {
  const isEmpty = value === '—' || value === '' || value === 0
  const label = ariaLabel ?? `${caption}: ${value}`

  const content = (
    <div className="flex flex-col items-start py-3" aria-label={label}>
      <span
        className="text-display-lg leading-none mb-2"
        style={{
          color: isEmpty ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <span className="text-eyebrow">
        {caption}
      </span>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block transition-colors hover-bg-themed rounded-md px-2 -mx-2"
        style={{ textDecoration: 'none' }}
      >
        {content}
      </Link>
    )
  }
  return content
}
