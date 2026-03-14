/**
 * Seed script: Insert Capital Vol.1 Chapters 2-10 into Supabase.
 * Run with: npx tsx scripts/seed_chapters_2_10.ts
 *
 * This adds Marx's Chapters 2-10 after the existing 4 sections of Chapter 1.
 * chapter_number continues from 5 (since Ch1 sections use 1-4).
 * Each chapter includes both text content and footnotes.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set SUPABASE_SERVICE_ROLE_KEY in your environment (not the anon key)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DATA_DIR = join(process.cwd(), 'scripts', 'data', 'chapters')

// Marx's chapters 2-10 mapped to our chapter_number sequence (starting at 5)
const chapters = [
  { chapter_number: 5, sort_order: 5, marxChapter: 2, file: 'ch02.txt', fnFile: 'ch02_footnotes.json', title: 'The Process of Exchange' },
  { chapter_number: 6, sort_order: 6, marxChapter: 3, file: 'ch03.txt', fnFile: 'ch03_footnotes.json', title: 'Money, or the Circulation of Commodities' },
  { chapter_number: 7, sort_order: 7, marxChapter: 4, file: 'ch04.txt', fnFile: 'ch04_footnotes.json', title: 'The General Formula for Capital' },
  { chapter_number: 8, sort_order: 8, marxChapter: 5, file: 'ch05.txt', fnFile: 'ch05_footnotes.json', title: 'Contradictions in the General Formula of Capital' },
  { chapter_number: 9, sort_order: 9, marxChapter: 6, file: 'ch06.txt', fnFile: 'ch06_footnotes.json', title: 'The Buying and Selling of Labour-Power' },
  { chapter_number: 10, sort_order: 10, marxChapter: 7, file: 'ch07.txt', fnFile: 'ch07_footnotes.json', title: 'The Labour-Process and the Process of Producing Surplus-Value' },
  { chapter_number: 11, sort_order: 11, marxChapter: 8, file: 'ch08.txt', fnFile: 'ch08_footnotes.json', title: 'Constant Capital and Variable Capital' },
  { chapter_number: 12, sort_order: 12, marxChapter: 9, file: 'ch09.txt', fnFile: 'ch09_footnotes.json', title: 'The Rate of Surplus-Value' },
  { chapter_number: 13, sort_order: 13, marxChapter: 10, file: 'ch10.txt', fnFile: 'ch10_footnotes.json', title: 'The Working-Day' },
]

interface FootnoteEntry {
  num: number
  text: string
  author: 'marx' | 'engels'
}

async function main() {
  console.log('Connecting to Supabase...')

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

  const documentId = doc.id
  console.log(`Document ID: ${documentId}`)

  // Delete any existing chapters with chapter_number >= 5 (idempotent re-run)
  const { data: existingChapters } = await supabase
    .from('text_chapters')
    .select('id')
    .eq('document_id', documentId)
    .gte('chapter_number', 5)

  if (existingChapters && existingChapters.length > 0) {
    console.log(`Cleaning up ${existingChapters.length} existing chapters (chapter_number >= 5)...`)
    const ids = existingChapters.map(c => c.id)

    // Delete footnotes for these chapters first
    for (const id of ids) {
      await supabase.from('text_footnotes').delete().eq('chapter_id', id)
    }

    // Delete the chapters
    await supabase.from('text_chapters').delete().in('id', ids)
  }

  let totalChars = 0
  let totalFootnotes = 0

  for (const ch of chapters) {
    console.log(`\nProcessing Marx's Chapter ${ch.marxChapter}: ${ch.title}`)

    // Read text content
    const content = readFileSync(join(DATA_DIR, ch.file), 'utf-8')
    totalChars += content.length

    // Insert chapter
    const { data: chapterData, error: chapterError } = await supabase
      .from('text_chapters')
      .insert({
        document_id: documentId,
        chapter_number: ch.chapter_number,
        title: ch.title,
        content: content,
        sort_order: ch.sort_order,
      })
      .select('id')
      .single()

    if (chapterError || !chapterData) {
      console.error(`  Failed to insert chapter:`, chapterError)
      continue
    }

    console.log(`  Inserted chapter (${content.length.toLocaleString()} chars) -> chapter_number ${ch.chapter_number}`)

    // Read and insert footnotes
    const fnData = JSON.parse(readFileSync(join(DATA_DIR, ch.fnFile), 'utf-8'))
    const footnotes: FootnoteEntry[] = fnData.footnotes

    if (footnotes.length > 0) {
      let fnInserted = 0

      for (const fn of footnotes) {
        const { error: fnError } = await supabase
          .from('text_footnotes')
          .insert({
            chapter_id: chapterData.id,
            footnote_number: fn.num,
            content: fn.text,
            author: fn.author,
          })

        if (fnError) {
          console.error(`  Failed footnote ${fn.num}:`, fnError)
        } else {
          fnInserted++
        }
      }

      totalFootnotes += fnInserted
      const engelsCount = footnotes.filter(f => f.author === 'engels').length
      console.log(`  Inserted ${fnInserted}/${footnotes.length} footnotes (${engelsCount} by Engels)`)
    } else {
      console.log(`  No footnotes for this chapter`)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Done! Added ${chapters.length} chapters:`)
  console.log(`  Total text: ${totalChars.toLocaleString()} characters`)
  console.log(`  Total footnotes: ${totalFootnotes}`)
  console.log(`  Chapter numbers: 5-13 (Marx's Chapters 2-10)`)
  console.log(`${'='.repeat(60)}`)
}

main().catch(console.error)
