-- ====================================================================
-- L1 V4a — Test user wiring
-- ====================================================================
-- PREREQUISITE: create user_alpha and user_beta in Supabase Auth
-- (Auth → Users → Add user) BEFORE running this. The lookup-by-email
-- pattern below means we don't have to copy UUIDs by hand.
--
-- Replace the email values below if you used different ones. Default
-- assumes user_alpha@example.test and user_beta@example.test.
-- ====================================================================

-- 4a-1. user_alpha → test group only (00000000-0000-0000-0000-000000000001)
INSERT INTO group_memberships (group_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'member'
FROM auth.users
WHERE email = 'user_alpha@example.test';


-- 4a-2. user_beta → Watermelon only (00000000-0000-0000-0000-000000000002)
INSERT INTO group_memberships (group_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000002', id, 'member'
FROM auth.users
WHERE email = 'user_beta@example.test';


-- 4a-3. Set each user's profiles.current_group_id so the resolver lands
-- them on their own group at login (no URL override needed).
-- Note: profiles row is auto-created on auth.user creation by the
-- on_auth_user_created trigger, so the row already exists.
UPDATE profiles SET current_group_id = '00000000-0000-0000-0000-000000000001'
WHERE id = (SELECT id FROM auth.users WHERE email = 'user_alpha@example.test');

UPDATE profiles SET current_group_id = '00000000-0000-0000-0000-000000000002'
WHERE id = (SELECT id FROM auth.users WHERE email = 'user_beta@example.test');


-- 4a-4. Confirm — should return 2 rows, each user mapped to one group,
-- resolver_landing_matches = t for both.
SELECT
  u.email,
  g.name AS group_name,
  gm.role,
  p.current_group_id = g.id AS resolver_landing_matches
FROM group_memberships gm
JOIN auth.users u ON u.id = gm.user_id
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
WHERE u.email IN ('user_alpha@example.test', 'user_beta@example.test')
ORDER BY u.email;
-- Expected: 2 rows.
--   user_alpha@... | (test group name) | member | t
--   user_beta@...  | Watermelon        | member | t
