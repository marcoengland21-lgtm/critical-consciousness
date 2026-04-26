import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import JournalEditor from './JournalEditor'

interface QuickCaptureCardProps {
  userId: string
}

/**
 * QuickCaptureCard — dashboard right-rail journal panel.
 *
 * Per chunk 2 part 2 brief: replaces the previous 'Your Reflection' stub
 * (which felt cramped and like an afterthought). Now a substantial panel:
 * heading + privacy subheading + compact editor + a small drafts indicator.
 *
 * Server component so we can show the user's draft count without a client
 * round-trip on every dashboard render.
 */
export default async function QuickCaptureCard({ userId }: QuickCaptureCardProps) {
  const supabase = await createClient()

  // Count the user's existing journal entries — RLS ensures only theirs.
  // Used for the "N entries" indicator that links to the full /journal page.
  const { count: entryCount } = await supabase
    .from('private_notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return (
    <section
      className="px-4 py-5 rounded-lg"
      style={{
        backgroundColor: 'var(--bg-card-alt)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header — heading + privacy reminder */}
      <div className="mb-3">
        <h3
          className="mb-1"
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Lora', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: '1.5rem',
            lineHeight: 1.2,
          }}
        >
          Journal
        </h3>
        <p className="text-eyebrow">Private — only you can see this</p>
      </div>

      {/* Compact Tiptap editor — basic toolbar only (bold/italic/link), no
          modals (per chunk 2.5 §6). Each save creates a brand-new entry
          (initialId = null) so the dashboard quick-capture is always
          'jot a fresh thought'. */}
      <JournalEditor
        initialId={null}
        initialTitle=""
        initialBodyJson={{ type: 'doc', content: [] }}
        userId={userId}
        showTitle={false}
        compactToolbar
        bodyPlaceholder="Write a quick thought, leave a question for yourself, or jot something you noticed…"
        minHeight={200}
      />

      {/* Footer — entry count + open journal link */}
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {entryCount && entryCount > 0 ? (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
        ) : (
          <span />
        )}
        <Link
          href="/journal"
          className="text-xs font-medium"
          style={{ color: 'var(--accent-red)' }}
        >
          Open journal →
        </Link>
      </div>
    </section>
  )
}
