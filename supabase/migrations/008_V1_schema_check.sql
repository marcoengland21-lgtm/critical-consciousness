-- 008_V1_schema_check.sql
--
-- Verifies 008 forward applied correctly. Run after forward (or
-- after rollback-then-forward paired test) to confirm final state.
-- Same pattern as 006_V1 / 010_V1.
--
-- Three checks. Compare against expected outputs in comments.

-- ── Check 1: column exists with correct type and nullability ──────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'threads' AND column_name = 'chapter_id';
-- Expected: 1 row
--   chapter_id | uuid | YES

-- ── Check 2: FK constraint points at text_chapters(id) with SET NULL
SELECT
  tc.constraint_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'threads'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'text_chapters';
-- Expected: 1 row
--   threads_chapter_id_fkey | text_chapters | id | SET NULL

-- ── Check 3: partial index exists on chapter_id WHERE NOT NULL ────
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'threads' AND indexname = 'threads_chapter_id_idx';
-- Expected: 1 row
--   threads_chapter_id_idx
--   | CREATE INDEX threads_chapter_id_idx ON public.threads
--     USING btree (chapter_id) WHERE (chapter_id IS NOT NULL)
