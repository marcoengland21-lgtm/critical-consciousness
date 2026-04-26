-- ============================================================================
-- private_notes Tiptap migration — chunk 2.5
--
-- Replaces the chunk 2 markdown-string `body` column with Tiptap's native
-- JSON document representation, plus a derived plain-text column for full-
-- text search and list-view previews.
--
-- Per the chunk 2.5 brief, Mars confirmed there's no data to preserve —
-- existing rows are wiped before column changes.
--
-- Run ONCE in Supabase SQL editor.
-- ============================================================================

-- Step 1: Wipe existing rows (no data to preserve per Mars).
DELETE FROM private_notes;

-- Step 2: Drop the search index + tsv column so we can recreate them
-- against the new body_text column.
DROP INDEX IF EXISTS private_notes_tsv_idx;
ALTER TABLE private_notes DROP COLUMN IF EXISTS tsv;

-- Step 3: Drop the old markdown body column.
ALTER TABLE private_notes DROP COLUMN IF EXISTS body;

-- Step 4: Add the new Tiptap-native columns.
-- body_json is the canonical source of truth (what Tiptap edits/renders).
-- body_text is the plain-text extraction (computed from JSON via
-- editor.getText() at save time) — used for search and previews.
ALTER TABLE private_notes
  ADD COLUMN IF NOT EXISTS body_json jsonb
  DEFAULT '{"type": "doc", "content": []}'::jsonb;

ALTER TABLE private_notes
  ADD COLUMN IF NOT EXISTS body_text text NOT NULL DEFAULT '';

-- Step 5: Make body_json NOT NULL now that the default is in place.
ALTER TABLE private_notes ALTER COLUMN body_json SET NOT NULL;

-- Step 6: Recreate the search index against body_text.
ALTER TABLE private_notes
  ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS private_notes_tsv_idx
  ON private_notes USING gin(tsv);
