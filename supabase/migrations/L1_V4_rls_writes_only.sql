-- ====================================================================
-- L1 V4b — RLS writes-only check (INSERTs expected to FAIL)
-- ====================================================================
-- Cross-group INSERT attempts. Each ONE is its own transaction
-- (BEGIN/ROLLBACK isolation) so the failure doesn't poison subsequent
-- statements.
--
-- HOW TO RUN: highlight only the alpha block (5b-write), Run on
-- selected. You should see the RLS error. THEN highlight only the
-- beta block (5c-write), Run on selected. Same RLS error in the
-- other direction.
--
-- Both errors are the EXPECTED PASS — they prove RLS rejects
-- cross-group writes at the database layer.
-- ====================================================================


-- ────────────────────────────────────────────────────────────────────
-- 5b-write. Alpha tries to write into Watermelon. Should be rejected.
-- HIGHLIGHT THIS BLOCK ONLY (lines below this header through its ROLLBACK).
-- ────────────────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'fd5320d4-a311-4b2c-ab10-3aa615bde326';

INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('rls-test-alpha-into-beta', 'should fail', 'discussion',
        'fd5320d4-a311-4b2c-ab10-3aa615bde326',
        '00000000-0000-0000-0000-000000000002');
-- Expected: ERROR — new row violates row-level security policy.

ROLLBACK;


-- ────────────────────────────────────────────────────────────────────
-- 5c-write. Beta tries to write into test group. Should be rejected.
-- HIGHLIGHT THIS BLOCK ONLY (lines below this header through its ROLLBACK).
-- ────────────────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '46964cf3-8baa-4b00-a73d-deac084090af';

INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('rls-test-beta-into-alpha', 'should fail', 'discussion',
        '46964cf3-8baa-4b00-a73d-deac084090af',
        '00000000-0000-0000-0000-000000000001');
-- Expected: ERROR — new row violates row-level security policy.

ROLLBACK;
