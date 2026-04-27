-- Annotations Publication State — chunk 3b piece 2c-i
--
-- Adds draft-state privacy to annotations. New annotations default to
-- `is_public = false` (only the author can read them); the author
-- toggles "Share with group" to publish. Existing rows are backfilled
-- to public so live conversations don't silently disappear.
--
-- Privacy framing: this is DRAFT-STATE privacy (same level as a
-- saved-but-not-sent email draft), NOT structural anonymity. A direct
-- DB query by an admin can still read the row. The journal's
-- RLS-at-database-level guarantee is a separate pattern; do not drift
-- toward suggesting that level of privacy in the UI copy.
--
-- Run via Supabase SQL editor:
--   https://supabase.com/dashboard/project/aufzylsnowiareuionna/sql/new
--
-- Idempotent — safe to re-run.

-- ── Step 1: column ──────────────────────────────────────────────────
ALTER TABLE annotations
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- ── Step 2: backfill ────────────────────────────────────────────────
-- Existing rows were created in the always-public model. Flipping
-- them to private would silently hide conversations the group can see
-- today. Mark all existing annotations public.
UPDATE annotations SET is_public = true WHERE is_public = false;

-- ── Step 3: SELECT RLS for annotations ──────────────────────────────
-- Replace any existing "read-all" policy with two policies:
--   3a: public annotations readable by anyone authenticated
--   3b: authors can always read their own (public OR private)
--
-- We drop common policy-name variants defensively because the original
-- name isn't tracked in the repo and may differ across environments.
DROP POLICY IF EXISTS "Anyone can read annotations" ON annotations;
DROP POLICY IF EXISTS "Authenticated users can read annotations" ON annotations;
DROP POLICY IF EXISTS "Annotations are publicly readable" ON annotations;
DROP POLICY IF EXISTS "Annotations are readable by all" ON annotations;
DROP POLICY IF EXISTS annotations_select ON annotations;
DROP POLICY IF EXISTS annotations_select_all ON annotations;

CREATE POLICY "Public annotations are readable by all"
  ON annotations
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Authors can read their own annotations"
  ON annotations
  FOR SELECT
  USING (author_id = auth.uid());

-- ── Step 4: SELECT RLS for annotation_replies ───────────────────────
-- Replies inherit parent visibility. A reply is readable iff its
-- parent annotation is public OR the reader is the parent's author.
-- This prevents a private-annotation's replies leaking via the
-- annotation_replies table after the parent is later published or
-- queried directly.
DROP POLICY IF EXISTS "Anyone can read annotation_replies" ON annotation_replies;
DROP POLICY IF EXISTS "Authenticated users can read annotation_replies" ON annotation_replies;
DROP POLICY IF EXISTS "Annotation replies are publicly readable" ON annotation_replies;
DROP POLICY IF EXISTS annotation_replies_select ON annotation_replies;

CREATE POLICY "Replies follow parent annotation visibility"
  ON annotation_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM annotations
      WHERE annotations.id = annotation_replies.annotation_id
        AND (annotations.is_public = true OR annotations.author_id = auth.uid())
    )
  );

-- ── Step 5: realtime publication ────────────────────────────────────
-- Annotations are already in the supabase_realtime publication. The
-- new column flows through automatically — no change needed.

-- ── Verification queries (paste into the SQL editor after running) ──
--
-- 1. Confirm the column exists and is non-null:
--    SELECT column_name, data_type, is_nullable, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'annotations' AND column_name = 'is_public';
--
-- 2. Confirm the backfill: zero rows should be private now.
--    SELECT count(*) FROM annotations WHERE is_public = false;
--
-- 3. List the new RLS policies:
--    SELECT policyname, cmd, qual FROM pg_policies
--    WHERE tablename IN ('annotations', 'annotation_replies')
--    ORDER BY tablename, policyname;
