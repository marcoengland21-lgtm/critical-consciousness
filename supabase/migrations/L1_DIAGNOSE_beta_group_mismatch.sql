-- ====================================================================
-- L1 DIAGNOSTIC — beta's group resolver mismatch
-- ====================================================================
-- During V5, beta's UI shows "Christchurch Capital Reading Group" as
-- the group name, but the actual data is Watermelon-scoped (no schedule,
-- no threads, etc.). This is incoherent — either the resolver is
-- returning a {groupId, name} pair from different groups, or there's
-- something stale.
--
-- Run each query separately. Paste results back to Claude.
-- ====================================================================

-- 1. What's beta's profile.current_group_id?
SELECT
  u.email,
  p.id,
  p.current_group_id,
  g.name AS current_group_name
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN groups g ON g.id = p.current_group_id
WHERE u.email = 'user_beta@example.test';
-- Expected: current_group_id = 00000000-0000-0000-0000-000000000002 (Watermelon).
-- If it's 00000000-...001 instead, we found the bug.


-- 2. What memberships does beta have?
SELECT
  u.email,
  gm.group_id,
  g.name AS group_name,
  gm.role,
  gm.joined_at
FROM group_memberships gm
JOIN auth.users u ON u.id = gm.user_id
JOIN groups g ON g.id = gm.group_id
WHERE u.email = 'user_beta@example.test'
ORDER BY gm.joined_at;
-- Expected: 1 row, Watermelon, member.
-- If beta has memberships in BOTH groups (somehow), that's also a bug.


-- 4. Direct row inspection on groups table.
-- If Watermelon's row at UUID ...002 stores name='Watermelon', the bug
-- is in the fetch path (resolver returns wrong row, or mismatched
-- {groupId, name} pair). If Watermelon's row stores
-- name='Christchurch Capital Reading Group' (or anything other than
-- 'Watermelon'), the bug is at the data layer — the L1 INSERT didn't
-- land cleanly or got overwritten.
SELECT id, name, slug, created_at FROM groups ORDER BY id;
-- Expected:
--   00000000-0000-0000-0000-000000000001 | Christchurch Capital Reading Group
--   00000000-0000-0000-0000-000000000002 | Watermelon


-- 3. Simulate the resolver's step 2 query AS beta (with RLS active).
-- This is what the application sees when beta loads any page.
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '46964cf3-8baa-4b00-a73d-deac084090af';

-- Step 0 of resolver: fetch beta's profile
SELECT
  'step 0 - profile' AS step,
  role,
  current_group_id
FROM profiles
WHERE id = '46964cf3-8baa-4b00-a73d-deac084090af';

-- Step 2 of resolver: fetch group by current_group_id
-- If profile.current_group_id is X, this is what the app gets back.
SELECT
  'step 2 - groups by id' AS step,
  id,
  name,
  slug
FROM groups
WHERE id = (
  SELECT current_group_id
  FROM profiles
  WHERE id = '46964cf3-8baa-4b00-a73d-deac084090af'
);

-- Step 2 membership check
SELECT
  'step 2 - membership check' AS step,
  group_id,
  role
FROM group_memberships
WHERE user_id = '46964cf3-8baa-4b00-a73d-deac084090af'
  AND group_id = (
    SELECT current_group_id
    FROM profiles
    WHERE id = '46964cf3-8baa-4b00-a73d-deac084090af'
  );

ROLLBACK;
