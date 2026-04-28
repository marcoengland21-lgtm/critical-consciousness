-- L1 V2c — Mars is host on BOTH groups
SELECT g.name, gm.role
FROM group_memberships gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
WHERE p.role = 'admin'
ORDER BY g.created_at;
-- Expected: 2 rows, both role='host'. Order is by group creation,
-- so Christchurch Capital Reading Group appears first, then Watermelon.
