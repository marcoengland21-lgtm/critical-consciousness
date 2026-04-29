import { redirect } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroup } from '@/lib/group-resolver'
import GlossaryList from '@/components/glossary/GlossaryList'
import type { ConceptEdgeType } from '@/types/database'

// Query-specific join shapes for Supabase responses — hint joins can return arrays
interface VersionRow {
  id: string
  entry_id: string
  definition: string
  updated_by: string
  created_at: string
  author: { display_name: string } | { display_name: string }[] | null
}

interface CommentRow {
  id: string
  entry_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author: { display_name: string } | { display_name: string }[] | null
}

interface ConceptEdgeRow {
  id: string
  from_term_id: string
  to_term_id: string
  edge_type: ConceptEdgeType
  note: string | null
  created_by: string
  created_at: string
  creator: { display_name: string } | { display_name: string }[] | null
}

export const revalidate = 3600

export const metadata = {
  title: 'Glossary | Capital Study Group',
}

export default async function GlossaryPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const supabase = await createClient()
  const group = await getCurrentGroup(supabase, user.id)
  if (!group) redirect('/login')

  // All queries in parallel, scoped to active group via group_id.
  // RLS additionally enforces at DB layer. Schedule modes (recurring
  // v1) swaps reading_schedule fetch for text_chapters fetch — sort
  // groupings + new-entry "first appears in" dropdown anchor to
  // chapters, not weeks. text_chapters is shared text (not group-
  // scoped), so no group filter on the chapters query.
  const [{ data: entries }, { data: profile }, { data: chapters }, { data: versions }, { data: comments }, { data: conceptEdges }] = await Promise.all([
    supabase
      .from('glossary_entries')
      .select('*, creator:profiles!created_by(display_name)')
      .eq('group_id', group.groupId)
      .order('term', { ascending: true }),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('text_chapters')
      .select('id, chapter_number, title, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('glossary_versions')
      .select('id, entry_id, definition, updated_by, created_at, author:profiles!updated_by(display_name)')
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: true }),
    supabase
      .from('glossary_comments')
      .select('id, entry_id, author_id, body, created_at, updated_at, author:profiles!author_id(display_name)')
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: true }),
    supabase
      .from('concept_edges')
      .select('id, from_term_id, to_term_id, edge_type, note, created_by, created_at, creator:profiles!created_by(display_name)')
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: true }),
  ])

  // Supabase hint joins (profiles!updated_by) return author as an array — flatten to single object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedVersions = ((versions || []) as unknown as VersionRow[]).map((v) => ({
    ...v,
    author: (Array.isArray(v.author) ? v.author[0] : v.author) || undefined,
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedComments = ((comments || []) as unknown as CommentRow[]).map((c) => ({
    ...c,
    author: (Array.isArray(c.author) ? c.author[0] : c.author) || undefined,
  }))
  const normalizedEdges = ((conceptEdges || []) as unknown as ConceptEdgeRow[]).map((e) => ({
    ...e,
    creator: (Array.isArray(e.creator) ? e.creator[0] : e.creator) || null,
  }))

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow mb-2">Shared Vocabulary</p>
          <h1 className="text-display-lg" style={{ color: 'var(--text-primary)' }}>
            Glossary
          </h1>
        </div>
        {/* Concept map link (§3.4) — surfaced from the Glossary destination
            rather than as a peer sidebar item, since the map is a view of
            the glossary's relational data, not a separate destination. */}
        <a
          href="/concepts"
          className="text-xs font-medium shrink-0"
          style={{ color: 'var(--accent-red)' }}
        >
          View concept map →
        </a>
      </div>
      <GlossaryList
        entries={entries || []}
        currentUserId={user.id}
        isAdmin={profile?.role === 'admin'}
        chapters={chapters || []}
        versions={normalizedVersions}
        comments={normalizedComments}
        conceptEdges={normalizedEdges}
        groupId={group.groupId}
      />
    </div>
  )
}
