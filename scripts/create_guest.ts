import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually
const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  // Create guest user via admin auth
  console.log('Creating guest auth user...')
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'guest@criticalconsciousness.local',
    password: 'guest-reader-no-login-ever-' + Date.now(),
    email_confirm: true,
    user_metadata: { display_name: 'Guest Reader' },
  })

  if (error) {
    console.log('Auth error:', error.message)
    // Check if user with this email already exists
    const { data: users } = await supabase.auth.admin.listUsers()
    const guest = users?.users?.find((u: any) => u.email === 'guest@criticalconsciousness.local')
    if (guest) {
      console.log('Guest user already exists with ID:', guest.id)
      console.log('Update GUEST_ID in ChapterReader.tsx and AnnotationPanel.tsx to:', guest.id)

      // Create profile for this user
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: guest.id,
        display_name: 'Guest Reader',
        role: 'member',
      }, { onConflict: 'id' })

      if (profErr) console.log('Profile upsert:', profErr.message)
      else console.log('  ✓ Guest profile ready')

      console.log('\nGUEST_ID =', guest.id)
    }
  } else {
    const guestId = data.user!.id
    console.log('Created guest user:', guestId)

    // Create profile
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: guestId,
      display_name: 'Guest Reader',
      role: 'member',
    }, { onConflict: 'id' })

    if (profErr) console.log('Profile error:', profErr.message)
    else console.log('  ✓ Guest profile created')

    console.log('\nGUEST_ID =', guestId)
  }
}

main().catch(console.error)
