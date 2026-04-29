-- 011_has_completed_onboarding.sql
--
-- Adds `has_completed_onboarding` to profiles for the post-signup
-- onboarding-scroll routing flag (Brief 1, Sprint A Session 1).
--
-- Routing semantics:
--   - false → user lands on /welcome (the onboarding scroll) on signin
--   - true  → user lands on /dashboard on signin
--   - signup always routes to /welcome regardless of flag (the flag
--     gets flipped to true at the end of the scroll, section 8 CTA).
--
-- New accounts: column DEFAULT false. The handle_new_user trigger in
-- schema.sql does not set this column explicitly, so DEFAULT applies
-- and new signups land on the scroll. Verified the trigger only
-- writes (id, display_name, role) — adding to the column-list there
-- would be a separate change and isn't needed; DEFAULT does the job.
--
-- Existing accounts (backfill): default true (skip onboarding for
-- pre-launch accounts). Two exceptions, set explicitly to false so
-- they remain available to walk through the scroll during E2E test:
--   - user_alpha@example.test (test group only — L1 V4)
--   - user_beta@example.test  (Watermelon only — L1 V4)
-- Mars (admin) is part of the "default true" backfill — he doesn't
-- need to see the scroll on signin.
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + the backfill UPDATE is
-- guarded by `WHERE has_completed_onboarding IS NULL` so re-running
-- does not flip new accounts (which have FALSE from DEFAULT) back
-- to TRUE. After SET NOT NULL applies, the WHERE clause matches no
-- rows on subsequent runs.
--
-- Wrapped in BEGIN/COMMIT for atomic apply/rollback.

BEGIN;

-- =====================================================
-- 1. Add column (nullable first, for the staged backfill)
-- =====================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN;

-- =====================================================
-- 2. Backfill — default to true for existing accounts
-- =====================================================
-- Only touches rows where the column is NULL. After SET NOT NULL
-- below, no future row can be NULL, so this UPDATE becomes a no-op
-- on re-runs. New signups (after this migration) get FALSE from the
-- DEFAULT and aren't touched here.
UPDATE profiles SET has_completed_onboarding = true
WHERE has_completed_onboarding IS NULL;

-- =====================================================
-- 3. Override alpha/beta to false
-- =====================================================
-- Lookup-by-email pattern (portable across environments) — same
-- shape as L1 V4's test-user-wiring SQL. If the test users don't
-- exist in this environment, the UPDATE matches 0 rows and silently
-- succeeds (which is the correct behaviour — production won't have
-- these users).
UPDATE profiles
SET has_completed_onboarding = false
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('user_alpha@example.test', 'user_beta@example.test')
);

-- =====================================================
-- 4. Lock down: NOT NULL + DEFAULT false
-- =====================================================
-- DEFAULT applies to all subsequent INSERTs that don't specify the
-- column, including the handle_new_user trigger.
ALTER TABLE profiles
  ALTER COLUMN has_completed_onboarding SET NOT NULL;

ALTER TABLE profiles
  ALTER COLUMN has_completed_onboarding SET DEFAULT false;

COMMIT;
