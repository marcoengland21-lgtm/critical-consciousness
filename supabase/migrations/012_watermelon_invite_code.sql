-- 012_watermelon_invite_code.sql
--
-- Inserts the WATERMELON26 invite code row, scoped to the Watermelon
-- group seeded in 005 (`00000000-0000-0000-0000-000000000002`).
--
-- Reusable: max_uses = NULL. The invite-code validation logic in
-- registerUser (Sprint A Session 1, sub-batch 5) treats NULL as
-- "no cap" — anyone holding the code can join Watermelon for the
-- duration of pre-launch.
--
-- Dependencies (must already exist in this DB):
--   - migration 005 (L1) — adds invite_codes.group_id column AND
--     seeds the Watermelon group row.
-- The INSERT below presumes both. If 005 hasn't run, the FK on
-- invite_codes.group_id will reject the seed.
--
-- created_by attribution: looked up by role rather than hardcoded
-- UUID for portability — same pattern as 005's host-membership seed.
-- Falls to NULL gracefully if no admin profile exists (created_by
-- is nullable).
--
-- Idempotency: ON CONFLICT (code) DO UPDATE re-syncs group_id /
-- max_uses / active on re-run. Safe to apply repeatedly.
--
-- ── KNOWN TECH DEBT (out of scope for this migration) ─────────────
-- The validateInviteCode flow today increments use_count BEFORE
-- supabase.auth.signUp succeeds. If signup fails post-validation,
-- the count is incremented for a user who never existed. For
-- WATERMELON26 (max_uses = NULL, reusable) this is harmless. For
-- any future finite-use code it would burn capacity. Accepted as
-- known issue for v1; address when finite-use codes ship — likely
-- by moving the increment AFTER successful auth.users insert in
-- the registerUser server action.

INSERT INTO invite_codes (code, group_id, max_uses, active, created_by)
VALUES (
  'WATERMELON26',
  '00000000-0000-0000-0000-000000000002',
  NULL,
  true,
  (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1)
)
ON CONFLICT (code) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  max_uses = EXCLUDED.max_uses,
  active = EXCLUDED.active;
