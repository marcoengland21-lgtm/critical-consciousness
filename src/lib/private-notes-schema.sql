-- ============================================================================
-- private_notes — IMPROVEMENTS_PLAN chunk 2 / private journal v1.
--
-- The platform's only fully-private surface. Half-formed thoughts, personal
-- connections, drafts, questions someone is embarrassed to ask publicly.
-- Pedagogically valuable only if the privacy actually holds.
--
-- The RLS policies below are the privacy guarantee. Do NOT add any policy
-- that lets admin or any other role read another user's notes via UI.
-- The service_role key can technically read anything (that's how Supabase
-- works); never use it for journal reads in app code. Admin client is only
-- acceptable for user-deletion cascades, which the FK already handles via
-- ON DELETE CASCADE.
--
-- chapter_id is reserved for chunk 3 (per-chapter notes); the column exists
-- from the start so chunk 3 can use it without a migration.
--
-- Run ONCE in Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS private_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES text_chapters(id) ON DELETE SET NULL,
  title text,
  body text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS private_notes_user_idx
  ON private_notes(user_id);
CREATE INDEX IF NOT EXISTS private_notes_chapter_idx
  ON private_notes(chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS private_notes_updated_idx
  ON private_notes(user_id, updated_at DESC);

-- Full-text search column over title + body. Generated + GIN-indexed so
-- search is fast even with thousands of entries. English config is fine
-- for v1; can revisit if the group writes in other languages.
ALTER TABLE private_notes
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS private_notes_tsv_idx
  ON private_notes USING gin(tsv);

ALTER TABLE private_notes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notes.
DROP POLICY IF EXISTS private_notes_select ON private_notes;
CREATE POLICY private_notes_select ON private_notes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert notes as themselves.
DROP POLICY IF EXISTS private_notes_insert ON private_notes;
CREATE POLICY private_notes_insert ON private_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own notes.
DROP POLICY IF EXISTS private_notes_update ON private_notes;
CREATE POLICY private_notes_update ON private_notes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own notes.
DROP POLICY IF EXISTS private_notes_delete ON private_notes;
CREATE POLICY private_notes_delete ON private_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at trigger. Reuses the existing
-- update_updated_at_column() function if it exists, otherwise creates it.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_private_notes_updated_at ON private_notes;
CREATE TRIGGER update_private_notes_updated_at
  BEFORE UPDATE ON private_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- IMPORTANT: do NOT add this table to the supabase_realtime publication.
-- Journal entries are private; broadcasting changes via realtime even within
-- an RLS-filtered subscription introduces unnecessary surface area.
