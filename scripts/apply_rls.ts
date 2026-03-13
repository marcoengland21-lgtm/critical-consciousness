/**
 * Apply RLS policies for guest annotation mode.
 * Uses Supabase Management API to execute SQL directly.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GUEST_ID = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]
console.log('Project ref:', projectRef)

const statements = [
  // Drop existing policies first (ignore errors if they don't exist)
  `DROP POLICY IF EXISTS "anon_text_documents_select" ON text_documents`,
  `DROP POLICY IF EXISTS "anon_text_chapters_select" ON text_chapters`,
  `DROP POLICY IF EXISTS "anon_annotations_select" ON annotations`,
  `DROP POLICY IF EXISTS "anon_annotations_insert" ON annotations`,
  `DROP POLICY IF EXISTS "anon_annotation_replies_select" ON annotation_replies`,
  `DROP POLICY IF EXISTS "anon_annotation_replies_insert" ON annotation_replies`,
  `DROP POLICY IF EXISTS "anon_profiles_select" ON profiles`,
  // Create policies
  `CREATE POLICY "anon_text_documents_select" ON text_documents FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_text_chapters_select" ON text_chapters FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_annotations_select" ON annotations FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_annotations_insert" ON annotations FOR INSERT TO anon WITH CHECK (author_id = '${GUEST_ID}')`,
  `CREATE POLICY "anon_annotation_replies_select" ON annotation_replies FOR SELECT TO anon USING (true)`,
  `CREATE POLICY "anon_annotation_replies_insert" ON annotation_replies FOR INSERT TO anon WITH CHECK (author_id = '${GUEST_ID}')`,
  `CREATE POLICY "anon_profiles_select" ON profiles FOR SELECT TO anon USING (true)`,
]

async function runSQL(sql: string): Promise<boolean> {
  // Use the Supabase pg-meta API endpoint which the service key can access
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  // If rpc doesn't work, try pg endpoint directly
  return false
}

async function main() {
  // Since we can't run raw SQL via PostgREST, let's create a temporary
  // database function that applies our policies, call it, then drop it
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Try a different approach: use the pg_net extension or just
  // verify what we can do with service key

  // Actually, service role key bypasses RLS, so the app will work
  // for service-role calls. But the browser uses the anon key.
  // We need actual RLS policies.

  // Let's output the SQL for the user to run manually if automation fails
  const fullSQL = statements.map(s => s + ';').join('\n')

  // Try using Supabase's SQL API (available on some plans)
  const sqlEndpoint = `${SUPABASE_URL}/pg`

  console.log('Attempting to apply RLS policies...\n')

  // Try the direct approach - create a function then call it
  const setupFn = `
    CREATE OR REPLACE FUNCTION _temp_setup_guest_rls()
    RETURNS void AS $$
    BEGIN
      ${statements.map(s => 'EXECUTE $sql$' + s + '$sql$;').join('\n      ')}
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  // We need to find a way to execute this...
  // The management API requires a different auth token

  // Last resort: use psql via connection string
  // Supabase connection string: postgres://postgres:[service_key]@db.[ref].supabase.co:5432/postgres
  const connStr = `postgresql://postgres.${projectRef}:${SERVICE_KEY}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`

  console.log('Trying direct database connection...')

  try {
    const { execSync } = await import('child_process')
    const result = execSync(
      `psql "${connStr}" -c "${fullSQL.replace(/"/g, '\\"')}"`,
      { timeout: 15000, encoding: 'utf-8' }
    )
    console.log(result)
    console.log('✓ RLS policies applied successfully!')
  } catch (e: any) {
    console.log('Direct connection failed:', e.message?.slice(0, 200))
    console.log('\n========================================')
    console.log('MANUAL STEP REQUIRED')
    console.log('========================================')
    console.log('Please run this SQL in the Supabase SQL Editor')
    console.log('(Dashboard > SQL Editor > New Query):\n')
    console.log(fullSQL)
    console.log('\n-- Enable realtime')
    console.log('ALTER PUBLICATION supabase_realtime ADD TABLE annotations;')
    console.log('ALTER PUBLICATION supabase_realtime ADD TABLE annotation_replies;')
  }
}

main().catch(console.error)
