-- Allow public read access to threads, replies, annotations, and annotation replies
-- This enables guest/reviewer access without requiring authentication.
-- Write operations (INSERT/UPDATE/DELETE) still require authentication.

-- Threads: anyone can read
DROP POLICY IF EXISTS "threads_select" ON threads;
CREATE POLICY "threads_select" ON threads
  FOR SELECT USING (true);

-- Replies: anyone can read
DROP POLICY IF EXISTS "replies_select" ON replies;
CREATE POLICY "replies_select" ON replies
  FOR SELECT USING (true);

-- Annotations: anyone can read
DROP POLICY IF EXISTS "annotations_select" ON annotations;
CREATE POLICY "annotations_select" ON annotations
  FOR SELECT USING (true);

-- Annotation replies: anyone can read
DROP POLICY IF EXISTS "annotation_replies_select" ON annotation_replies;
CREATE POLICY "annotation_replies_select" ON annotation_replies
  FOR SELECT USING (true);

-- Profiles: anyone can read (needed for displaying author names)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);
