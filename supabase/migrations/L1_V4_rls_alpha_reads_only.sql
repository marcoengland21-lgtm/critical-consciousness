-- ====================================================================
-- L1 V4 — alpha reads only (single block, editor cannot hide results)
-- ====================================================================
-- Cross-group SELECTs as user_alpha. Single transaction, single block,
-- nothing else in the file — the editor will show this block's results
-- because they are the only results.
--
-- Save the text output to:
--   docs/L1_VERIFICATION_RECORD/V4_alpha_reads.txt
-- ====================================================================

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'fd5320d4-a311-4b2c-ab10-3aa615bde326';

SELECT 'alpha sees Watermelon threads:'           AS test, count(*) AS n FROM threads          WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon annotations:',                count(*)      FROM annotations      WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon glossary:',                   count(*)      FROM glossary_entries WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon resources:',                  count(*)      FROM resources        WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon schedule:',                   count(*)      FROM reading_schedule WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon confusion_counts:',           count(*)      FROM confusion_counts WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees test-group threads (own):',              count(*)      FROM threads          WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- Expected: first 6 rows count=0 (RLS blocking cross-group reads),
-- last row whatever's in the test group (likely 0 since DB is empty).

ROLLBACK;
