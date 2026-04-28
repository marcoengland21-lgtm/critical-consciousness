-- ====================================================================
-- 006 — Schedule modes (recurring v1) + group_chapter_history
-- ====================================================================
-- Replaces the implicit date-based 32-week schedule assumption with a
-- real `schedule_mode` column on `groups`. Three modes supported in
-- schema; only `recurring` has UI built in this piece. `bounded` and
-- `specific` schemas are pre-provisioned so future work doesn't need
-- migration.
--
-- Recurring mode state lives entirely on `groups`:
--   - schedule_mode = 'recurring'
--   - started_at: when the group began reading (host sets, not derived)
--   - current_chapter_id: which text_chapters row is current
--   - current_chapter_started_at: when current_chapter_id was last set
--
-- Append-only history table records every chapter stay end:
--   - group_chapter_history(group_id, chapter_id, started_at, ended_at)
--   - Records on EVERY transition (advance / skip / go-back). Repeat
--     stays produce repeat rows; data layer doesn't dedupe. UI handles
--     rendering of repeated stays.
--
-- Wrapped in BEGIN/COMMIT for atomic apply/rollback.
-- ====================================================================

BEGIN;

-- =====================================================
-- 1. Schedule mode enum
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_mode') THEN
    CREATE TYPE schedule_mode AS ENUM ('recurring', 'bounded', 'specific');
  END IF;
END $$;


-- =====================================================
-- 2. New columns on groups
-- =====================================================
-- schedule_mode: defaults to 'recurring' for all existing rows + new groups.
-- The default applies during the column-add, populating Watermelon and
-- test group with 'recurring' automatically.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS schedule_mode schedule_mode NOT NULL DEFAULT 'recurring';

-- started_at: nullable. Host sets when group begins reading. Until set,
-- the dashboard orientation line and schedule page render an honest
-- empty state ("This group hasn't started reading yet").
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS started_at DATE;

-- current_chapter_id: FK to text_chapters. Nullable — until host sets,
-- recurring-aware widgets render honest empty states. ON DELETE SET NULL
-- so a chapter row deletion doesn't cascade-destroy group state (very
-- unlikely scenario but defensive).
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS current_chapter_id UUID
    REFERENCES text_chapters(id) ON DELETE SET NULL;

-- current_chapter_started_at: when current_chapter_id was last set or
-- changed. Used to compute the chapter counter ("Week 3 on Chapter 1").
-- Nullable in lockstep with current_chapter_id.
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS current_chapter_started_at TIMESTAMP WITH TIME ZONE;


-- =====================================================
-- 3. group_chapter_history table
-- =====================================================
-- Append-only. Every chapter stay end (advance / skip / go-back) writes
-- one row. Captures the full timeline of what the group actually read,
-- in order, with how long each stay lasted.
--
-- chapter_id uses ON DELETE RESTRICT so history is preserved even if a
-- text_chapters row is somehow deleted — that situation should never
-- happen in practice but the constraint guarantees the historical
-- record is honest.
CREATE TABLE IF NOT EXISTS group_chapter_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES text_chapters(id) ON DELETE RESTRICT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Validity check: a stay can't end before it started.
  CONSTRAINT history_chronological CHECK (ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_group_chapter_history_group_ended
  ON group_chapter_history(group_id, ended_at DESC);


-- =====================================================
-- 4. RLS on group_chapter_history
-- =====================================================
-- SELECT: any member of the group can see the history.
-- INSERT: only hosts. Members can't write to history.
-- UPDATE / DELETE: NO POLICY. Append-only at the policy level — even
-- hosts can't rewrite history. The DEFAULT-DENY behavior of RLS means
-- absent UPDATE/DELETE policies, those operations are rejected for all
-- non-superuser roles.
ALTER TABLE group_chapter_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_chapter_history_select_member" ON group_chapter_history;
CREATE POLICY "group_chapter_history_select_member" ON group_chapter_history
  FOR SELECT USING (is_group_member(group_id));

DROP POLICY IF EXISTS "group_chapter_history_insert_host" ON group_chapter_history;
CREATE POLICY "group_chapter_history_insert_host" ON group_chapter_history
  FOR INSERT WITH CHECK (
    is_group_member(group_id)
    AND EXISTS (
      SELECT 1 FROM group_memberships
      WHERE user_id = auth.uid()
        AND group_id = group_chapter_history.group_id
        AND role = 'host'
    )
  );


-- =====================================================
-- 5. Indexes for new groups columns
-- =====================================================
-- current_chapter_id is queried by AttentionMagnitudeBars and
-- WhereStuckWidget for chapter-scoped widgets. Index for fast lookup
-- when filtering "all groups currently on chapter X" — useful for
-- future cross-group analytics, even though current widgets only
-- look up a single group's row.
CREATE INDEX IF NOT EXISTS idx_groups_current_chapter ON groups(current_chapter_id);
CREATE INDEX IF NOT EXISTS idx_groups_schedule_mode ON groups(schedule_mode);


-- =====================================================
-- 6. Test group seed — switch to recurring with sensible defaults
-- =====================================================
-- Test group's existing 4 reading_schedule rows become harmless dead
-- data — recurring mode doesn't query reading_schedule. The data sits
-- in the table for future bounded/specific mode use; no migration of
-- the rows themselves.
--
-- Defaults chosen:
--   - started_at = test group's groups.created_at (2026-03-13 per V2c)
--   - current_chapter_id = the text_chapters row for chapter_number = 4
--     (which is Section 4 of Chapter 1 — matches what the existing
--     reading_schedule said was test group's "current week," Week 4 =
--     The Fetishism of Commodities)
--   - current_chapter_started_at = NOW() at migration time. There's no
--     honest historical timestamp to use; this is dev fixtures, not
--     real history. Production behavior unaffected.
UPDATE groups
SET
  schedule_mode = 'recurring',  -- redundant with column default but explicit for clarity
  started_at = (SELECT created_at::date FROM groups WHERE id = '00000000-0000-0000-0000-000000000001'),
  current_chapter_id = (
    SELECT id FROM text_chapters WHERE chapter_number = 4 LIMIT 1
  ),
  current_chapter_started_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';


-- =====================================================
-- 7. Watermelon — schedule_mode set, other fields stay NULL
-- =====================================================
-- Watermelon's schedule_mode defaults to 'recurring' from the column
-- default. started_at, current_chapter_id, current_chapter_started_at
-- stay NULL until Mars seeds them post-deploy via a setup helper or
-- direct DB edit (not built as a UI in this piece).
--
-- During the gap (Watermelon = recurring + NULL fields), the dashboard
-- and schedule page render honest empty states. No platform-generated
-- structure the group hasn't earned — exactly the foundational principle
-- this piece exists to honor.
--
-- No-op UPDATE here for clarity; the column default already populated
-- schedule_mode = 'recurring' for Watermelon.


-- =====================================================
-- 8. Verification — sanity check before COMMIT
-- =====================================================
-- Confirm the migration's data changes landed as expected.
DO $$
DECLARE
  v_test_group_chapter UUID;
  v_test_group_started DATE;
  v_watermelon_mode schedule_mode;
BEGIN
  -- Test group should have current_chapter_id set
  SELECT current_chapter_id, started_at INTO v_test_group_chapter, v_test_group_started
  FROM groups WHERE id = '00000000-0000-0000-0000-000000000001';

  IF v_test_group_chapter IS NULL THEN
    RAISE EXCEPTION 'Test group current_chapter_id is NULL after seed — chapter_number = 4 lookup failed';
  END IF;

  IF v_test_group_started IS NULL THEN
    RAISE EXCEPTION 'Test group started_at is NULL after seed — created_at lookup failed';
  END IF;

  -- Watermelon should have schedule_mode = 'recurring'
  SELECT schedule_mode INTO v_watermelon_mode
  FROM groups WHERE id = '00000000-0000-0000-0000-000000000002';

  IF v_watermelon_mode IS NULL OR v_watermelon_mode <> 'recurring' THEN
    RAISE EXCEPTION 'Watermelon schedule_mode is not recurring (got: %)', v_watermelon_mode;
  END IF;
END $$;


COMMIT;

-- ====================================================================
-- Post-migration verification queries (run separately after COMMIT)
-- ====================================================================

-- V1: schema present
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'groups' AND column_name IN
--   ('schedule_mode', 'started_at', 'current_chapter_id', 'current_chapter_started_at')
-- ORDER BY column_name;
-- Expect: 4 rows.

-- SELECT enumlabel FROM pg_enum
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'schedule_mode')
-- ORDER BY enumsortorder;
-- Expect: 3 rows — recurring, bounded, specific.

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'group_chapter_history'
-- ORDER BY ordinal_position;
-- Expect: 6 columns — id, group_id, chapter_id, started_at, ended_at, created_at.

-- V2: seed verification
-- SELECT id, slug, schedule_mode, started_at,
--        current_chapter_id IS NOT NULL AS has_current_chapter,
--        current_chapter_started_at IS NOT NULL AS has_chapter_started_at
-- FROM groups
-- ORDER BY created_at;
-- Expect: test group with all 3 nullables populated; Watermelon with all 3 NULL.
