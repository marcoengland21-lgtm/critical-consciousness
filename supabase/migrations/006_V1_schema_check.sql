-- V1 — schema present
-- Run after re-applying 006_schedule_modes.sql.
-- Each query is independent; paste them in one at a time and capture
-- each result.

-- 1a. New columns on groups
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'groups'
  AND column_name IN (
    'schedule_mode',
    'started_at',
    'current_chapter_id',
    'current_chapter_started_at'
  )
ORDER BY column_name;
-- Expect 4 rows. schedule_mode = USER-DEFINED + NOT NULL,
-- the other three nullable.


-- 1b. schedule_mode enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'schedule_mode')
ORDER BY enumsortorder;
-- Expect 3 rows: recurring, bounded, specific.


-- 1c. group_chapter_history table shape
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_chapter_history'
ORDER BY ordinal_position;
-- Expect 6 rows: id, group_id, chapter_id, started_at, ended_at, created_at.
-- All NOT NULL.


-- 1d. RLS policies on group_chapter_history
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'group_chapter_history'::regclass
ORDER BY polname;
-- Expect 2 rows:
--   group_chapter_history_insert_host  | a (INSERT)
--   group_chapter_history_select_member | r (SELECT)
-- NO update or delete policies — append-only enforced at policy layer.


-- 1e. CHECK constraint on history table
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'group_chapter_history'::regclass
  AND contype = 'c';
-- Expect: 1 row with `history_chronological` and definition
-- containing `ended_at >= started_at`.
