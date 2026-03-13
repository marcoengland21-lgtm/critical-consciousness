/**
 * Apply RLS policies using pg module.
 * Tries multiple connection string formats.
 * Run: node scripts/apply_rls_pg.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
const env = {}
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
}

const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const projectRef = 'aufzylsnowiareuionna'
const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

// Try different connection formats
const connStrings = [
  // Direct connection
  `postgresql://postgres:${SERVICE_KEY}@db.${projectRef}.supabase.co:5432/postgres`,
  // Pooler session mode
  `postgresql://postgres.${projectRef}:${SERVICE_KEY}@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`,
  // Pooler transaction mode
  `postgresql://postgres.${projectRef}:${SERVICE_KEY}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`,
]

const statements = [
  `DROP POLICY IF EXISTS "anon_text_documents_select" ON text_documents`,
  `DROP POLICY IF EXISTS "anon_text_chapters_select" ON text_chapters`,
  `DROP POLICY IF EXISTS "anon_annotations_select" ON annotations`,
  `DROP POLICY IF EXISTS "anon_annotations_insert" ON annotations`,
  `DROP POLICY IF EXISTS "anon_annotation_replies_select" ON annotation_replies`,
  `DROP POLICY IF EXISTS "anon_annotation_replies_insert" ON annotation_replies`,
  `DROP POLICY IF EXISTS "anon_profiles_select" ON profiles`,
  `CREATE POLICY "anon_text_documents_select" ON text_documents FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_text_chapters_select" ON text_chapters FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_annotations_select" ON annotations FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_annotations_insert" ON annotations FOR INSERT TO anon WITH CHECK (author_id = '${GUEST_ID}')`,
  `CREATE POLICY "anon_annotation_replies_select" ON annotation_replies FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_annotation_replies_insert" ON annotation_replies FOR INSERT TO anon WITH CHECK (author_id = '${GUEST_ID}')`,
  `CREATE POLICY "anon_profiles_select" ON profiles FOR SELECT TO anon USING (true)`,
]

const realtimeStatements = [
  `ALTER PUBLICATION supabase_realtime ADD TABLE annotations`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE annotation_replies`,
]

async function tryConnect(connStr, label) {
  console.log(`\nTrying ${label}...`)
  const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 })
  try {
    await client.connect()
    console.log('Connected!\n')
    return client
  } catch (e) {
    console.log(`Failed: ${e.message.slice(0, 100)}`)
    return null
  }
}

async function main() {
  let client = null
  for (let i = 0; i < connStrings.length; i++) {
    client = await tryConnect(connStrings[i], `Connection ${i + 1}`)
    if (client) break
  }

  if (!client) {
    console.log('\n========================================')
    console.log('Could not connect to database.')
    console.log('Please run this SQL in the Supabase SQL Editor:')
    console.log('(Dashboard > SQL Editor > New Query)')
    console.log('========================================\n')
    console.log(statements.map(s => s + ';').join('\n'))
    console.log('\n' + realtimeStatements.map(s => s + ';').join('\n'))
    process.exit(1)
  }

  for (const sql of statements) {
    try {
      await client.query(sql)
      console.log(`✓ ${sql.slice(0, 80)}`)
    } catch (e) {
      console.error(`✗ Error: ${e.message}`)
    }
  }

  for (const sql of realtimeStatements) {
    try {
      await client.query(sql)
      console.log(`✓ ${sql}`)
    } catch (e) {
      if (e.message.includes('already')) {
        console.log(`⊘ ${sql} (already added)`)
      } else {
        console.error(`✗ ${sql}: ${e.message}`)
      }
    }
  }

  await client.end()
  console.log('\nAll RLS policies applied!')
}

main().catch(e => { console.error(e); process.exit(1) })
