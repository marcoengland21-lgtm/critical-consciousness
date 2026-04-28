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
// L1: keys are namespaced by groupId so a user who participates in
// multiple groups doesn't have flags bleed across them.

function makeKey(chapterId: string, groupId: string): string {
  return `${groupId}::${chapterId}`
}

/** Get the set of paragraph indices this browser has flagged for a chapter (per group) */
function getLocalFlags(chapterId: string, groupId: string): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Set()
    const parsed = JSON.parse(stored)
    const flagged = parsed[makeKey(chapterId, groupId)]
    return flagged ? new Set(flagged) : new Set()
  } catch {
    return new Set()
  }
}

/** Save flagged paragraph indices for a chapter (per group) */
function setLocalFlags(chapterId: string, groupId: string, flags: Set<number>) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    parsed[makeKey(chapterId, groupId)] = Array.from(flags)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage errors
  }
}

// ── Public API ────────────────────────────────────────────────────────

/** Toggle a confusion flag for a paragraph. Returns new count and flag state.
 *  L1: groupId scopes the flag to the active study group; the RPC enforces
 *  membership at the DB layer (and is_group_member is in the increment_confusion
 *  body). */
export async function toggleConfusionFlag(
  chapterId: string,
  paragraphIndex: number,
  groupId: string
): Promise<{ count: number; isSet: boolean }> {
  const supabase = createClient()
  const localFlags = getLocalFlags(chapterId, groupId)
  const wasSet = localFlags.has(paragraphIndex)

  if (wasSet) {
    // Decrement — user is un-flagging this paragraph
    const { data, error } = await supabase.rpc('decrement_confusion', {
      p_chapter_id: chapterId,
      p_paragraph_index: paragraphIndex,
      p_group_id: groupId,
    })

    if (error) {
      console.error('[CCP] Failed to decrement confusion flag:', error)
      throw error
    }

    localFlags.delete(paragraphIndex)
    setLocalFlags(chapterId, groupId, localFlags)

    return { count: data ?? 0, isSet: false }
  } else {
    // Increment — user is flagging this paragraph
    const { data, error } = await supabase.rpc('increment_confusion', {
      p_chapter_id: chapterId,
      p_paragraph_index: paragraphIndex,
      p_group_id: groupId,
    })

    if (error) {
      console.error('[CCP] Failed to increment confusion flag:', error)
      throw error
    }

    localFlags.add(paragraphIndex)
    setLocalFlags(chapterId, groupId, localFlags)

    return { count: data ?? 1, isSet: true }
  }
}

/** Get confusion flag counts for all paragraphs in a chapter, scoped to a group */
export async function getConfusionFlagCounts(
  chapterId: string,
  groupId: string
): Promise<Map<number, number>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('confusion_counts')
    .select('paragraph_index, count')
    .eq('chapter_id', chapterId)
    .eq('group_id', groupId)

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

/** Get which paragraphs this browser has flagged (from localStorage), per group */
export async function getUserConfusionFlags(
  chapterId: string,
  groupId: string
): Promise<Set<number>> {
  // Purely client-side — no database query needed
  return getLocalFlags(chapterId, groupId)
}
