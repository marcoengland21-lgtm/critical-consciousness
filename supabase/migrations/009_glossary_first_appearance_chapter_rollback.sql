-- 009_glossary_first_appearance_chapter_rollback.sql
--
-- Rollback for 009_glossary_first_appearance_chapter.sql. Drops the
-- partial index then the first_appearance_chapter column.
--
-- Run order matters: index first (must be dropped before its column),
-- then the column itself. IF EXISTS guards make this idempotent.
--
-- Data-loss surface: dropping the column drops all
-- first_appearance_chapter values written since forward applied.
-- Same shape as 008's data-loss note — chapter_id values are
-- reconstructible from app context per glossary entry, and the test
-- data we're rolling against pre-launch has nothing real to lose.

DROP INDEX IF EXISTS glossary_first_appearance_chapter_idx;

ALTER TABLE glossary_entries DROP COLUMN IF EXISTS first_appearance_chapter;
