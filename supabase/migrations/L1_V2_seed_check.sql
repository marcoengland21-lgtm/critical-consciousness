-- ====================================================================
-- L1 V2 — Watermelon seeded, Mars on both groups
-- ====================================================================
-- Run AFTER V1 passes. Confirms the data seeded by section 6 of the
-- forward migration is in place.
-- ====================================================================

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
-- Expected: 2 rows, both role='host'. Order is by group creation,
-- so the test group appears first, then Watermelon.


-- 2d. Mars's profiles.current_group_id defaults to Watermelon.
SELECT id, current_group_id FROM profiles
WHERE role = 'admin';
-- Expected: 1 row, current_group_id = 00000000-0000-0000-0000-000000000002.
