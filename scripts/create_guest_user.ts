import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const GUEST_UUID = '00000000-0000-0000-0000-000000000000'

async function main() {
  // Check if guest user already exists
  const { data: existingUser } = await supabase.auth.admin.getUserById(GUEST_UUID)

  if (existingUser?.user) {
    console.log('Guest user already exists')
  } else {
    // Create guest user in auth.users via admin API
    console.log('Creating guest auth user...')
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'guest@criticalconsciousness.local',
      password: 'guest-reader-no-login',
      email_confirm: true,
      user_metadata: { display_name: 'Guest Reader' },
      // Supabase admin API doesn't let us set the UUID directly in all versions
      // Let's try a different approach
    })

    if (error) {
      console.error('Auth user create error:', error)
      console.log('\nAlternative: Run this SQL directly in Supabase SQL Editor:')
      console.log(`
-- Create a guest user in auth.users
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, confirmation_token,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'guest@criticalconsciousness.local',
  crypt('guest-reader-no-login', gen_salt('bf')),
  now(), now(), now(), '',
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Guest Reader"}',
  false
) ON CONFLICT (id) DO NOTHING;

-- Create guest profile
INSERT INTO profiles (id, display_name, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'Guest Reader', 'member')
ON CONFLICT (id) DO NOTHING;

-- RLS policies for anon access
CREATE POLICY "anon_text_documents_select" ON text_documents FOR SELECT TO anon USING (true);
CREATE POLICY "anon_text_chapters_select" ON text_chapters FOR SELECT TO anon USING (true);
CREATE POLICY "anon_annotations_select" ON annotations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_annotations_insert" ON annotations FOR INSERT TO anon WITH CHECK (author_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "anon_annotation_replies_select" ON annotation_replies FOR SELECT TO anon USING (true);
CREATE POLICY "anon_annotation_replies_insert" ON annotation_replies FOR INSERT TO anon WITH CHECK (author_id = '00000000-0000-0000-0000-000000000000');
ALTER PUBLICATION supabase_realtime ADD TABLE annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE annotation_replies;
      `)
      return
    }

    console.log('Created auth user:', data.user?.id)

    // Now we need to update the ID to our known GUEST_UUID
    // The admin API doesn't guarantee we get our desired UUID
    // Let's check what ID was assigned
    const newId = data.user?.id
    if (newId !== GUEST_UUID) {
      console.log(`User created with ID ${newId}, but we need ${GUEST_UUID}`)
      console.log('Please run the SQL in the Supabase SQL Editor instead.')
    }
  }

  // Try to create/update profile
  console.log('Creating guest profile...')
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: GUEST_UUID,
      display_name: 'Guest Reader',
      role: 'member',
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Profile error:', profileError)
  } else {
    console.log('  ✓ Guest profile ready')
  }
}

main().catch(console.error)
