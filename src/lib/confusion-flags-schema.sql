-- Confusion Flags Schema — Genuinely Anonymous
--
-- Rule 24: "Confusion flags are genuinely anonymous at the database level.
-- Not just 'hidden' — store counts only, not user IDs. No way, even for
-- admins, to see who flagged what."
--
-- This table stores ONLY counts per paragraph. No user_id column exists.
-- Client-side localStorage tracks what the current user has flagged.
-- Even with full database access, it's impossible to determine who flagged what.
--
-- Run via Supabase SQL editor.

-- Drop old table if it exists (it stored user_ids, violating Rule 24)
DROP TABLE IF EXISTS confusion_flags CASCADE;

-- Create the anonymous counts table
CREATE TABLE IF NOT EXISTS confusion_counts (
  chapter_id uuid NOT NULL REFERENCES text_chapters(id) ON DELETE CASCADE,
  paragraph_index integer NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (chapter_id, paragraph_index)
);

-- Enable RLS
ALTER TABLE confusion_counts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read counts
CREATE POLICY "Anyone can read confusion counts"
  ON confusion_counts
  FOR SELECT
  USING (true);

-- Only RPC functions can modify (SECURITY DEFINER bypasses RLS)
-- No direct INSERT/UPDATE/DELETE policies for regular users

-- Atomic increment — creates row if it doesn't exist
CREATE OR REPLACE FUNCTION increment_confusion(
  p_chapter_id uuid,
  p_paragraph_index integer
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO confusion_counts (chapter_id, paragraph_index, count)
  VALUES (p_chapter_id, p_paragraph_index, 1)
  ON CONFLICT (chapter_id, paragraph_index)
  DO UPDATE SET count = confusion_counts.count + 1
  RETURNING count;
$$;

-- Atomic decrement — never goes below 0
CREATE OR REPLACE FUNCTION decrement_confusion(
  p_chapter_id uuid,
  p_paragraph_index integer
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE confusion_counts
  SET count = GREATEST(0, count - 1)
  WHERE chapter_id = p_chapter_id AND paragraph_index = p_paragraph_index
  RETURNING count;
$$;

-- Enable realtime for live updates across users
ALTER PUBLICATION supabase_realtime ADD TABLE confusion_counts;
