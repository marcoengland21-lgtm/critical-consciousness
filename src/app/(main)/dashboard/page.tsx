import { createClient, getSessionUser } from '@/lib/supabase/server'
import { getCurrentGroupOrThrow } from '@/lib/group-resolver'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import HeroQuoteCallout, {
  type HeroQuotePassage,
} from '@/components/dashboard/HeroQuoteCallout'
import AttentionMagnitudeBars, {
  type SectionAttention,
} from '@/components/dashboard/AttentionMagnitudeBars'
import ThreadsList, {
  type ThreadRow,
} from '@/components/dashboard/ThreadsList'
import RhythmWidget from '@/components/dashboard/RhythmWidget'
import WhereStuckWidget, {
  type StuckParagraph,
} from '@/components/dashboard/WhereStuckWidget'
import ConceptsThisWeekWidget, {
  type ConceptItem,
} from '@/components/dashboard/ConceptsThisWeekWidget'
import CaptureThoughtAffordance from '@/components/dashboard/CaptureThoughtAffordance'
import BigStatTile from '@/components/dashboard/BigStatTile'
import { getChapterLabel } from '@/lib/chapter-utils'
import type { ThreadType, WeeklyRoleType } from '@/types/database'

const DOC_SLUG = 'capital-vol-1'

interface WeekRow {
  id: string
  week_number: number
  title: string
  due_date: string
  session_date: string | null
  weekly_roles?: { id: string; role_type: string; user: { id: string; display_name: string } | null }[]
}

interface AnnotationRow {
  id: string
  body: string
  quote_exact: string
  position_start: number
  position_end: number
  created_at: string
  author_id: string
  chapter_id: string
}

interface ChapterRow {
  id: string
  chapter_number: number
  title: string
  week_id: string | null
  content: string
}

interface RecentReply {
  id: string
  created_at: string
  annotation_id: string
  author: { display_name: string } | null
}

interface ThreadJoin {
  id: string
  title: string
  thread_type: string
  created_at: string
  pinned: boolean
  author: { display_name: string } | null
  replies: { count: number }[]
}

/**
 * Dashboard — chunk 3b piece 4. The 13D rebuild.
 *
 * Server-side fetch + assemble. Layout per frame 13D:
 *   - DashboardHeader: greeting + orientation + group-name eyebrow
 *   - Two-column layout (lg+): main column + pedagogical right rail
 *   - Mobile (<lg): single column with 2x2 stat grid + collapsed
 *     right-rail content inline below threads
 *   - Capture-a-thought modal triggered from the right rail / inline
 *     mobile section.
 *
 * SystemStatusStrip is suppressed on /dashboard via the `(main)`
 * layout's pathname check — the integrated header here carries the
 * same info.
 *
 * Group-name eyebrow reads from `groups.name` (Mars's naming
 * addendum: "for the launch group: 'Watermelon'"). Falls back to
 * "Capital Study Group" platform brand if the row hasn't been
 * seeded.
 */
export default async function DashboardPage({
  searchParams,
}: {
  // Next.js 15+ App Router types searchParams as a Promise.
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getSessionUser()
  const supabase = await createClient()
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const now = new Date()
  const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z')
  const todayISO = today.toISOString()

  // Resolve the user's current group via membership (chunk 3b L1).
  // For unauthenticated users, fall back to a no-data state — the
  // (main) layout already redirects to /login pre-render but we
  // guard defensively so the dashboard doesn't crash mid-build.
  if (!user) {
    return (
      <div className="text-sm text-center py-12" style={{ color: 'var(--text-secondary)' }}>
        Please sign in.
      </div>
    )
  }
  const group = await getCurrentGroupOrThrow(supabase, user.id, {
    searchParams: resolvedSearchParams,
  })

  // ── Parallel batch ──────────────────────────────────────────────
  const [
    { data: profile },
    { data: allWeeksData },
    { data: allChaptersData },
    { data: recentThreads },
    { data: chapterAnnotations },
    { data: recentReplies },
    { data: confusionRows },
    { data: introducedTerms },
    recentJournalRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, role')
      .eq('id', user.id)
      .single(),

    supabase
      .from('reading_schedule')
      .select(`
        id, week_number, title, due_date, session_date,
        weekly_roles(id, role_type, user:profiles!user_id(id, display_name))
      `)
      .eq('group_id', group.groupId)
      .order('week_number', { ascending: true }),

    supabase
      .from('text_chapters')
      .select('id, chapter_number, title, week_id, content')
      .order('chapter_number', { ascending: true }),

    supabase
      .from('threads')
      .select(`
        id, title, thread_type, created_at, pinned,
        author:profiles!author_id(display_name),
        replies:replies(count)
      `)
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Annotations across all chapters in this group. RLS additionally
    // enforces is_public = true OR author_id = auth.uid() per chunk
    // 3b piece 2c-i — drafts only visible to their author.
    supabase
      .from('annotations')
      .select('id, body, quote_exact, position_start, position_end, created_at, author_id, chapter_id')
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: false })
      .limit(200),

    // Latest reply per recent annotation — for the hero's
    // "last reply 2h ago by Liz" gloss.
    supabase
      .from('annotation_replies')
      .select(`
        id, created_at, annotation_id,
        author:profiles!author_id(display_name)
      `)
      .eq('group_id', group.groupId)
      .order('created_at', { ascending: false })
      .limit(50),

    // Confusion counts in this group's chapters. confusion_counts.group_id
    // added in L1 migration; filter is now native rather than via
    // post-hoc chapter membership check.
    supabase
      .from('confusion_counts')
      .select('chapter_id, paragraph_index, count')
      .eq('group_id', group.groupId)
      .gt('count', 0)
      .order('count', { ascending: false }),

    // Glossary entries for this group — filtered to current week below.
    supabase
      .from('glossary_entries')
      .select('id, term, definition, first_appearance_week')
      .eq('group_id', group.groupId),

    // Most-recent journal entry for the user — used by the capture
    // affordance's preview row. private_notes is user-scoped, NOT
    // group-scoped, so no group filter.
    supabase
      .from('private_notes')
      .select('id, title, body_text, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1),
  ])

  // ── Group + greeting ────────────────────────────────────────────
  // Group name comes from the resolver (chunk 3b L1). Fallback only
  // matters in the no-membership case which is short-circuited above.
  const groupName: string = group.name
  const displayName = profile?.display_name || 'there'
  const nzHourStr = now.toLocaleString('en-NZ', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'Pacific/Auckland',
  })
  const nzHour = parseInt(nzHourStr, 10)
  const greeting = nzHour < 12 ? 'Good morning' : nzHour < 17 ? 'Good afternoon' : 'Good evening'
  const greetingText = user
    ? `${greeting}, ${displayName}`
    : 'Welcome to Capital Study Group'

  // ── Current week — first upcoming OR last past, matching schedule logic ──
  const allWeeks = (allWeeksData || []) as unknown as WeekRow[]
  const totalWeeks = allWeeks.length
  const currentWeek =
    allWeeks.find((w) => new Date(w.due_date) >= now) ||
    allWeeks[allWeeks.length - 1] ||
    null

  const allChapters = (allChaptersData || []) as unknown as ChapterRow[]
  const annotationsList = (chapterAnnotations || []) as unknown as AnnotationRow[]

  // Pre-compute chapter lookup by id.
  const chapterById = new Map<string, ChapterRow>()
  for (const c of allChapters) chapterById.set(c.id, c)

  // ── Orientation line ────────────────────────────────────────────
  let orientation: string | null = null
  if (currentWeek) {
    const parts: string[] = [`Week ${currentWeek.week_number} of ${totalWeeks}`]
    if (currentWeek.title) parts.push(`Reading ${currentWeek.title}`)

    const weekChapters = allChapters.filter((c) => c.week_id === currentWeek.id)
    const weekChapterIds = new Set(weekChapters.map((c) => c.id))
    const weekAnnotations = annotationsList.filter((a) =>
      weekChapterIds.has(a.chapter_id)
    )
    const sectionsTouched = new Set(weekAnnotations.map((a) => a.chapter_id)).size
    if (weekAnnotations.length > 0) {
      parts.push(
        `${weekAnnotations.length} ${weekAnnotations.length === 1 ? 'annotation' : 'annotations'} across ${sectionsTouched} ${sectionsTouched === 1 ? 'section' : 'sections'}`
      )
    }
    const activeThreadCount = (recentThreads || []).length
    if (activeThreadCount > 0) {
      parts.push(`${activeThreadCount} active threads`)
    }
    if (currentWeek.session_date) {
      const d = new Date(currentWeek.session_date)
      const day = d.toLocaleString('en-NZ', {
        weekday: 'long',
        timeZone: 'Pacific/Auckland',
      })
      const time = d
        .toLocaleString('en-NZ', { hour: 'numeric', hour12: true, timeZone: 'Pacific/Auckland' })
        .replace(/\s/g, '')
        .toLowerCase()
      const daysUntil = Math.max(
        0,
        Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      )
      const countdown =
        daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
      parts.push(`Next session ${day} ${time}, ${countdown}`)
    }
    orientation = parts.join(' · ')
  }

  // ── Days until session (Rhythm) ─────────────────────────────────
  let daysUntilSession: number | null = null
  if (currentWeek?.session_date) {
    const d = new Date(currentWeek.session_date)
    daysUntilSession = Math.max(
      0,
      Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
  }

  // ── Roles (mine + others) ───────────────────────────────────────
  const weeklyRoles = (currentWeek?.weekly_roles || []) as unknown as {
    id: string
    role_type: string
    user: { id: string; display_name: string } | null
  }[]
  const myRoleEntry = weeklyRoles.find((r) => r.user?.id === user?.id)
  const myRole: WeeklyRoleType | null = myRoleEntry
    ? (myRoleEntry.role_type as WeeklyRoleType)
    : null
  const otherRoles = weeklyRoles
    .filter((r) => r.user?.id !== user?.id && r.user)
    .map((r) => ({
      authorName: r.user!.display_name,
      roleType: r.role_type as WeeklyRoleType,
    }))

  // ── Hero quote: most-discussed passage, recency tie-break ────────
  const repliesList = (recentReplies || []) as unknown as RecentReply[]
  const latestReplyByAnnotationId = new Map<string, { ts: string; author: string | null }>()
  for (const r of repliesList) {
    const cur = latestReplyByAnnotationId.get(r.annotation_id)
    if (!cur || r.created_at > cur.ts) {
      latestReplyByAnnotationId.set(r.annotation_id, {
        ts: r.created_at,
        author: r.author?.display_name ?? null,
      })
    }
  }
  const passageGroups = new Map<
    string,
    {
      quote: string
      count: number
      chapterNumber: number
      chapterId: string
      lastActivity: string
      lastReplyAuthor: string | null
    }
  >()
  for (const ann of annotationsList) {
    const key = ann.quote_exact
    const annLatestReply = latestReplyByAnnotationId.get(ann.id)
    const lastActivity = annLatestReply?.ts ?? ann.created_at
    const lastReplyAuthor = annLatestReply?.author ?? null
    const existing = passageGroups.get(key)
    if (existing) {
      existing.count++
      if (lastActivity > existing.lastActivity) {
        existing.lastActivity = lastActivity
        existing.lastReplyAuthor = lastReplyAuthor
      }
    } else {
      passageGroups.set(key, {
        quote: key,
        count: 1,
        chapterNumber: chapterById.get(ann.chapter_id)?.chapter_number || 0,
        chapterId: ann.chapter_id,
        lastActivity,
        lastReplyAuthor,
      })
    }
  }
  const heroSorted = Array.from(passageGroups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return b.lastActivity.localeCompare(a.lastActivity)
  })
  let heroPassage: HeroQuotePassage | null = null
  if (heroSorted[0] && heroSorted[0].count >= 2) {
    const top = heroSorted[0]
    const lbl = getChapterLabel(top.chapterNumber).label
    const dt = new Date(top.lastActivity).getTime()
    const diffMs = Math.max(0, now.getTime() - dt)
    const diffH = Math.floor(diffMs / (1000 * 60 * 60))
    const diffD = Math.floor(diffH / 24)
    const relTime =
      diffH < 1 ? 'just now' : diffD < 1 ? `${diffH}h ago` : `${diffD}d ago`
    heroPassage = {
      quote: top.quote,
      annotationCount: top.count,
      chapterRef: lbl,
      documentSlug: DOC_SLUG,
      chapterNumber: top.chapterNumber,
      lastActivityGloss: top.lastReplyAuthor
        ? `${relTime} by ${top.lastReplyAuthor}`
        : relTime,
    }
  }

  // ── Magnitude bars: per-section in current week's chapters ──────
  const sectionsForBars = currentWeek
    ? allChapters.filter((c) => c.week_id === currentWeek.id)
    : allChapters.slice(0, 6)
  const sections: SectionAttention[] = sectionsForBars.map((c) => {
    const inSection = annotationsList.filter((a) => a.chapter_id === c.id)
    const todayCount = inSection.filter((a) => a.created_at >= todayISO).length
    const yoursCount = user
      ? inSection.filter((a) => a.author_id === user.id).length
      : 0
    return {
      chapterId: c.id,
      chapterNumber: c.chapter_number,
      sectionLabel: `§${c.chapter_number}`,
      title: c.title,
      totalCount: inSection.length,
      todayCount,
      yoursCount,
      documentSlug: DOC_SLUG,
    }
  })
  sections.sort((a, b) => b.totalCount - a.totalCount)
  const sectionsTotalAnnotations = sections.reduce((s, x) => s + x.totalCount, 0)

  const scopeLabel = currentWeek
    ? `Capital Vol 1, ${getChapterLabel(sectionsForBars[0]?.chapter_number ?? 1).label.split(',')[0]}`
    : 'Capital Vol 1'
  const primaryReadingHref = currentWeek && sectionsForBars[0]
    ? `/reading/${DOC_SLUG}/${sectionsForBars[0].chapter_number}`
    : `/reading`

  // ── Threads list ────────────────────────────────────────────────
  const threadsForList: ThreadRow[] = ((recentThreads || []) as unknown as ThreadJoin[]).map((t) => ({
    id: t.id,
    title: t.title,
    thread_type: t.thread_type as ThreadType,
    created_at: t.created_at,
    pinned: t.pinned,
    author: t.author,
    reply_count: t.replies?.[0]?.count ?? 0,
  }))

  // ── Where we're stuck — confusion_counts in current week's chapters ──
  const weekChapterIdSet = currentWeek
    ? new Set(sectionsForBars.map((c) => c.id))
    : new Set<string>()
  const stuck: StuckParagraph[] = ((confusionRows || []) as { chapter_id: string; paragraph_index: number; count: number }[])
    .filter((row) => weekChapterIdSet.size === 0 || weekChapterIdSet.has(row.chapter_id))
    .slice(0, 3)
    .map((row) => {
      const chapter = chapterById.get(row.chapter_id)
      let excerpt = ''
      if (chapter?.content) {
        const paragraphs = chapter.content.split('\n\n')
        const para = paragraphs[row.paragraph_index] ?? ''
        excerpt = para.slice(0, 80).replace(/\s+\S*$/, '')
      }
      return {
        chapterId: row.chapter_id,
        chapterNumber: chapter?.chapter_number ?? 0,
        paragraphIndex: row.paragraph_index,
        flagCount: row.count,
        excerpt: excerpt || '…',
        documentSlug: DOC_SLUG,
      }
    })
    .filter((p) => p.chapterNumber > 0)

  // ── Concepts this week ──────────────────────────────────────────
  const concepts: ConceptItem[] = currentWeek
    ? ((introducedTerms || []) as { id: string; term: string; definition: string; first_appearance_week: string | null }[])
        .filter((t) => t.first_appearance_week === currentWeek.id)
        .slice(0, 4)
        .map((t) => ({
          id: t.id,
          term: t.term,
          shortDefinition: firstSentence(t.definition).slice(0, 80),
        }))
    : []

  // ── Mobile big-stat tiles ───────────────────────────────────────
  const sectionTile = currentWeek ? `Wk ${currentWeek.week_number}` : '—'
  const annotationsTile = String(sectionsTotalAnnotations)
  const threadsTile = String(threadsForList.length)
  let sessionTile = '—'
  if (currentWeek?.session_date) {
    const d = new Date(currentWeek.session_date)
    const day = d.toLocaleString('en-NZ', { weekday: 'short', timeZone: 'Pacific/Auckland' })
    const time = d
      .toLocaleString('en-NZ', { hour: 'numeric', hour12: true, timeZone: 'Pacific/Auckland' })
      .replace(/\s/g, '')
      .toLowerCase()
    sessionTile = `${day} ${time}`
  }

  // ── Recent journal preview ──────────────────────────────────────
  let recentJournalPreview: {
    id: string
    title: string | null
    excerpt: string
    timeAgo: string
  } | null = null
  const recentJournalData = (recentJournalRes as { data: { id: string; title: string | null; body_text: string; updated_at: string }[] | null }).data
  if (recentJournalData && recentJournalData[0]) {
    const r = recentJournalData[0]
    recentJournalPreview = {
      id: r.id,
      title: r.title,
      excerpt: r.body_text.slice(0, 60),
      timeAgo: relTimeAgo(new Date(r.updated_at), now),
    }
  }

  return (
    <div className="stagger-children">
      <DashboardHeader
        greeting={greetingText}
        groupName={groupName}
        orientation={orientation}
      />

      {/* Mobile-only 2x2 big-stat grid (frame 13D-mobile). */}
      {currentWeek && (
        <div
          className="grid grid-cols-2 mb-8 lg:hidden"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="border-r border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <BigStatTile value={sectionTile} caption="Current Week" />
          </div>
          <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <BigStatTile value={annotationsTile} caption="Annotations" />
          </div>
          <div className="border-r" style={{ borderColor: 'var(--border-subtle)' }}>
            <BigStatTile value={threadsTile} caption="Threads" href="/threads" />
          </div>
          <div>
            <BigStatTile value={sessionTile} caption="Next Session" href="/schedule" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-8">
          <HeroQuoteCallout passage={heroPassage} />

          <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

          <AttentionMagnitudeBars
            sections={sections}
            totalAnnotations={sectionsTotalAnnotations}
            scopeLabel={scopeLabel}
            primaryReadingHref={primaryReadingHref}
          />

          <ThreadsList threads={threadsForList} />

          {/* Mobile-only: collapsed right rail content inline. */}
          <div className="lg:hidden space-y-6">
            <RhythmWidget
              daysUntilSession={daysUntilSession}
              myRole={myRole}
              otherRoles={otherRoles}
            />
            <WhereStuckWidget paragraphs={stuck} />
            <ConceptsThisWeekWidget concepts={concepts} />
            {user && (
              <CaptureThoughtAffordance
                userId={user.id}
                recent={recentJournalPreview}
              />
            )}
          </div>
        </div>

        {/* Right rail (lg+ only) */}
        <aside className="space-y-8 hidden lg:block">
          <RhythmWidget
            daysUntilSession={daysUntilSession}
            myRole={myRole}
            otherRoles={otherRoles}
          />
          <WhereStuckWidget paragraphs={stuck} />
          <ConceptsThisWeekWidget concepts={concepts} />
          {user && (
            <CaptureThoughtAffordance
              userId={user.id}
              recent={recentJournalPreview}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]+[.!?]/)
  return m ? m[0].trim() : s
}

function relTimeAgo(then: Date, now: Date): string {
  const diff = Math.max(0, now.getTime() - then.getTime())
  const min = Math.floor(diff / (1000 * 60))
  if (min < 60) return min < 1 ? 'just now' : `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}
