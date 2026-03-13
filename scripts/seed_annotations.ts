/**
 * Seed script: Insert example annotations on Capital Vol.1 Chapter 1, Section 1
 * Run with: npx tsx scripts/seed_annotations.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set SUPABASE_SERVICE_ROLE_KEY in your environment (not the anon key)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

async function findTextInChapter(chapterContent: string, searchText: string): Promise<{ start: number; end: number } | null> {
  const index = chapterContent.indexOf(searchText)
  if (index === -1) return null
  return { start: index, end: index + searchText.length }
}

async function main() {
  console.log('Connecting to Supabase...')

  // Get the first chapter (Chapter 1, Section 1) of Capital Vol.1
  const { data: document } = await supabase
    .from('text_documents')
    .select('id')
    .eq('slug', 'capital-vol-1')
    .single()

  if (!document) {
    console.error('Document "capital-vol-1" not found. Run seed_capital.ts first.')
    process.exit(1)
  }

  const { data: chapter } = await supabase
    .from('text_chapters')
    .select('*')
    .eq('document_id', document.id)
    .eq('chapter_number', 1)
    .single()

  if (!chapter) {
    console.error('Chapter 1 not found. Run seed_capital.ts first.')
    process.exit(1)
  }

  console.log(`Found chapter: "${chapter.title}" (${chapter.content.length} characters)`)

  // Check if annotations already exist for this chapter
  const { data: existingAnnotations } = await supabase
    .from('annotations')
    .select('id')
    .eq('chapter_id', chapter.id)
    .eq('author_id', GUEST_ID)
    .limit(1)

  if (existingAnnotations && existingAnnotations.length > 0) {
    console.log('Annotations already exist for this chapter. Skipping seed.')
    process.exit(0)
  }

  // Annotation 1: "an immense accumulation of commodities"
  const quote1 = 'an immense accumulation of commodities'
  const pos1 = await findTextInChapter(chapter.content, quote1)

  if (!pos1) {
    console.error(`Quote 1 not found: "${quote1}"`)
    process.exit(1)
  }

  const prefix1Start = Math.max(0, pos1.start - 30)
  const suffix1End = Math.min(chapter.content.length, pos1.end + 30)

  const { error: err1, data: ann1Data } = await supabase
    .from('annotations')
    .insert({
      chapter_id: chapter.id,
      author_id: GUEST_ID,
      body: 'This is where it all starts — why does Marx begin with the commodity and not with labour or capital?',
      quote_exact: quote1,
      position_start: pos1.start,
      position_end: pos1.end,
      quote_prefix: chapter.content.slice(prefix1Start, pos1.start),
      quote_suffix: chapter.content.slice(pos1.end, suffix1End),
    })
    .select('id')
    .single()

  if (err1) {
    console.error('Failed to insert annotation 1:', err1)
    process.exit(1)
  }

  console.log(`✓ Annotation 1 created (ID: ${ann1Data.id})`)

  // Annotation 2: "A commodity is, in the first place"
  const quote2 = 'A commodity is, in the first place'
  const pos2 = await findTextInChapter(chapter.content, quote2)

  if (!pos2) {
    console.error(`Quote 2 not found: "${quote2}"`)
    process.exit(1)
  }

  const prefix2Start = Math.max(0, pos2.start - 30)
  const suffix2End = Math.min(chapter.content.length, pos2.end + 30)

  const { error: err2, data: ann2Data } = await supabase
    .from('annotations')
    .insert({
      chapter_id: chapter.id,
      author_id: GUEST_ID,
      body: 'Notice how Marx immediately distinguishes between use-value and exchange-value. This distinction drives everything that follows.',
      quote_exact: quote2,
      position_start: pos2.start,
      position_end: pos2.end,
      quote_prefix: chapter.content.slice(prefix2Start, pos2.start),
      quote_suffix: chapter.content.slice(pos2.end, suffix2End),
    })
    .select('id')
    .single()

  if (err2) {
    console.error('Failed to insert annotation 2:', err2)
    process.exit(1)
  }

  console.log(`✓ Annotation 2 created (ID: ${ann2Data.id})`)

  console.log('\nDone! Example annotations seeded successfully.')
}

main().catch(console.error)
