-- ====================================================================
-- L1 V4b — RLS reads-only check (no INSERTs)
-- ====================================================================
-- Cross-group SELECTs only. Each block ends in ROLLBACK so nothing
-- persists. Run the WHOLE file at once — the SELECTs all return cleanly
-- with no errors to hide the results.
--
-- Expected outputs are documented inline.
-- ====================================================================


-- ────────────────────────────────────────────────────────────────────
-- 5b-reads. Impersonate user_alpha. Should see test group only.
-- ────────────────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'fd5320d4-a311-4b2c-ab10-3aa615bde326';

-- All cross-group reads should return 0. Same-group read can be 0+.
SELECT 'alpha sees Watermelon threads:'           AS test, count(*) FROM threads          WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon annotations:',                count(*) FROM annotations      WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon glossary:',                   count(*) FROM glossary_entries WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon resources:',                  count(*) FROM resources        WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon schedule:',                   count(*) FROM reading_schedule WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon confusion_counts:',           count(*) FROM confusion_counts WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees test-group threads (own):',              count(*) FROM threads          WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- Expected: first 6 rows count=0, last row whatever's in test group (likely 0).

ROLLBACK;


-- ────────────────────────────────────────────────────────────────────
-- 5c-reads. Impersonate user_beta. Should see Watermelon only.
-- ────────────────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '46964cf3-8baa-4b00-a73d-deac084090af';

SELECT 'beta sees test-group threads:'           AS test, count(*) FROM threads          WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group annotations:',                count(*) FROM annotations      WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group glossary:',                   count(*) FROM glossary_entries WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group resources:',                  count(*) FROM resources        WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group schedule:',                   count(*) FROM reading_schedule WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group confusion_counts:',           count(*) FROM confusion_counts WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees Watermelon threads (own):',              count(*) FROM threads          WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- Expected: first 6 rows count=0, last row whatever's in Watermelon (likely 0).

ROLLBACK;
