-- ====================================================================
-- L1 V4 — alpha writes only (single block, editor cannot hide error)
-- ====================================================================
-- Cross-group INSERT as user_alpha into Watermelon. Single transaction,
-- single block, nothing else in the file — the editor will show the
-- expected RLS rejection error because it's the only thing here.
--
-- Save the text output to:
--   docs/L1_VERIFICATION_RECORD/V4_alpha_writes.txt
-- ====================================================================

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'fd5320d4-a311-4b2c-ab10-3aa615bde326';

INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('rls-test-alpha-into-beta', 'should fail', 'discussion',
        'fd5320d4-a311-4b2c-ab10-3aa615bde326',
        '00000000-0000-0000-0000-000000000002');
-- Expected: ERROR — new row violates row-level security policy for table "threads".

ROLLBACK;
