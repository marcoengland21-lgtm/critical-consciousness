-- ============================================================================
-- Resources: add use_category column — IMPROVEMENTS_PLAN.md §7.1
--
-- Lets the Resources page group by PURPOSE rather than file type. Replaces
-- the current "Primary Texts / Companion / Lectures / Articles / Tools / Other"
-- grouping (which uses resource_type) with a use-driven grouping:
--
--   start_here       — best entry-point resources for a newcomer
--   for_going_deeper — more rigorous companions
--   when_stuck       — chapter-keyed companion guides
--   for_today        — contemporary applications, current-events lenses
--   tools_references — search engines, archives, the primary text
--
-- Column is nullable. When NULL, the UI falls back to type-based grouping
-- so existing rows aren't broken. resource_type is kept as a secondary tag.
--
-- Run ONCE in Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================================

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS use_category text;

-- Constrain to the known set of values (allow NULL).
-- Drop+recreate so re-running this migration doesn't fail on a duplicate.
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_use_category_check;
ALTER TABLE resources
  ADD CONSTRAINT resources_use_category_check
  CHECK (use_category IS NULL OR use_category IN (
    'start_here',
    'for_going_deeper',
    'when_stuck',
    'for_today',
    'tools_references'
  ));

CREATE INDEX IF NOT EXISTS resources_use_category_idx
  ON resources(use_category) WHERE use_category IS NOT NULL;
