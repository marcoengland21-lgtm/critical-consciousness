import { createClient } from '@/lib/supabase/client'

export const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'
export const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001'

export interface ConfusionFlag {
  chapter_id: string
  paragraph_index: number
  user_id: string
  group_id: string
  created_at: string
}

/** Toggle a confusion flag for a paragraph */
export async function toggleConfusionFlag(
  chapterId: string,
  paragraphIndex: number
): Promise<{ count: number; isSet: boolean }> {
  const supabase = createClient()

  // First, check if this flag already exists
  const { data: existing, error: fetchError } = await supabase
    .from('confusion_flags')
    .select('id')
    .eq('chapter_id', chapterId)
    .eq('paragraph_index', paragraphIndex)
    .eq('user_id', GUEST_ID)
    .eq('group_id', DEFAULT_GROUP_ID)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "no rows" which is expected
    throw fetchError
  }

  if (existing) {
    // Delete the flag
    const { error: deleteError } = await supabase
      .from('confusion_flags')
      .delete()
      .eq('id', existing.id)

    if (deleteError) throw deleteError

    // Get new count
    const { count } = await supabase
      .from('confusion_flags')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .eq('paragraph_index', paragraphIndex)

    return { count: count || 0, isSet: false }
  } else {
    // Create the flag
    const { error: insertError } = await supabase.from('confusion_flags').insert({
      chapter_id: chapterId,
      paragraph_index: paragraphIndex,
      user_id: GUEST_ID,
      group_id: DEFAULT_GROUP_ID,
    })

    if (insertError) throw insertError

    // Get new count
    const { count } = await supabase
      .from('confusion_flags')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .eq('paragraph_index', paragraphIndex)

    return { count: count || 0, isSet: true }
  }
}

/** Get confusion flag counts for a chapter */
export async function getConfusionFlagCounts(
  chapterId: string
): Promise<Map<number, number>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('confusion_flags')
    .select('paragraph_index', { count: 'exact' })
    .eq('chapter_id', chapterId)

  if (error) {
    console.error('Error fetching confusion flags:', error)
    return new Map()
  }

  if (!data) return new Map()

  // Count occurrences per paragraph
  const counts = new Map<number, number>()
  for (const row of data) {
    const idx = row.paragraph_index
    counts.set(idx, (counts.get(idx) || 0) + 1)
  }

  return counts
}

/** Get user's confusion flags for a chapter */
export async function getUserConfusionFlags(
  chapterId: string
): Promise<Set<number>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('confusion_flags')
    .select('paragraph_index')
    .eq('chapter_id', chapterId)
    .eq('user_id', GUEST_ID)
    .eq('group_id', DEFAULT_GROUP_ID)

  if (error) {
    console.error('Error fetching user confusion flags:', error)
    return new Set()
  }

  if (!data) return new Set()

  return new Set(data.map(row => row.paragraph_index))
}
