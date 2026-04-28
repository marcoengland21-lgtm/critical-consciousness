-- ====================================================================
-- 007 ROLLBACK — Drop the recurring-mode schedule RPCs
-- ====================================================================
-- Reverses migration 007. After rollback, the schedule page host
-- controls would fail (the RPCs they call no longer exist), so the
-- application code from sub-batch 3+ also needs to be reverted before
-- this rollback is meaningful in production.
--
-- Wrapped in BEGIN/COMMIT for atomic rollback.
-- ====================================================================

BEGIN;

DROP FUNCTION IF EXISTS advance_chapter(UUID, UUID);
DROP FUNCTION IF EXISTS set_group_started_at(UUID, DATE);

COMMIT;

-- ====================================================================
-- Post-rollback verification
-- ====================================================================

-- SELECT proname FROM pg_proc
-- WHERE proname IN ('advance_chapter', 'set_group_started_at');
-- Expect: 0 rows.
