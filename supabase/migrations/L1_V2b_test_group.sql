-- L1 V2b — test group row preserved
SELECT id, name FROM groups
WHERE id = '00000000-0000-0000-0000-000000000001';
-- Expected: 1 row. (Christchurch Capital Reading Group — confirmed via
-- V4 wiring output earlier.)
