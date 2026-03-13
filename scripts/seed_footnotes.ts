/**
 * Seed script: Insert Chapter 1 footnotes and update chapter content with markers.
 * Run with: npx tsx scripts/seed_footnotes.ts
 *
 * This script:
 * 1. Reads the extracted footnote data from scripts/data/capital_ch1_footnotes.json
 * 2. Updates each chapter section's content to include [N] footnote markers
 * 3. Inserts all 37 footnotes into the text_footnotes table
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Footnote {
  num: number
  author: 'marx' | 'engels'
  text: string
}

interface FootnoteData {
  footnotes: Footnote[]
  sectionMap: Record<string, [number, number]>
  sections: Record<string, string[]>
}

async function main() {
  console.log('Loading footnote data...')

  const dataPath = join(process.cwd(), 'scripts', 'data', 'capital_ch1_footnotes.json')
  const data: FootnoteData = JSON.parse(readFileSync(dataPath, 'utf-8'))

  console.log(`  Found ${data.footnotes.length} footnotes across ${Object.keys(data.sections).length} sections`)

  // Get the document ID for Capital Vol. 1
  const { data: doc, error: docError } = await supabase
    .from('text_documents')
    .select('id')
    .eq('slug', 'capital-vol-1')
    .single()

  if (docError || !doc) {
    console.error('Could not find Capital Vol. 1 document. Run seed_capital.ts first.')
    process.exit(1)
  }

  console.log(`  Document ID: ${doc.id}`)

  // Get existing chapters
  const { data: chapters, error: chapError } = await supabase
    .from('text_chapters')
    .select('id, chapter_number, title')
    .eq('document_id', doc.id)
    .order('sort_order')

  if (chapError || !chapters || chapters.length === 0) {
    console.error('No chapters found. Run seed_capital.ts first.')
    process.exit(1)
  }

  console.log(`  Found ${chapters.length} chapters`)

  // Update chapter content with footnote markers
  for (const chapter of chapters) {
    const sectionKey = String(chapter.chapter_number)
    const sectionParagraphs = data.sections[sectionKey]

    if (!sectionParagraphs) {
      console.log(`  Skipping chapter ${chapter.chapter_number} (no section data)`)
      continue
    }

    // Filter out any navigation/cruft paragraphs
    const cleanParagraphs = sectionParagraphs.filter(p => {
      const trimmed = p.trim()
      if (trimmed === '### Footnotes') return false
      if (trimmed.startsWith('Ch. 1 as per First German Edition')) return false
      if (trimmed === '') return false
      return true
    })

    const newContent = cleanParagraphs.join('\n\n')

    const { error: updateError } = await supabase
      .from('text_chapters')
      .update({ content: newContent })
      .eq('id', chapter.id)

    if (updateError) {
      console.error(`  ✗ Failed to update chapter ${chapter.chapter_number}:`, updateError)
    } else {
      console.log(`  ✓ Updated chapter ${chapter.chapter_number}: ${chapter.title} (${newContent.length} chars, ${cleanParagraphs.length} paragraphs)`)
    }
  }

  // Delete existing footnotes for these chapters (idempotent re-run)
  const chapterIds = chapters.map(c => c.id)
  const { error: deleteError } = await supabase
    .from('text_footnotes')
    .delete()
    .in('chapter_id', chapterIds)

  if (deleteError) {
    console.error('  Warning: Could not clear existing footnotes:', deleteError)
  }

  // Insert footnotes — map each footnote to its chapter based on sectionMap
  let insertedCount = 0

  for (const fn of data.footnotes) {
    // Find which section this footnote belongs to
    let chapterNumber: number | null = null
    for (const [section, [start, end]] of Object.entries(data.sectionMap)) {
      if (fn.num >= start && fn.num <= end) {
        chapterNumber = parseInt(section)
        break
      }
    }

    if (chapterNumber === null) {
      console.error(`  ✗ Could not map footnote ${fn.num} to a section`)
      continue
    }

    const chapter = chapters.find(c => c.chapter_number === chapterNumber)
    if (!chapter) {
      console.error(`  ✗ No chapter found for section ${chapterNumber}`)
      continue
    }

    const { error: insertError } = await supabase
      .from('text_footnotes')
      .insert({
        chapter_id: chapter.id,
        footnote_number: fn.num,
        content: fn.text,
        author: fn.author,
      })

    if (insertError) {
      console.error(`  ✗ Footnote ${fn.num}:`, insertError)
    } else {
      insertedCount++
    }
  }

  console.log(`\n  ✓ Inserted ${insertedCount}/${data.footnotes.length} footnotes`)
  console.log('\nDone! Footnotes seeded into the database.')
}

main().catch(console.error)
