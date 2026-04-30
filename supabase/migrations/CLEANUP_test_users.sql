-- =====================================================
-- CLEANUP_test_users.sql
-- =====================================================
-- One-off production cleanup (NOT a numbered migration — no schema
-- change, no rollback paired file). Removes the test/demo accounts
-- that accumulated during Brief 1's V4–V6 walks plus a few earlier
-- testing rounds, leaving Marco (host) and John (facilitator) as the
-- only Watermelon members.
--
-- Run each block SEPARATELY in the Supabase SQL editor, confirming
-- output before moving to the next block. Don't paste the whole file
-- in one go.
--
-- ─────────────────────────────────────────────────────────────────
-- WARNING
-- ─────────────────────────────────────────────────────────────────
-- "pulse" is your CURRENTLY LOGGED-IN session (per the screenshot).
-- The EXECUTE block below deletes pulse along with the other test
-- accounts. After running it your browser session will be invalidated
-- and you'll need to re-login as Marco (or John).
--
-- If you'd rather keep pulse for now, edit the WHERE clause in the
-- EXECUTE block to add 'pulse' to the keeper list before running.
--
-- ─────────────────────────────────────────────────────────────────
-- Cascade chain (so you know what's getting nuked when an auth.users
-- row goes away):
-- ─────────────────────────────────────────────────────────────────
--   auth.users (deleted)
--     → profiles.id ON DELETE CASCADE
--         → group_memberships.user_id ON DELETE CASCADE
--         → threads.author_id, replies.author_id, etc. (varies —
--           some CASCADE, some SET NULL; either way the deletion
--           goes through cleanly)
--         → annotations.author_id ON DELETE CASCADE
--         → reading_checkins, weekly_roles, etc.
-- ─────────────────────────────────────────────────────────────────


-- =====================================================
-- BLOCK 1 — PREVIEW
-- =====================================================
-- Lists the rows that BLOCK 2 will delete. Read carefully. Confirm
-- the display_names and emails match what you expect from the live
-- /members page before running BLOCK 2. Expect 5 rows (user_beta,
-- TEST123, test2, test, pulse) given the current state.
--
-- If the row count is unexpected (e.g. 0 rows, or way more than 5),
-- STOP. Don't run BLOCK 2. Investigate first — display_name match is
-- the only filter, so any drift in keeper-spelling will be visible
-- here.

SELECT
  u.id AS auth_user_id,
  u.email,
  p.display_name,
  m.role,
  m.joined_at,
  -- Surface contribution counts so you can see what's getting nuked.
  -- High-count rows would warrant a second look; test users should
  -- have low/zero counts.
  (SELECT count(*) FROM threads      WHERE author_id = u.id) AS threads_count,
  (SELECT count(*) FROM replies      WHERE author_id = u.id) AS replies_count,
  (SELECT count(*) FROM annotations  WHERE author_id = u.id) AS annotations_count
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN group_memberships m ON m.user_id = u.id
JOIN groups g ON g.id = m.group_id
WHERE g.slug = 'watermelon'
  AND p.display_name NOT IN ('Marco', 'John')
ORDER BY m.joined_at ASC;


-- =====================================================
-- BLOCK 2 — EXECUTE
-- =====================================================
-- Only run this AFTER confirming BLOCK 1's output is exactly what you
-- want deleted. Supabase SQL editor will show a "Query has destructive
-- operations" confirmation dialog — click Run, then click "Run this
-- query" in the dialog (per the documented quirk in CLAUDE.md).
--
-- Wrapped in a single statement with a CTE so Postgres does the
-- selection + delete atomically — no chance of half-state if a row
-- changes mid-statement.

WITH targets AS (
  SELECT u.id
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  JOIN group_memberships m ON m.user_id = u.id
  JOIN groups g ON g.id = m.group_id
  WHERE g.slug = 'watermelon'
    AND p.display_name NOT IN ('Marco', 'John')
)
DELETE FROM auth.users
WHERE id IN (SELECT id FROM targets)
RETURNING id, email;


-- =====================================================
-- BLOCK 3 — CONFIRM
-- =====================================================
-- Re-runs the preview query. Expected output: 0 rows.
-- If non-zero, something didn't cascade — investigate.

SELECT
  u.id AS auth_user_id,
  u.email,
  p.display_name
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN group_memberships m ON m.user_id = u.id
JOIN groups g ON g.id = m.group_id
WHERE g.slug = 'watermelon'
  AND p.display_name NOT IN ('Marco', 'John')
ORDER BY m.joined_at ASC;


-- =====================================================
-- BLOCK 4 — POST-CHECK
-- =====================================================
-- Final state check: list ALL Watermelon members. Expected: 2 rows
-- (Marco as host, John as member).

SELECT
  p.display_name,
  m.role,
  m.joined_at
FROM group_memberships m
JOIN profiles p ON p.id = m.user_id
JOIN groups g ON g.id = m.group_id
WHERE g.slug = 'watermelon'
ORDER BY m.joined_at ASC;
