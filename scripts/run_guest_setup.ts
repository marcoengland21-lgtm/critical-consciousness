import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  // 1. Create guest profile
  console.log('Creating guest profile...')
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: '00000000-0000-0000-0000-000000000000',
      display_name: 'Guest Reader',
      role: 'member',
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Profile error:', profileError)
  } else {
    console.log('  ✓ Guest profile created')
  }

  // 2. Test that we can read text_documents
  const { data: docs, error: docError } = await supabase
    .from('text_documents')
    .select('id, title, slug')

  if (docError) {
    console.error('Doc read error:', docError)
  } else {
    console.log(`  ✓ Found ${docs?.length || 0} documents`)
    docs?.forEach((d: any) => console.log(`    - ${d.title} (${d.slug})`))
  }

  // 3. Test chapters
  const { data: chapters, error: chError } = await supabase
    .from('text_chapters')
    .select('id, chapter_number, title')
    .order('sort_order')

  if (chError) {
    console.error('Chapter read error:', chError)
  } else {
    console.log(`  ✓ Found ${chapters?.length || 0} chapters`)
    chapters?.forEach((c: any) => console.log(`    - §${c.chapter_number}: ${c.title}`))
  }

  // 4. Test annotation insert as guest
  console.log('\nTesting guest annotation insert...')
  if (chapters && chapters.length > 0) {
    const { data: ann, error: annError } = await supabase
      .from('annotations')
      .insert({
        chapter_id: chapters[0].id,
        author_id: '00000000-0000-0000-0000-000000000000',
        body: 'Test annotation — this can be deleted.',
        quote_exact: 'test',
        position_start: 0,
        position_end: 4,
        quote_prefix: '',
        quote_suffix: '',
      })
      .select('id')
      .single()

    if (annError) {
      console.error('Annotation insert error:', annError)
      console.log('\n⚠️  Guest annotations require RLS policy changes.')
      console.log('Run this SQL in the Supabase SQL Editor:')
      console.log(`
-- Allow anon reads on text content
CREATE POLICY "anon_text_documents_select" ON text_documents FOR SELECT TO anon USING (true);
CREATE POLICY "anon_text_chapters_select" ON text_chapters FOR SELECT TO anon USING (true);

-- Allow anon reads and guest inserts on annotations
CREATE POLICY "anon_annotations_select" ON annotations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_annotations_insert" ON annotations FOR INSERT TO anon WITH CHECK (author_id = '00000000-0000-0000-0000-000000000000');

-- Allow anon reads and guest inserts on annotation replies
CREATE POLICY "anon_annotation_replies_select" ON annotation_replies FOR SELECT TO anon USING (true);
CREATE POLICY "anon_annotation_replies_insert" ON annotation_replies FOR INSERT TO anon WITH CHECK (author_id = '00000000-0000-0000-0000-000000000000');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE annotation_replies;
      `)
    } else {
      console.log(`  ✓ Test annotation created: ${ann.id}`)
      // Clean up test annotation
      await supabase.from('annotations').delete().eq('id', ann.id)
      console.log('  ✓ Test annotation cleaned up')
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
