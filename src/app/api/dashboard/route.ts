import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * API route for deferred dashboard data.
 * Returns recent threads, annotations, activity counts, and milestones.
 * This data loads client-side AFTER the critical dashboard shell renders,
 * so the page feels instant even though these 5 queries still run.
 */
export async function GET() {
  const supabase = await createClient()

  const now = new Date()
  const currentDay = now.getDay()
  const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
  const weekStart = new Date(now)
  weekStart.setDate(diff)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  const weekStartISO = weekStart.toISOString()
  const weekEndISO = weekEnd.toISOString()

  const [
    { data: recentThreads },
    { data: recentAnnotations },
    { data: milestoneData },
    { count: weekAnnotationCount },
    { count: weekThreadCount },
    { count: weekGlossaryCount },
  ] = await Promise.all([
    supabase.from('threads').select(`
      id, title, thread_type, created_at, pinned,
      author:profiles!author_id(display_name),
      replies:replies(count)
    `).order('created_at', { ascending: false }).limit(5),
    supabase.from('annotations').select(`
      id, body, chapter_id,
      chapter:text_chapters!chapter_id(chapter_number, title)
    `).order('created_at', { ascending: false }).limit(20),
    supabase.from('reading_milestones').select('id, week_number, title, description, reflection_prompt').order('week_number', { ascending: false }).limit(10),
    supabase.from('annotations').select('*', { count: 'exact', head: true }).gte('created_at', weekStartISO).lte('created_at', weekEndISO),
    supabase.from('threads').select('*', { count: 'exact', head: true }).gte('created_at', weekStartISO).lte('created_at', weekEndISO),
    supabase.from('glossary_entries').select('*', { count: 'exact', head: true }).gte('created_at', weekStartISO).lte('created_at', weekEndISO),
  ])

  return NextResponse.json({
    recentThreads: recentThreads || [],
    recentAnnotations: recentAnnotations || [],
    milestoneData: milestoneData || [],
    weekAnnotationCount: weekAnnotationCount || 0,
    weekThreadCount: weekThreadCount || 0,
    weekGlossaryCount: weekGlossaryCount || 0,
  }, {
    headers: {
      // Cache for 60s, serve stale while revalidating for up to 5 min.
      // For ~8 users this means most hits are instant cache reads.
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
