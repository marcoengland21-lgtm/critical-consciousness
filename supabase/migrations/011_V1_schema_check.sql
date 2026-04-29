-- 011_V1_schema_check.sql
--
-- Verifies 011 forward applied correctly. Run after forward (or
-- after rollback-then-forward paired test) to confirm final state.
-- Same pattern as 010_V1_schema_check.sql.
--
-- Two checks. Per the L1 process notes (CLAUDE.md), the Supabase
-- SQL editor sometimes hides intermediate results when multiple
-- queries run in one block — if results don't surface as expected,
-- highlight-and-run each check separately.

-- ── Check 1: column exists with correct type, NOT NULL, DEFAULT ──
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'has_completed_onboarding';
-- Expected: 1 row
--   has_completed_onboarding | boolean | NO | false


-- ── Check 2: backfill landed correctly ────────────────────────────
-- Mars (admin) → true. user_alpha + user_beta → false. Any other
-- existing accounts → true. New accounts created post-migration are
-- excluded from this snapshot — the flag is only meaningful at
-- signin time and the column DEFAULT handles new signups separately.
SELECT
  COALESCE(u.email, '(no auth.users row)') AS email,
  p.role,
  p.has_completed_onboarding
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY
  CASE p.role WHEN 'admin' THEN 0 ELSE 1 END,
  u.email NULLS LAST;
-- Expected:
--   - admin row (Mars) → has_completed_onboarding = true
--   - user_alpha@example.test → false  (if seeded via L1 V4)
--   - user_beta@example.test  → false  (if seeded via L1 V4)
--   - any other existing rows → true
