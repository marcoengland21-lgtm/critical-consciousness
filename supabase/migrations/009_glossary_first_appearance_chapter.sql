-- 009_glossary_first_appearance_chapter.sql
--
-- Add first_appearance_chapter to glossary_entries for recurring-mode
-- chapter-aware glossary surfaces.
--
-- Recurring v1: glossary entries newly created get first_appearance_
-- chapter populated from current_chapter_id at creation time (via
-- app-layer write). Existing entries keep first_appearance_week
-- (legacy / future bounded mode) and first_appearance_chapter stays
-- NULL. Both columns coexist.
--
-- ── Why no backfill ──────────────────────────────────────────────
-- Two converging reasons:
--   1. text_chapters.week_id is NULL for every chapter row platform-
--      wide (same finding as 008's audit). CLAUDE.md "Fixed bugs"
--      list documents the resulting null-vs-null match in the
--      /reading TOC. Even if some glossary entries have
--      first_appearance_week set, the JOIN to text_chapters via
--      week_id can't populate anything — the join target is empty.
--   2. Pre-009 audit (28 April 2026) on the live DB returned "0
--      rows" — meaning either no glossary_entries with group_id
--      exist OR no entries at all. (Production seems to have never
--      run the glossary seed; only the dev seed file exists.)
-- Combined: nothing to backfill regardless. No UPDATE clause. The
-- column lands NULL for any future-existing legacy entries,
-- populated for new ones via app-layer write going forward.
--
-- Same forward note about future bounded / specific schedule modes
-- as 008: text_chapters.week_id being NULL platform-wide means
-- bounded/specific will need to either populate that column when
-- they ship OR redesign around not needing it.
--
-- ── RLS ──────────────────────────────────────────────────────────
-- glossary_entries already has wiki-style RLS (any authenticated
-- group member can SELECT and UPDATE any row in their group). New
-- column is just metadata on rows already covered. No policy
-- changes needed.

ALTER TABLE glossary_entries ADD COLUMN first_appearance_chapter UUID
  REFERENCES text_chapters(id) ON DELETE SET NULL;

-- Partial index. Same shape as 008's threads_chapter_id_idx —
-- sparsely populated column, partial index keeps it small while
-- preserving selectivity for chapter-filter queries on the glossary.
CREATE INDEX glossary_first_appearance_chapter_idx
  ON glossary_entries(first_appearance_chapter)
  WHERE first_appearance_chapter IS NOT NULL;
