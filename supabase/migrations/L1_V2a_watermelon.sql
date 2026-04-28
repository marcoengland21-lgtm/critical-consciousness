-- L1 V2a — Watermelon row exists
SELECT id, name, slug FROM groups
WHERE id = '00000000-0000-0000-0000-000000000002';
-- Expected: 1 row. name='Watermelon', slug='watermelon'.
