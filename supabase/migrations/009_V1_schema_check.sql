-- 009_V1_schema_check.sql
--
-- Verifies 009 forward applied correctly. Run after forward (or
-- after rollback-then-forward paired test) to confirm final state.
-- Same pattern as 006_V1 / 008_V1 / 010_V1 — single consolidated
-- query returns one row matching the expected post-state.

SELECT
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'glossary_entries'
       AND column_name = 'first_appearance_chapter') AS column_exists,
  (SELECT data_type FROM information_schema.columns
     WHERE table_name = 'glossary_entries'
       AND column_name = 'first_appearance_chapter') AS column_type,
  (SELECT is_nullable FROM information_schema.columns
     WHERE table_name = 'glossary_entries'
       AND column_name = 'first_appearance_chapter') AS column_nullable,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name
     WHERE tc.table_name = 'glossary_entries'
       AND tc.constraint_type = 'FOREIGN KEY'
       AND ccu.table_name = 'text_chapters') AS fk_to_text_chapters_count,
  (SELECT rc.delete_rule FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name
     JOIN information_schema.referential_constraints rc
       ON tc.constraint_name = rc.constraint_name
     WHERE tc.table_name = 'glossary_entries'
       AND tc.constraint_type = 'FOREIGN KEY'
       AND ccu.table_name = 'text_chapters') AS fk_delete_rule,
  (SELECT COUNT(*) FROM pg_indexes
     WHERE tablename = 'glossary_entries'
       AND indexname = 'glossary_first_appearance_chapter_idx') AS index_exists,
  (SELECT indexdef FROM pg_indexes
     WHERE tablename = 'glossary_entries'
       AND indexname = 'glossary_first_appearance_chapter_idx') AS index_def;

-- Expected single row:
--   1 | uuid | YES | 1 | SET NULL | 1 | CREATE INDEX glossary_first_appearance_chapter_idx
--   ON public.glossary_entries USING btree (first_appearance_chapter)
--   WHERE (first_appearance_chapter IS NOT NULL)
