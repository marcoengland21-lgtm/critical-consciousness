-- V2 — Seed verification
-- Run after re-applying 006_schedule_modes.sql.

-- 2a. Test group seed populated
SELECT
  g.id,
  g.slug,
  g.schedule_mode,
  g.started_at,
  g.current_chapter_id IS NOT NULL AS has_current_chapter,
  g.current_chapter_started_at IS NOT NULL AS has_chapter_started_at,
  tc.chapter_number AS current_chapter_number
FROM groups g
LEFT JOIN text_chapters tc ON tc.id = g.current_chapter_id
WHERE g.id = '00000000-0000-0000-0000-000000000001';
-- Expect 1 row.
-- schedule_mode = recurring
-- started_at = 2026-03-13
-- has_current_chapter = t
-- has_chapter_started_at = t
-- current_chapter_number = 4 (Section 4 of Chapter 1)


-- 2b. Watermelon defaults
SELECT
  id,
  slug,
  schedule_mode,
  started_at,
  current_chapter_id,
  current_chapter_started_at
FROM groups
WHERE id = '00000000-0000-0000-0000-000000000002';
-- Expect 1 row.
-- schedule_mode = recurring
-- started_at = NULL (Mars seeds later)
-- current_chapter_id = NULL
-- current_chapter_started_at = NULL


-- 2c. group_chapter_history is empty (no advances yet)
SELECT count(*) FROM group_chapter_history;
-- Expect 0.


-- 2d. All groups have a schedule_mode (default applied)
SELECT id, slug, schedule_mode FROM groups ORDER BY created_at;
-- Expect 2 rows; both with schedule_mode = recurring.
