/**
 * Seed script: Insert sample annotations for Chapter 1 of Capital (all 4 sections).
 * Run with: npx tsx scripts/seed_annotations.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars.
 * Uses the admin user as author, or falls back to the first profile found.
 *
 * These annotations model the kind of marginal notes a study group facilitator
 * might leave to spark discussion. They can be re-run safely (clears previous
 * seed annotations by the same author first).
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SeedAnnotation {
  section: number
  quote: string
  body: string
}

// Annotations designed to spark discussion in a reading group.
// Each targets a real passage from Chapter 1 of Capital.
const seedAnnotations: SeedAnnotation[] = [
  // --- Section 1: The Two Factors of a Commodity ---
  {
    section: 1,
    quote: 'an immense accumulation of commodities',
    body: 'Notice how Marx opens with appearance ("presents itself as") rather than essence. The entire chapter is about peeling back this surface. Why start with how things look rather than what they are?',
  },
  {
    section: 1,
    quote: 'A commodity is, in the first place, an object outside us, a thing that by its properties satisfies human wants of some sort or another.',
    body: 'This is the use-value side. Marx is careful to say "of some sort or another" — he\'s not ranking needs or distinguishing "real" from "artificial" wants here. The point is simply that commodities are useful.',
  },
  {
    section: 1,
    quote: 'The exchange of commodities is evidently an act characterised by a total abstraction from use-value.',
    body: 'This is a crucial move. When we exchange, we treat qualitatively different things as equal. A coat and linen become interchangeable. What gets abstracted away is precisely what makes each thing useful.',
  },
  {
    section: 1,
    quote: 'If then we leave out of consideration the use-value of commodities, they have only one common property left, that of being products of labour.',
    body: 'The argument by elimination. Once use-value is set aside, what remains? Not weight, colour, or texture — those are all use-value properties. Only the fact that human labour was expended. But what kind of labour?',
  },

  // --- Section 2: The Twofold Character of the Labour ---
  {
    section: 2,
    quote: 'On the one hand all labour is, speaking physiologically, an expenditure of human labour power',
    body: 'Abstract labour = labour as pure expenditure of human energy, stripped of its specific form. This creates value. Concrete labour = the specific kind of work (tailoring, weaving). This creates use-value. The duality of the commodity reflects the duality of labour.',
  },
  {
    section: 2,
    quote: 'Productive activity, if we leave out of account its special form, viz., the useful character of the labour, is nothing but the expenditure of human labour power.',
    body: 'Can we really separate the "useful character" of labour from the labour itself? Is abstract labour a real abstraction that happens in exchange, or just an analytical tool Marx uses? This is one of the most debated questions in Marx scholarship.',
  },

  // --- Section 3: The Form of Value ---
  {
    section: 3,
    quote: 'The whole mystery of the form of value lies hidden in this elementary form.',
    body: 'Marx spends an enormous amount of time on what seems like a trivial point: 20 yards of linen = 1 coat. But the "simple form of value" contains the DNA of money and capital. Worth reading slowly.',
  },
  {
    section: 3,
    quote: 'The value of the linen can therefore be expressed only relatively',
    body: 'Value can never appear on its own — it only shows up in a relationship between commodities. There is no "absolute" value you can point to. This is why Marx says value is a social relation, not a physical property.',
  },

  // --- Section 4: The Fetishism of Commodities ---
  {
    section: 4,
    quote: 'A commodity appears, at first sight, a very trivial thing, and easily understood.',
    body: 'Here Marx shifts from the technical analysis of value to its social consequences. Commodity fetishism is not about being "tricked" — it\'s about how social relations between people genuinely take the form of relations between things in a commodity-producing society.',
  },
  {
    section: 4,
    quote: 'material relations between persons and social relations between things.',
    body: 'Read carefully: Marx says these relations appear as "what they really are." Fetishism is not an illusion — under capitalism, social relations between people really do take the form of relations between things. The commodity form is not a veil hiding the truth; it IS how value actually operates.',
  },
  {
    section: 4,
    quote: 'The religious world is but the reflex of the real world.',
    body: 'Marx\'s analogy: just as in religion people create gods and then worship them as if they were independent powers, in commodity production people create value through their labour and then experience it as a property of things. Both are real social processes, not mere errors.',
  },
]

async function main() {
  // Find an author to attribute annotations to
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'admin')
    .limit(1)
    .single()

  let authorId: string
  let authorName: string

  if (adminProfile) {
    authorId = adminProfile.id
    authorName = adminProfile.display_name
  } else {
    const { data: anyProfile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .limit(1)
      .single()

    if (!anyProfile) {
      console.error('No profiles found. Create a user account first.')
      process.exit(1)
    }
    authorId = anyProfile.id
    authorName = anyProfile.display_name
  }

  console.log(`Using author: ${authorName} (${authorId})`)

  // Fetch all chapter sections
  const { data: chapters, error: chErr } = await supabase
    .from('text_chapters')
    .select('id, chapter_number, content')
    .order('chapter_number', { ascending: true })

  if (chErr || !chapters) {
    console.error('Failed to fetch chapters:', chErr)
    process.exit(1)
  }

  const chapterMap = new Map(chapters.map(ch => [ch.chapter_number, ch]))

  // Clear previous seed annotations by this author to allow re-running
  const { count: deleted } = await supabase
    .from('annotations')
    .delete({ count: 'exact' })
    .eq('author_id', authorId)

  if (deleted && deleted > 0) {
    console.log(`Cleared ${deleted} existing annotations by ${authorName}`)
  }

  let inserted = 0
  let skipped = 0

  for (const ann of seedAnnotations) {
    const chapter = chapterMap.get(ann.section)
    if (!chapter) {
      console.warn(`  Skip: Section ${ann.section} not found`)
      skipped++
      continue
    }

    // Find the quote in the chapter content
    const idx = chapter.content.indexOf(ann.quote)
    if (idx === -1) {
      console.warn(`  Skip: Quote not found in Section ${ann.section}: "${ann.quote.slice(0, 50)}..."`)
      skipped++
      continue
    }

    const posStart = idx
    const posEnd = idx + ann.quote.length

    // Extract prefix/suffix context for robust anchoring
    const prefixStart = Math.max(0, posStart - 32)
    const suffixEnd = Math.min(chapter.content.length, posEnd + 32)
    const prefix = chapter.content.slice(prefixStart, posStart)
    const suffix = chapter.content.slice(posEnd, suffixEnd)

    const { error: insertErr } = await supabase
      .from('annotations')
      .insert({
        chapter_id: chapter.id,
        author_id: authorId,
        body: ann.body,
        quote_exact: ann.quote,
        position_start: posStart,
        position_end: posEnd,
        quote_prefix: prefix,
        quote_suffix: suffix,
      })

    if (insertErr) {
      console.error(`  Error in Section ${ann.section}:`, insertErr.message)
      skipped++
    } else {
      inserted++
      console.log(`  ✓ Section ${ann.section}: "${ann.quote.slice(0, 50)}..."`)
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`)
}

main().catch(console.error)
