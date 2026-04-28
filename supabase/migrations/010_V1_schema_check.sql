-- 010_V1_schema_check.sql
--
-- Verifies 010 forward applied correctly. Run after forward
-- (or after rollback-then-forward paired test) to confirm final
-- state. Same pattern as 006_V1_schema_check.sql.
--
-- Three queries — run separately or together. Each prints what
-- the result should look like in a comment below.

-- ── Check 1: both columns exist with correct types ────────────────
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'groups'
  AND column_name IN ('next_session_at', 'session_recurrence')
ORDER BY column_name;
-- Expected: 2 rows
--   next_session_at    | timestamp with time zone | YES
--   session_recurrence | text                     | YES

-- ── Check 2: RPC exists with correct signature ────────────────────
SELECT
  proname,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS result_type
FROM pg_proc
WHERE proname = 'set_group_session_timing';
-- Expected: 1 row
--   set_group_session_timing
--   | p_group_id uuid, p_next_session_at timestamp with time zone, p_recurrence text
--   | void

-- ── Check 3: RPC has SECURITY DEFINER set ─────────────────────────
SELECT
  proname,
  prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'set_group_session_timing';
-- Expected: 1 row, is_security_definer = true
