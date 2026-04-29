-- 008_threads_chapter_id.sql
--
-- Add chapter_id to threads for recurring-mode anchoring.
--
-- Recurring v1: new threads get chapter_id = current_chapter_id at
-- creation time (via app-layer write in /threads/new). Existing
-- threads keep week_id (legacy / future bounded mode) and chapter_id
-- stays NULL. Both columns coexist.
--
-- ── Why no backfill ──────────────────────────────────────────────
-- Per item 9 audit (28 April 2026), the data doesn't support a
-- backfill via week_id join:
--   1. Zero threads platform-wide have week_id set:
--      - Watermelon has 0 threads (V5 record)
--      - christchurch-capital test group has 0 threads with week_id
--        set (item 9 query Part B returned 0 rows)
--   2. text_chapters.week_id is NULL for every chapter row — the
--      column was never populated platform-wide. CLAUDE.md "Fixed
--      bugs" list documents the resulting null-vs-null match in the
--      /reading TOC ("This Week" badge fired on every chapter,
--      fixed by guarding on currentWeekId !== null).
-- Combined: a backfill via JOIN through week_id would touch zero
-- rows even if it succeeded. No UPDATE clause.
--
-- ── Note for future bounded / specific schedule modes ────────────
-- text_chapters.week_id being NULL platform-wide also affects
-- bounded and specific modes when they ship. Those modes will need
-- to either populate text_chapters.week_id themselves (one-off
-- migration when the bounded UI lands) OR redesign around not
-- needing the column at all (e.g., reading_schedule rows reference
-- text_chapters via a separate join table). Heads-up for future-
-- Cowork — this is the kind of dead column that quietly bites
-- when assumptions about "the schema does X" don't survive
-- contact with the actual data.
--
-- ── RLS ──────────────────────────────────────────────────────────
-- threads has existing host/member policies covering reads + writes.
-- The new column doesn't need its own policy — RLS operates at the
-- row level, and chapter_id is just metadata on a row already
-- covered by the host/member group-membership check.

ALTER TABLE threads ADD COLUMN chapter_id UUID
  REFERENCES text_chapters(id) ON DELETE SET NULL;

-- Partial index. The column will be sparsely populated (existing
-- rows NULL, only new-thread writes populate going forward), so a
-- partial index is much smaller than a full index without losing
-- selectivity for the queries that filter by chapter_id.
CREATE INDEX threads_chapter_id_idx ON threads(chapter_id)
  WHERE chapter_id IS NOT NULL;
