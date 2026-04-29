-- 008_threads_chapter_id_rollback.sql
--
-- Rollback for 008_threads_chapter_id.sql. Drops the partial index
-- and the chapter_id column.
--
-- Run order matters: index first (must be dropped before its column),
-- then the column itself. IF EXISTS guards make this idempotent.
--
-- Data-loss surface: dropping the column drops all chapter_id values
-- that have been written since forward applied. After 008 ships and
-- new threads start writing chapter_id, rolling back loses those
-- anchors. Acceptable cost for a column-level rollback; chapter_id
-- is reconstructible from app context for any individual thread,
-- and the test data we're rolling against pre-launch has no real
-- chapter_id values to lose.

DROP INDEX IF EXISTS threads_chapter_id_idx;

ALTER TABLE threads DROP COLUMN IF EXISTS chapter_id;
