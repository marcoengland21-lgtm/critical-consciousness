-- 010_group_session_timing_rollback.sql
--
-- Rollback for 010_group_session_timing.sql. Drops the RPC and the
-- two columns added by the forward.
--
-- Run order matters: RPC first (its body references the two columns;
-- dropping the columns first would invalidate the function), then
-- the columns.
--
-- Idempotent: uses IF EXISTS guards so re-running is safe.

DROP FUNCTION IF EXISTS set_group_session_timing(UUID, TIMESTAMPTZ, TEXT);

ALTER TABLE groups DROP COLUMN IF EXISTS session_recurrence;
ALTER TABLE groups DROP COLUMN IF EXISTS next_session_at;
