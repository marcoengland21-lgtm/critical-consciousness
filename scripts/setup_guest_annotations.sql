-- Setup guest annotation mode for reviewer access
-- This creates RLS policies for the anon role so unauthenticated visitors can read + annotate
-- TODO: RE-ENABLE AUTH — Remove these policies when reviewer access is no longer needed
-- Guest auth user ID (created via admin API): ad4ce43f-6a30-484b-8f2c-df66f6b0276b

-- Drop existing policies first (safe if they don't exist)
DROP POLICY IF EXISTS "anon_text_documents_select" ON text_documents;
DROP POLICY IF EXISTS "anon_text_chapters_select" ON text_chapters;
DROP POLICY IF EXISTS "anon_annotations_select" ON annotations;
DROP POLICY IF EXISTS "anon_annotations_insert" ON annotations;
DROP POLICY IF EXISTS "anon_annotation_replies_select" ON annotation_replies;
DROP POLICY IF EXISTS "anon_annotation_replies_insert" ON annotation_replies;
DROP POLICY IF EXISTS "anon_profiles_select" ON profiles;

-- Allow anon (unauthenticated) users to read all text content
CREATE POLICY "anon_text_documents_select" ON text_documents
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_text_chapters_select" ON text_chapters
  FOR SELECT TO anon USING (true);

-- Allow anon users to read and create annotations (guest mode)
CREATE POLICY "anon_annotations_select" ON annotations
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_annotations_insert" ON annotations
  FOR INSERT TO anon WITH CHECK (
    author_id = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'
  );

-- Allow anon users to read and create annotation replies
CREATE POLICY "anon_annotation_replies_select" ON annotation_replies
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_annotation_replies_insert" ON annotation_replies
  FOR INSERT TO anon WITH CHECK (
    author_id = 'ad4ce43f-6a30-484b-8f2c-df66f6b0276b'
  );

-- Allow anon to read profiles (needed for author display names)
CREATE POLICY "anon_profiles_select" ON profiles
  FOR SELECT TO anon USING (true);

-- Enable realtime for annotations and replies
ALTER PUBLICATION supabase_realtime ADD TABLE annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE annotation_replies;
