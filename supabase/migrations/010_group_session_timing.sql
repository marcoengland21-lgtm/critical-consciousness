-- 010_group_session_timing.sql
--
-- TRANSITIONAL session-timing fields on groups, plus a host-only RPC
-- to set them. Stopgap until the dedicated `sessions` table piece
-- lands. When sessions ships:
--   - `next_session_at` is computed from the next future row in
--     `sessions` rather than read from `groups`
--   - `session_recurrence` becomes a property of the session series
--     (per recurrence config on the series row)
--   - both columns and the `set_group_session_timing` RPC are dropped
--     in the migration that lands sessions
--
-- Recurrence semantics: free text. Display-only in the orientation
-- line ("Next session [day] [time]" formatted from next_session_at;
-- recurrence is informational, not used for forward computation).
-- Free text accommodates "fortnightly Tuesday evenings" or other
-- group-specific phrasing without an enum constraint that won't
-- carry forward to the sessions piece.

-- ── Schema additions ──────────────────────────────────────────────
ALTER TABLE groups ADD COLUMN next_session_at TIMESTAMPTZ;
ALTER TABLE groups ADD COLUMN session_recurrence TEXT;

-- ── Host-only RPC: set both fields atomically ─────────────────────
-- Same shape as set_group_started_at and advance_chapter.
-- SECURITY DEFINER bypasses RLS on group_memberships for the host
-- check; outside that check the function only writes to groups,
-- which has its own host-or-member RLS for direct UPDATEs.
CREATE OR REPLACE FUNCTION set_group_session_timing(
  p_group_id UUID,
  p_next_session_at TIMESTAMPTZ,
  p_recurrence TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'host'
  ) THEN
    RAISE EXCEPTION 'permission denied: not a host of group %', p_group_id;
  END IF;

  UPDATE groups
  SET next_session_at = p_next_session_at,
      session_recurrence = p_recurrence
  WHERE id = p_group_id;
END;
$$;
