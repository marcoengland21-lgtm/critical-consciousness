-- ====================================================================
-- L1 paste-kit
-- ====================================================================
-- Sequenced SQL blocks for the L1 verification flow. Run each block
-- in the order numbered. Each block is self-contained and prints its
-- expected output in the comment above it.
--
-- Run on the PREVIEW BRANCH first. Don't run on main until V1-V6 pass
-- on the branch and a rollback test has confirmed the rollback path.
--
-- After branch creation in the Supabase dashboard, the SQL editor
-- defaults to the branch — confirm via the branch picker before pasting.
-- ====================================================================


-- ────────────────────────────────────────────────────────────────────
-- BLOCK 0 — Forward migration
-- Run the contents of supabase/migrations/005_l1_multitenancy.sql here.
-- It's ~800 lines; paste from the file. Expected last line: COMMIT.
-- If anything errors mid-block, STOP and surface the error before going
-- to BLOCK 1. The migration is in one transaction so a mid-block error
-- rolls everything back to pre-L1 state.
-- ────────────────────────────────────────────────────────────────────


-- ────────────────────────────────────────────────────────────────────
-- BLOCK 1 — V1: schema present
-- Expected: 5 columns on group_memberships, 2 enum values, 1 helper
-- function, 8 group_id columns on inheritor tables.
-- ────────────────────────────────────────────────────────────────────

-- 1a. group_memberships table shape
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'group_memberships'
ORDER BY ordinal_position;
-- Expected rows: id (uuid), user_id (uuid), group_id (uuid),
-- role (USER-DEFINED — group_role), joined_at (timestamp with time zone).

-- 1b. group_role enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'group_role')
ORDER BY enumsortorder;
-- Expected: 2 rows — host, member.

-- 1c. is_group_member function shape
SELECT proname, provolatile, prosecdef
FROM pg_proc WHERE proname = 'is_group_member';
-- Expected: 1 row, provolatile = 's', prosecdef = true.

-- 1d. group_id columns on every inheritor table
SELECT table_name FROM information_schema.columns
WHERE column_name = 'group_id'
  AND table_name IN ('confusion_counts', 'invite_codes', 'replies',
                     'annotation_replies', 'glossary_versions',
                     'glossary_comments', 'concept_edges', 'thread_branches')
ORDER BY table_name;
-- Expected: 8 rows.


-- ────────────────────────────────────────────────────────────────────
-- BLOCK 2 — V2: Watermelon seeded, Mars on both groups
-- ────────────────────────────────────────────────────────────────────

-- 2a. Watermelon row exists.
SELECT id, name, slug FROM groups
WHERE id = '00000000-0000-0000-0000-000000000002';
-- Expected: 1 row. name='Watermelon', slug='watermelon'.

-- 2b. Test group preserved.
SELECT id, name FROM groups
WHERE id = '00000000-0000-0000-0000-000000000001';
-- Expected: 1 row.

-- 2c. Mars is host on BOTH groups.
SELECT g.name, gm.role
FROM group_memberships gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
WHERE p.role = 'admin'
ORDER BY g.created_at;
-- Expected: 2 rows, both role='host'.


-- ────────────────────────────────────────────────────────────────────
-- BLOCK 3 — V3: RPCs updated to new signatures
-- ────────────────────────────────────────────────────────────────────

SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc WHERE proname IN ('increment_confusion', 'decrement_confusion')
ORDER BY proname;
-- Expected: 2 rows. Each row's pg_get_function_arguments output MUST
-- contain `p_group_id uuid` (or similar — the param appears, in any case).
-- If you see a row with arguments lacking p_group_id, the old signature
-- is still alive and the migration's DROP step didn't run. STOP and
-- surface — V3 is the receipt that the audit-completeness assertion holds.


-- ────────────────────────────────────────────────────────────────────
-- BLOCK 4 — Test user wiring (to be run AFTER you create user_alpha
-- and user_beta in Supabase Auth → Users → Add user)
--
-- Replace the email values below with whatever you used. The lookup-by-email
-- pattern means we don't have to deal with UUIDs by hand.
-- ────────────────────────────────────────────────────────────────────

-- 4a. user_alpha → test group only (00000000-0000-0000-0000-000000000001)
INSERT INTO group_memberships (group_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'member'
FROM auth.users
WHERE email = 'user_alpha@example.test';

-- 4b. user_beta → Watermelon only (00000000-0000-0000-0000-000000000002)
INSERT INTO group_memberships (group_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000002', id, 'member'
FROM auth.users
WHERE email = 'user_beta@example.test';

-- 4c. Set each user's profiles.current_group_id so when they log in,
-- the resolver lands them on their respective group without needing a
-- URL override.
-- Note: profiles row is auto-created on auth.user creation by the
-- on_auth_user_created trigger (per CLAUDE.md), so the row exists.
UPDATE profiles SET current_group_id = '00000000-0000-0000-0000-000000000001'
WHERE id = (SELECT id FROM auth.users WHERE email = 'user_alpha@example.test');

UPDATE profiles SET current_group_id = '00000000-0000-0000-0000-000000000002'
WHERE id = (SELECT id FROM auth.users WHERE email = 'user_beta@example.test');

-- 4d. Confirm — should return 2 rows showing each user mapped to one group.
SELECT u.email, g.name AS group_name, gm.role, p.current_group_id = g.id AS resolver_landing_matches
FROM group_memberships gm
JOIN auth.users u ON u.id = gm.user_id
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
WHERE u.email IN ('user_alpha@example.test', 'user_beta@example.test')
ORDER BY u.email;
-- Expected: 2 rows.
--   user_alpha@... | (test group name)        | member | t
--   user_beta@...  | Watermelon               | member | t


-- ────────────────────────────────────────────────────────────────────
-- BLOCK 5 — V4 SQL impersonation (THE LOAD-BEARING STRUCTURAL PROOF)
--
-- This block proves RLS at the database layer prevents cross-group
-- reads regardless of any application-side filter. It is THE receipt
-- for "the schema-vs-application gap is closed."
--
-- Save the output of this block to docs/L1_VERIFICATION_RECORD/V4_rls_impersonation_output.txt
-- as plain text. Also screenshot the SQL editor window. Both go in the
-- record.
--
-- Postgres requires the request.jwt.claim.sub setting to be in the
-- session for RLS to evaluate as that user. The SET LOCAL pattern
-- isolates each user impersonation to its own transaction — important
-- so a partial run doesn't leak state.
-- ────────────────────────────────────────────────────────────────────

-- 5a. Get the user UUIDs for the impersonation.
SELECT email, id FROM auth.users
WHERE email IN ('user_alpha@example.test', 'user_beta@example.test')
ORDER BY email;
-- Copy the two UUIDs. Substitute them into the blocks below in place of
-- <user_alpha-uuid> and <user_beta-uuid>.

-- 5b. Impersonate user_alpha. Should see the test group only.
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<user_alpha-uuid>';

-- Cross-group read attempt: how many threads in Watermelon can alpha see?
SELECT 'alpha sees Watermelon threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0.

-- Same-group read: how many threads in test group can alpha see?
SELECT 'alpha sees test-group threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- Expected: equal to whatever's in the test group (could be 0 if test
-- group has no threads yet). The point is non-zero is allowed; zero
-- only if the test group is genuinely empty.

-- Same drill across other group-scoped tables to prove the RLS shape
-- is uniform.
SELECT 'alpha sees Watermelon annotations:'    AS test, count(*) FROM annotations    WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon glossary_entries:',           count(*) FROM glossary_entries WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon resources:',                  count(*) FROM resources        WHERE group_id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'alpha sees Watermelon reading_schedule:',           count(*) FROM reading_schedule WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- ALL Expected: 0.

-- Cross-group write attempt — should be REJECTED by RLS.
INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('rls-test-alpha-into-beta', 'should fail', 'discussion',
        '<user_alpha-uuid>',
        '00000000-0000-0000-0000-000000000002');
-- Expected: ERROR — new row violates row-level security policy.
-- If this INSERT succeeds, STOP THE LINE. That's a leak, surface immediately.

ROLLBACK;

-- 5c. Impersonate user_beta. Should see Watermelon only.
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<user_beta-uuid>';

SELECT 'beta sees test-group threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- Expected: 0.

SELECT 'beta sees Watermelon threads:' AS test, count(*) AS rows
FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- Expected: equal to whatever's in Watermelon (likely 0 at this stage
-- since Watermelon is fresh-seeded with no content).

SELECT 'beta sees test-group annotations:'    AS test, count(*) FROM annotations    WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group glossary_entries:',           count(*) FROM glossary_entries WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group resources:',                  count(*) FROM resources        WHERE group_id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'beta sees test-group reading_schedule:',           count(*) FROM reading_schedule WHERE group_id = '00000000-0000-0000-0000-000000000001';
-- ALL Expected: 0.

-- Cross-group write attempt in the other direction.
INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('rls-test-beta-into-alpha', 'should fail', 'discussion',
        '<user_beta-uuid>',
        '00000000-0000-0000-0000-000000000001');
-- Expected: ERROR — new row violates row-level security policy.

ROLLBACK;

-- 5d. (Optional) Mars-as-admin sanity check: should see both groups.
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '<mars-uuid>';
SELECT group_id, count(*) AS thread_count
FROM threads
GROUP BY group_id
ORDER BY group_id;
-- Expected: 2 rows (one per group), both visible.
ROLLBACK;
