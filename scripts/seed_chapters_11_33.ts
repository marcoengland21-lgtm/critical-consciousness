/**
 * Seed script: Insert Capital Vol.1 Chapters 11-33 into Supabase.
 * Run with: npx tsx scripts/seed_chapters_11_33.ts
 *
 * Continues from seed_chapters_2_10.ts.
 * chapter_number 14 = Marx's Ch 11, chapter_number 15 = Marx's Ch 12, etc.
 * Formula: chapter_number = marxChapter + 3
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

const DATA_DIR = join(process.cwd(), 'scripts', 'data', 'chapters')

// Marx's chapters 11-33 mapped to our chapter_number sequence
// chapter_number = marxChapter + 3 (since Ch1 sections use 1-4)
const chapters = [
  { marxChapter: 11, title: 'Rate and Mass of Surplus-Value' },
  { marxChapter: 12, title: 'The Concept of Relative Surplus-Value' },
  { marxChapter: 13, title: 'Co-operation' },
  { marxChapter: 14, title: 'Division of Labour and Manufacture' },
  { marxChapter: 15, title: 'Machinery and Modern Industry' },
  { marxChapter: 16, title: 'Absolute and Relative Surplus-Value' },
  { marxChapter: 17, title: 'Changes of Magnitude in the Price of Labour-Power and in Surplus-Value' },
  { marxChapter: 18, title: 'Various Formulae for the Rate of Surplus-Value' },
  { marxChapter: 19, title: 'The Transformation of the Value (and Respective Price) of Labour-Power into Wages' },
  { marxChapter: 20, title: 'Time-Wages' },
  { marxChapter: 21, title: 'Piece-Wages' },
  { marxChapter: 22, title: 'National Differences of Wages' },
  { marxChapter: 23, title: 'Simple Reproduction' },
  { marxChapter: 24, title: 'Conversion of Surplus-Value into Capital' },
  { marxChapter: 25, title: 'The General Law of Capitalist Accumulation' },
  { marxChapter: 26, title: 'The Secret of Primitive Accumulation' },
  { marxChapter: 27, title: 'Expropriation of the Agricultural Population from the Land' },
  { marxChapter: 28, title: 'Bloody Legislation Against the Expropriated, from the End of the 15th Century' },
  { marxChapter: 29, title: 'Genesis of the Capitalist Farmer' },
  { marxChapter: 30, title: 'Reaction of the Agricultural Revolution on Industry. Creation of the Home-Market for Industrial Capital' },
  { marxChapter: 31, title: 'Genesis of the Industrial Capitalist' },
  { marxChapter: 32, title: 'Historical Tendency of Capitalist Accumulation' },
  { marxChapter: 33, title: 'The Modern Theory of Colonisation' },
].map(ch => ({
  ...ch,
  chapter_number: ch.marxChapter + 3,
  sort_order: ch.marxChapter + 3,
  file: `ch${ch.marxChapter.toString().padStart(2, '0')}.txt`,
  fnFile: `ch${ch.marxChapter.toString().padStart(2, '0')}_footnotes.json`,
}))

interface FootnoteEntry {
  num: number
  text: string
  author: 'marx' | 'engels'
}

async function main() {
  console.log('Connecting to Supabase...')

  const { data: doc, error: docError } = await supabase
    .from('text_documents')
    .select('id')
    .eq('slug', 'capital-vol-1')
    .single()

  if (docError || !doc) {
    console.error('Could not find Capital Vol. 1 document.')
    process.exit(1)
  }

  const documentId = doc.id
  console.log(`Document ID: ${documentId}`)

  // Delete any existing chapters with chapter_number >= 14 (idempotent re-run)
  const { data: existingChapters } = await supabase
    .from('text_chapters')
    .select('id')
    .eq('document_id', documentId)
    .gte('chapter_number', 14)

  if (existingChapters && existingChapters.length > 0) {
    console.log(`Cleaning up ${existingChapters.length} existing chapters (chapter_number >= 14)...`)
    const ids = existingChapters.map(c => c.id)
    for (const id of ids) {
      await supabase.from('text_footnotes').delete().eq('chapter_id', id)
    }
    await supabase.from('text_chapters').delete().in('id', ids)
  }

  let totalChars = 0
  let totalFootnotes = 0

  for (const ch of chapters) {
    console.log(`\nMarx Ch ${ch.marxChapter}: ${ch.title}`)

    const content = readFileSync(join(DATA_DIR, ch.file), 'utf-8')
    totalChars += content.length

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

    console.log(`  Inserted (${content.length.toLocaleString()} chars) -> chapter_number ${ch.chapter_number}`)

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
      console.log(`  ${fnInserted}/${footnotes.length} footnotes (${engelsCount} by Engels)`)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Done! Added ${chapters.length} chapters:`)
  console.log(`  Total text: ${totalChars.toLocaleString()} characters`)
  console.log(`  Total footnotes: ${totalFootnotes}`)
  console.log(`  Chapter numbers: 14-36 (Marx's Chapters 11-33)`)
  console.log(`${'='.repeat(60)}`)
}

main().catch(console.error)
