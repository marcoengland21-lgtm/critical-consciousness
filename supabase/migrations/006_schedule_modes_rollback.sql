-- ====================================================================
-- 006 ROLLBACK — Schedule modes (recurring v1)
-- ====================================================================
-- Reverses migration 006 in reverse dependency order:
--   1. Drop policies on group_chapter_history
--   2. Drop indexes
--   3. Drop group_chapter_history table (CASCADE will drop the FKs)
--   4. Reset test group's seeded values (NULL out the new columns)
--   5. Drop columns from groups
--   6. Drop schedule_mode enum
--
-- The ONLY data loss on rollback: any rows written to
-- group_chapter_history (host advance events) between forward and
-- rollback. For dev environments where rollback is being tested
-- before any host has advanced anything, that's zero rows. For
-- production rollback after real advances, those rows are lost. The
-- application would also need to revert to pre-006 application code
-- to function without the new columns.
--
-- Wrapped in BEGIN/COMMIT for atomic rollback.
-- ====================================================================

BEGIN;

-- =====================================================
-- 1. Drop RLS policies on group_chapter_history
-- =====================================================
DROP POLICY IF EXISTS "group_chapter_history_select_member" ON group_chapter_history;
DROP POLICY IF EXISTS "group_chapter_history_insert_host" ON group_chapter_history;


-- =====================================================
-- 2. Drop new indexes on groups
-- =====================================================
DROP INDEX IF EXISTS idx_groups_current_chapter;
DROP INDEX IF EXISTS idx_groups_schedule_mode;
DROP INDEX IF EXISTS idx_group_chapter_history_group_ended;


-- =====================================================
-- 3. Drop group_chapter_history table
-- =====================================================
DROP TABLE IF EXISTS group_chapter_history;


-- =====================================================
-- 4. Drop new columns from groups
-- =====================================================
-- Order matters: current_chapter_started_at depends on no other
-- column; current_chapter_id has the FK to text_chapters which goes
-- with the column drop; started_at is a plain DATE; schedule_mode is
-- the enum-typed column (drop before the enum itself).
ALTER TABLE groups DROP COLUMN IF EXISTS current_chapter_started_at;
ALTER TABLE groups DROP COLUMN IF EXISTS current_chapter_id;
ALTER TABLE groups DROP COLUMN IF EXISTS started_at;
ALTER TABLE groups DROP COLUMN IF EXISTS schedule_mode;


-- =====================================================
-- 5. Drop schedule_mode enum
-- =====================================================
DROP TYPE IF EXISTS schedule_mode;


COMMIT;

-- ====================================================================
-- Post-rollback verification queries (run separately after COMMIT)
-- ====================================================================

-- Confirm columns gone from groups
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'groups' AND column_name IN
--   ('schedule_mode', 'started_at', 'current_chapter_id', 'current_chapter_started_at');
-- Expect: 0 rows.

-- Confirm enum gone
-- SELECT 1 FROM pg_type WHERE typname = 'schedule_mode';
-- Expect: 0 rows.

-- Confirm table gone
-- SELECT 1 FROM information_schema.tables WHERE table_name = 'group_chapter_history';
-- Expect: 0 rows.
