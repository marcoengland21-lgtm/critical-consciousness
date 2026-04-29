-- 011_has_completed_onboarding_rollback.sql
--
-- Rollback for 011_has_completed_onboarding.sql. Drops the column.
--
-- Drop is destructive — any backfilled values are lost. Re-applying
-- the forward after rollback re-runs the backfill from scratch,
-- which (a) sets all existing rows to true except (b) explicitly
-- overrides alpha/beta to false. Mars's flag returns to true.
--
-- Any new accounts that existed between forward and rollback (i.e.
-- created with has_completed_onboarding = false from DEFAULT) lose
-- that state and re-pick-up true from the backfill. In the paired-
-- test window pre-launch this is fine (no real new accounts);
-- post-launch this rollback path should not be exercised without a
-- considered re-backfill plan.
--
-- Idempotent via IF EXISTS.

ALTER TABLE profiles DROP COLUMN IF EXISTS has_completed_onboarding;
