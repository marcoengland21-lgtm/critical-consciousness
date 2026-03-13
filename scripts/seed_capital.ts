/**
 * Seed script: Insert Capital Vol.1 Chapter 1 into Supabase.
 * Run with: npx tsx scripts/seed_capital.ts
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

const sections = [
  {
    chapter_number: 1,
    title: 'The Two Factors of a Commodity: Use-Value and Value',
    file: 'capital_ch1_s1.txt',
    sort_order: 1,
  },
  {
    chapter_number: 2,
    title: 'The Twofold Character of the Labour Embodied in Commodities',
    file: 'capital_ch1_s2.txt',
    sort_order: 2,
  },
  {
    chapter_number: 3,
    title: 'The Form of Value, or Exchange-Value',
    file: 'capital_ch1_s3.txt',
    sort_order: 3,
  },
  {
    chapter_number: 4,
    title: 'The Fetishism of Commodities and the Secret Thereof',
    file: 'capital_ch1_s4.txt',
    sort_order: 4,
  },
]

async function main() {
  console.log('Connecting to Supabase...')

  // Check if document already exists
  const { data: existing } = await supabase
    .from('text_documents')
    .select('id')
    .eq('slug', 'capital-vol-1')
    .single()

  let documentId: string

  if (existing) {
    console.log('Document already exists, updating chapters...')
    documentId = existing.id

    // Delete existing chapters to re-seed
    await supabase
      .from('text_chapters')
      .delete()
      .eq('document_id', documentId)
  } else {
    // Create the document
    const { data: doc, error: docError } = await supabase
      .from('text_documents')
      .insert({
        title: 'Capital, Volume I',
        slug: 'capital-vol-1',
      })
      .select('id')
      .single()

    if (docError) {
      console.error('Failed to create document:', docError)
      process.exit(1)
    }

    documentId = doc.id
    console.log(`Created document: ${documentId}`)
  }

  // Insert chapters
  for (const section of sections) {
    const content = readFileSync(join(process.cwd(), section.file), 'utf-8')

    const { error } = await supabase.from('text_chapters').insert({
      document_id: documentId,
      chapter_number: section.chapter_number,
      title: section.title,
      content: content,
      sort_order: section.sort_order,
    })

    if (error) {
      console.error(`Failed to insert section ${section.chapter_number}:`, error)
    } else {
      console.log(
        `  ✓ Section ${section.chapter_number}: ${section.title} (${content.length} chars)`
      )
    }
  }

  console.log('\nDone! Capital Vol.1 Chapter 1 seeded into the database.')
}

main().catch(console.error)
