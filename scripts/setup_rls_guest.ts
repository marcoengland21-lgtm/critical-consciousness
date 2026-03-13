import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const policies = [
  // Anon can read text
  `CREATE POLICY IF NOT EXISTS "anon_text_documents_select" ON text_documents FOR SELECT TO anon USING (true)`,
  `CREATE POLICY IF NOT EXISTS "anon_text_chapters_select" ON text_chapters FOR SELECT TO anon USING (true)`,
  // Anon can read annotations
  `CREATE POLICY IF NOT EXISTS "anon_annotations_select" ON annotations FOR SELECT TO anon USING (true)`,
  // Anon can insert annotations as guest
  `CREATE POLICY IF NOT EXISTS "anon_annotations_insert" ON annotations FOR INSERT TO anon WITH CHECK (author_id = '${GUEST_ID}')`,
  // Anon can read and insert annotation replies
  `CREATE POLICY IF NOT EXISTS "anon_annotation_replies_select" ON annotation_replies FOR SELECT TO anon USING (true)`,
  `CREATE POLICY IF NOT EXISTS "anon_annotation_replies_insert" ON annotation_replies FOR INSERT TO anon WITH CHECK (author_id = '${GUEST_ID}')`,
  // Anon can read profiles (for author display names)
  `CREATE POLICY IF NOT EXISTS "anon_profiles_select" ON profiles FOR SELECT TO anon USING (true)`,
]

async function main() {
  // We can't run raw SQL via the Supabase JS client directly
  // But we can test if the policies already work by trying operations

  // Test: read text_documents as service role (which bypasses RLS)
  const { data: docs } = await supabase.from('text_documents').select('id, title')
  console.log(`Found ${docs?.length} documents`)

  // Test: insert annotation as service role (bypasses RLS)
  const { data: chapters } = await supabase.from('text_chapters').select('id').limit(1)
  if (!chapters?.length) {
    console.error('No chapters found')
    return
  }

  const { data: testAnn, error: annErr } = await supabase.from('annotations').insert({
    chapter_id: chapters[0].id,
    author_id: GUEST_ID,
    body: 'Test annotation — verifying guest insert works.',
    quote_exact: 'test passage',
    position_start: 0,
    position_end: 12,
    quote_prefix: '',
    quote_suffix: 'The wealth of',
  }).select('id').single()

  if (annErr) {
    console.error('Annotation insert failed:', annErr.message)
  } else {
    console.log('  ✓ Guest annotation insert works (via service role)')
    // Clean up
    await supabase.from('annotations').delete().eq('id', testAnn.id)
    console.log('  ✓ Cleaned up test annotation')
  }

  console.log('\n--- RLS POLICIES NEEDED ---')
  console.log('Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor):')
  console.log('')
  for (const p of policies) {
    // Remove IF NOT EXISTS since Supabase may not support it for policies
    const cleaned = p.replace('IF NOT EXISTS ', '')
    console.log(cleaned + ';')
  }
  console.log('')
  console.log('-- Enable realtime')
  console.log("ALTER PUBLICATION supabase_realtime ADD TABLE annotations;")
  console.log("ALTER PUBLICATION supabase_realtime ADD TABLE annotation_replies;")
}

main().catch(console.error)
