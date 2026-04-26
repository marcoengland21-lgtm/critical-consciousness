-- ============================================================================
-- private_note_images storage bucket — chunk 2.5
--
-- Per-user RLS so only the owner can read or write images attached to their
-- journal entries. Mirrors the privacy guarantees on private_notes itself.
--
-- Object naming convention: <user_id>/<note_id>/<filename>
-- The first path segment encodes ownership so the RLS policies can match
-- the authenticated user against the path.
--
-- Run ONCE in Supabase SQL editor.
-- ============================================================================

-- Create the bucket — private (no public read), 5MB per object,
-- common image MIME types only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private_note_images',
  'private_note_images',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies — owner-only.
-- The path is structured as `<user_id>/<note_id>/<filename>`, so we
-- split_part the path on '/' and compare the first segment to auth.uid().

-- Read: only the owner (the user whose id matches the first path segment).
DROP POLICY IF EXISTS "private_note_images_select" ON storage.objects;
CREATE POLICY "private_note_images_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'private_note_images'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- Insert: must place the object under your own user_id prefix.
DROP POLICY IF EXISTS "private_note_images_insert" ON storage.objects;
CREATE POLICY "private_note_images_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'private_note_images'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- Update: only the owner.
DROP POLICY IF EXISTS "private_note_images_update" ON storage.objects;
CREATE POLICY "private_note_images_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'private_note_images'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- Delete: only the owner.
DROP POLICY IF EXISTS "private_note_images_delete" ON storage.objects;
CREATE POLICY "private_note_images_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'private_note_images'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- Note: image URLs in journal entries use createSignedUrl() at view time
-- since the bucket is private. The expiry should be long enough to render
-- a journal page comfortably (e.g. 1 hour) and short enough that a leaked
-- URL becomes useless quickly.
