-- ====================================================================
-- 007 — RPCs for recurring-mode schedule actions
-- ====================================================================
-- Two host-only RPCs that mutate group schedule state atomically.
--
-- 1. advance_chapter(p_group_id, p_new_chapter_id)
--    Atomically: write previous chapter's stay to history (if any),
--    update groups.current_chapter_id and current_chapter_started_at.
--    Handles all transition types per the spec:
--      - Initial set (current was NULL): no history row, just sets new
--      - Advance forward (Ch 1 → Ch 2): Ch 1 gets ended, Ch 2 starts
--      - Skip (Ch 1 → Ch 3): Ch 1 ends, Ch 3 starts; Ch 2 never appears
--      - Go back (Ch 2 → Ch 1): Ch 2 ends, Ch 1 starts (new
--        current_chapter_started_at). If group later goes Ch 1 → Ch 2
--        again, Ch 1's second stay also gets a new history row.
--    Append-only history: repeat stays produce repeat rows. UI handles
--    rendering.
--
-- 2. set_group_started_at(p_group_id, p_started_at)
--    Sets the group's reading-journey start date. One-off when group
--    begins; rare edit. Doesn't write history (no concept of "started
--    multiple times").
--
-- Both are SECURITY DEFINER with inline host-membership checks. Pattern
-- matches L1's increment_confusion / decrement_confusion: caller's
-- auth.uid() drives the authorization check; the function privilege
-- bypasses RLS on groups (which has no UPDATE policy by design — the
-- only path to mutate group schedule state is through these RPCs).
--
-- Wrapped in BEGIN/COMMIT for atomic apply/rollback.
-- ====================================================================

BEGIN;


-- =====================================================
-- 1. advance_chapter
-- =====================================================
-- Drop signature first (matches the L1 pattern for RPC drops — atomic
-- deploy semantics, no overload coexistence).
DROP FUNCTION IF EXISTS advance_chapter(UUID, UUID);

CREATE FUNCTION advance_chapter(
  p_group_id UUID,
  p_new_chapter_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_chapter_id UUID;
  v_old_started_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Authorization: caller must be host of the group.
  -- Uses auth.uid() (the JWT sub claim, set by Supabase Auth) so the
  -- check runs against the actual caller, not the function owner.
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE user_id = auth.uid()
      AND group_id = p_group_id
      AND role = 'host'
  ) THEN
    RAISE EXCEPTION 'advance_chapter: only hosts can advance chapters'
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;

  -- Defensive: verify the new chapter exists. The FK on groups would
  -- catch this too, but a clearer error message helps debugging.
  IF NOT EXISTS (SELECT 1 FROM text_chapters WHERE id = p_new_chapter_id) THEN
    RAISE EXCEPTION 'advance_chapter: chapter % does not exist', p_new_chapter_id
      USING ERRCODE = '23503';  -- foreign_key_violation
  END IF;

  -- Read current state into local vars.
  SELECT current_chapter_id, current_chapter_started_at
  INTO v_old_chapter_id, v_old_started_at
  FROM groups
  WHERE id = p_group_id;

  -- If there was a previous chapter (i.e., this is a transition, not
  -- the first-ever set), write a history row recording the stay end.
  -- NULL guards: when current_chapter_id is NULL (fresh group), this
  -- is the initial set — no stay to end, no history row.
  IF v_old_chapter_id IS NOT NULL AND v_old_started_at IS NOT NULL THEN
    INSERT INTO group_chapter_history (group_id, chapter_id, started_at, ended_at)
    VALUES (p_group_id, v_old_chapter_id, v_old_started_at, NOW());
  END IF;

  -- Update group state to the new chapter.
  UPDATE groups
  SET current_chapter_id = p_new_chapter_id,
      current_chapter_started_at = NOW()
  WHERE id = p_group_id;
END;
$$;

-- Allow authenticated users to call the function. RLS-equivalent
-- enforcement is the inline host check; non-hosts get RAISE EXCEPTION.
GRANT EXECUTE ON FUNCTION advance_chapter(UUID, UUID) TO authenticated;


-- =====================================================
-- 2. set_group_started_at
-- =====================================================
DROP FUNCTION IF EXISTS set_group_started_at(UUID, DATE);

CREATE FUNCTION set_group_started_at(
  p_group_id UUID,
  p_started_at DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE user_id = auth.uid()
      AND group_id = p_group_id
      AND role = 'host'
  ) THEN
    RAISE EXCEPTION 'set_group_started_at: only hosts can set group start date'
      USING ERRCODE = '42501';
  END IF;

  UPDATE groups
  SET started_at = p_started_at
  WHERE id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_group_started_at(UUID, DATE) TO authenticated;


COMMIT;

-- ====================================================================
-- Post-migration verification (run separately after COMMIT)
-- ====================================================================

-- V3 — RPC signatures exist
-- SELECT proname, pg_get_function_arguments(oid)
-- FROM pg_proc WHERE proname IN ('advance_chapter', 'set_group_started_at')
-- ORDER BY proname;
-- Expect: 2 rows.
--   advance_chapter        | p_group_id uuid, p_new_chapter_id uuid
--   set_group_started_at   | p_group_id uuid, p_started_at date

-- V3 — RPCs are SECURITY DEFINER
-- SELECT proname, prosecdef FROM pg_proc
-- WHERE proname IN ('advance_chapter', 'set_group_started_at');
-- Expect: 2 rows, both prosecdef = true.
