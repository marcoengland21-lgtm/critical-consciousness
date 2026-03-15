/**
 * Confusion Flags — Genuinely Anonymous
 *
 * CLAUDE.md Rule 24: "Confusion flags are genuinely anonymous at the database level.
 * Not just 'hidden' — store counts only, not user IDs."
 *
 * The database stores ONLY counts per paragraph (confusion_counts table).
 * Client-side localStorage tracks what the current browser has flagged.
 * Even with full database access, there's no way to determine who flagged what.
 */

import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'ccp-confusion-flags'

// ── localStorage helpers ──────────────────────────────────────────────

/** Get the set of paragraph indices this browser has flagged for a chapter */
function getLocalFlags(chapterId: string): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Set()
    const parsed = JSON.parse(stored)
    const flagged = parsed[chapterId]
    return flagged ? new Set(flagged) : new Set()
  } catch {
    return new Set()
  }
}

/** Save flagged paragraph indices for a chapter */
function setLocalFlags(chapterId: string, flags: Set<number>) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    parsed[chapterId] = Array.from(flags)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage errors
  }
}

// ── Public API ────────────────────────────────────────────────────────

/** Toggle a confusion flag for a paragraph. Returns new count and flag state. */
export async function toggleConfusionFlag(
  chapterId: string,
  paragraphIndex: number
): Promise<{ count: number; isSet: boolean }> {
  const supabase = createClient()
  const localFlags = getLocalFlags(chapterId)
  const wasSet = localFlags.has(paragraphIndex)

  if (wasSet) {
    // Decrement — user is un-flagging this paragraph
    const { data, error } = await supabase.rpc('decrement_confusion', {
      p_chapter_id: chapterId,
      p_paragraph_index: paragraphIndex,
    })

    if (error) {
      console.error('[CCP] Failed to decrement confusion flag:', error)
      throw error
    }

    localFlags.delete(paragraphIndex)
    setLocalFlags(chapterId, localFlags)

    return { count: data ?? 0, isSet: false }
  } else {
    // Increment — user is flagging this paragraph
    const { data, error } = await supabase.rpc('increment_confusion', {
      p_chapter_id: chapterId,
      p_paragraph_index: paragraphIndex,
    })

    if (error) {
      console.error('[CCP] Failed to increment confusion flag:', error)
      throw error
    }

    localFlags.add(paragraphIndex)
    setLocalFlags(chapterId, localFlags)

    return { count: data ?? 1, isSet: true }
  }
}

/** Get confusion flag counts for all paragraphs in a chapter */
export async function getConfusionFlagCounts(
  chapterId: string
): Promise<Map<number, number>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('confusion_counts')
    .select('paragraph_index, count')
    .eq('chapter_id', chapterId)

  if (error) {
    console.error('[CCP] Error fetching confusion counts:', error)
    return new Map()
  }

  if (!data) return new Map()

  const counts = new Map<number, number>()
  for (const row of data) {
    if (row.count > 0) {
      counts.set(row.paragraph_index, row.count)
    }
  }

  return counts
}

/** Get which paragraphs this browser has flagged (from localStorage) */
export async function getUserConfusionFlags(
  chapterId: string
): Promise<Set<number>> {
  // Purely client-side — no database query needed
  return getLocalFlags(chapterId)
}
