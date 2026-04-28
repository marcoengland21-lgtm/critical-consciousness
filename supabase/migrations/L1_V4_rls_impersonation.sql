-- ====================================================================
-- L1 V4b — RLS impersonation (THE LOAD-BEARING STRUCTURAL PROOF)
-- ====================================================================
-- This block proves RLS at the database layer prevents cross-group
-- reads regardless of any application-side filter. THE receipt for
-- "the schema-vs-application gap is closed."
--
-- Save the full output of this block to:
--   docs/L1_VERIFICATION_RECORD/V4_rls_impersonation_output.txt
-- as plain text. Also screenshot the SQL editor window. Both go in
-- the verification record.
--
-- Postgres requires request.jwt.claim.sub to be set in the session
-- for RLS to evaluate as that user. Each impersonation is wrapped in
-- BEGIN/ROLLBACK so a partial run can't leak state — and so any
-- INSERT attempts (which should fail) don't pollute the database.
-- ====================================================================

-- 5a. Get the user UUIDs for impersonation. Copy these somewhere.
SELECT email, id FROM auth.users
WHERE email IN ('user_alpha@example.test', 'user_beta@example.test')
ORDER BY email;
-- Substitute the two UUIDs below in place of <user_alpha-uuid> and
-- <user_beta-uuid>. The Mars UUID can come from:
--   SELECT id FROM profiles WHERE role = 'admin';
-- Substitute that for <mars-uuid>.


-- ────────────────────────────────────────────────────────────────────
-- 5b. Impersonate user_alpha. Should see test group only.
-- ────────────────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<user_alpha-uuid>';

-- Cross-group read: how many threads in Watermelon can alpha see?
SELECT 'alpha sees Watermelon threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0.

-- Same-group read: how many threads in test group can alpha see?
SELECT 'alpha sees test-group threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- Expected: equal to whatever's in the test group (could be 0 if it's
-- empty). Non-zero is fine — proves alpha CAN see her own group.

-- Cross-group reads across all group-scoped tables — uniform RLS check.
SELECT 'alpha sees Watermelon annotations:'    AS test, count(*) FROM annotations    WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon glossary:',                   count(*) FROM glossary_entries WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon resources:',                  count(*) FROM resources        WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon schedule:',                   count(*) FROM reading_schedule WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon confusion_counts:',           count(*) FROM confusion_counts WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- ALL Expected: 0.

-- Cross-group write — RLS should REJECT this.
INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('rls-test-alpha-into-beta', 'should fail', 'discussion',
        '<user_alpha-uuid>',
        '00000000-0000-0000-0000-000000000002');
-- Expected: ERROR — new row violates row-level security policy.
-- If this INSERT SUCCEEDS, STOP THE LINE and surface immediately.

ROLLBACK;


-- ────────────────────────────────────────────────────────────────────
-- 5c. Impersonate user_beta. Should see Watermelon only.
-- ────────────────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<user_beta-uuid>';

SELECT 'beta sees test-group threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 0.

SELECT 'beta sees Watermelon threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- Expected: equal to whatever's in Watermelon (likely 0 — Watermelon is
-- fresh-seeded with no content yet).

SELECT 'beta sees test-group annotations:'    AS test, count(*) FROM annotations    WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group glossary:',                   count(*) FROM glossary_entries WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group resources:',                  count(*) FROM resources        WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group schedule:',                   count(*) FROM reading_schedule WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group confusion_counts:',           count(*) FROM confusion_counts WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- ALL Expected: 0.

-- Cross-group write in the other direction.
INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('rls-test-beta-into-alpha', 'should fail', 'discussion',
        '<user_beta-uuid>',
        '00000000-0000-0000-0000-000000000001');
-- Expected: ERROR — new row violates row-level security policy.

ROLLBACK;


-- ────────────────────────────────────────────────────────────────────
-- 5d. Mars-as-admin sanity: should see both groups.
-- ────────────────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<mars-uuid>';

SELECT group_id, count(*) AS thread_count
FROM threads
GROUP BY group_id
ORDER BY group_id;
-- Expected: up to 2 rows (one per group with content). Both group_ids
-- visible. Trivial direction — included for completeness.

ROLLBACK;
