#!/usr/bin/env npx tsx
/**
 * Run this from your Mac terminal:
 *   cd ~/CCP && npx tsx scripts/apply_migration.ts
 *
 * Or paste the SQL from supabase/migrations/001_multigroup_and_features.sql
 * directly into the Supabase Dashboard SQL Editor at:
 *   https://supabase.com/dashboard/project/aufzylsnowiareuionna/sql/new
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('Missing env vars. Make sure .env.local is loaded.')
  console.error('Try: source .env.local && npx tsx scripts/apply_migration.ts')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
})

async function run() {
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_multigroup_and_features.sql')
  const sql = readFileSync(sqlPath, 'utf8')

  // Split into individual statements (simple split on semicolons outside comments)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute.`)

  let success = 0
  let errors = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ')

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })

      if (error) {
        // Try direct SQL via postgrest
        const { error: err2 } = await supabase.from('_exec').select().throwOnError()
        console.log(`  [${i + 1}/${statements.length}] WARN: ${preview}...`)
        console.log(`    ${error.message}`)
        errors++
      } else {
        console.log(`  [${i + 1}/${statements.length}] OK: ${preview}...`)
        success++
      }
    } catch (e: any) {
      console.log(`  [${i + 1}/${statements.length}] ERROR: ${preview}...`)
      console.log(`    ${e.message}`)
      errors++
    }
  }

  console.log(`\nDone: ${success} succeeded, ${errors} failed`)
  console.log('\nIf there were errors, paste the full SQL into the Supabase SQL Editor:')
  console.log('https://supabase.com/dashboard/project/aufzylsnowiareuionna/sql/new')
}

run().catch(console.error)
