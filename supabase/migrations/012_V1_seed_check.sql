-- 012_V1_seed_check.sql
--
-- Verifies 012 forward applied correctly. Run after forward (or
-- after rollback-then-forward paired test) to confirm final state.

-- ── Check 1: row exists with the right shape ──────────────────────
SELECT
  ic.code,
  ic.group_id,
  g.slug AS group_slug,
  g.name AS group_name,
  ic.max_uses,
  ic.active,
  (ic.created_by IS NOT NULL) AS has_creator_attribution
FROM invite_codes ic
LEFT JOIN groups g ON g.id = ic.group_id
WHERE ic.code = 'WATERMELON26';
-- Expected: 1 row
--   code            | WATERMELON26
--   group_id        | 00000000-0000-0000-0000-000000000002
--   group_slug      | watermelon
--   group_name      | Watermelon
--   max_uses        | (null)
--   active          | true
--   has_creator_attribution | true   (if an admin profile exists)
