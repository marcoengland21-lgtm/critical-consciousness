-- =====================================================
-- ROLLBACK 005: Reverse L1 multi-tenancy
-- =====================================================
-- Returns the schema to pre-005 state. Test on a Supabase branch
-- before running on main per the deploy runbook:
--
--   1. Create branch
--   2. Run 005_l1_multitenancy.sql on the branch
--   3. Run the verification queries at the bottom of 005 — confirm forward worked
--   4. Run THIS file on the branch
--   5. Run the post-rollback verification at the bottom of THIS file —
--      confirm schema is back to pre-005 baseline
--   6. Drop the branch
--   7. Run 005 against main
--   8. Application code goes live
--
-- Re-runnable: every DROP / DELETE / ALTER uses IF EXISTS / IF NOT
-- EXISTS so this file can be safely re-applied if it half-finishes.
--
-- IMPORTANT: this rollback restores the schema but does NOT restore
-- post-L1 application data. If new data was created post-L1 with
-- group_id values, the data rows survive (we only drop columns,
-- not the rows themselves). Post-rollback the app reads at the
-- single-group public-read level via the recreated USING(true)
-- policies; the columns we drop weren't read by pre-L1 code anyway.

BEGIN;

-- =====================================================
-- 9. Restore confusion RPC signatures
-- =====================================================
DROP FUNCTION IF EXISTS increment_confusion(uuid, integer, uuid);
DROP FUNCTION IF EXISTS decrement_confusion(uuid, integer, uuid);

CREATE OR REPLACE FUNCTION increment_confusion(
  p_chapter_id uuid,
  p_paragraph_index integer
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO confusion_counts (chapter_id, paragraph_index, count)
  VALUES (p_chapter_id, p_paragraph_index, 1)
  ON CONFLICT (chapter_id, paragraph_index)
  DO UPDATE SET count = confusion_counts.count + 1
  RETURNING count;
$$;

CREATE OR REPLACE FUNCTION decrement_confusion(
  p_chapter_id uuid,
  p_paragraph_index integer
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE confusion_counts
  SET count = GREATEST(0, count - 1)
  WHERE chapter_id = p_chapter_id AND paragraph_index = p_paragraph_index
  RETURNING count;
$$;

-- =====================================================
-- 8. Restore pre-L1 RLS policies (USING(true) per migration 003/004)
-- =====================================================
-- Drop L1 policies, recreate the open ones.

-- Generic helper: drop every L1 policy name we created.
DROP POLICY IF EXISTS "threads_select_member" ON threads;
DROP POLICY IF EXISTS "threads_insert_member" ON threads;
DROP POLICY IF EXISTS "threads_update_owner" ON threads;
DROP POLICY IF EXISTS "threads_delete_owner" ON threads;
DROP POLICY IF EXISTS "replies_select_member" ON replies;
DROP POLICY IF EXISTS "replies_insert_member" ON replies;
DROP POLICY IF EXISTS "replies_update_owner" ON replies;
DROP POLICY IF EXISTS "replies_delete_owner" ON replies;
DROP POLICY IF EXISTS "annotations_select_public_in_group" ON annotations;
DROP POLICY IF EXISTS "annotations_select_own_drafts_in_group" ON annotations;
DROP POLICY IF EXISTS "annotations_insert_member" ON annotations;
DROP POLICY IF EXISTS "annotations_update_owner" ON annotations;
DROP POLICY IF EXISTS "annotations_delete_owner" ON annotations;
DROP POLICY IF EXISTS "annotation_replies_select_member" ON annotation_replies;
DROP POLICY IF EXISTS "annotation_replies_insert_member" ON annotation_replies;
DROP POLICY IF EXISTS "annotation_replies_update_owner" ON annotation_replies;
DROP POLICY IF EXISTS "annotation_replies_delete_owner" ON annotation_replies;
DROP POLICY IF EXISTS "glossary_entries_select_member" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_entries_insert_member" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_entries_update_member" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_entries_delete_creator" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_versions_select_member" ON glossary_versions;
DROP POLICY IF EXISTS "glossary_versions_insert_member" ON glossary_versions;
DROP POLICY IF EXISTS "glossary_comments_select_member" ON glossary_comments;
DROP POLICY IF EXISTS "glossary_comments_insert_member" ON glossary_comments;
DROP POLICY IF EXISTS "glossary_comments_delete_author" ON glossary_comments;
DROP POLICY IF EXISTS "concept_edges_select_member" ON concept_edges;
DROP POLICY IF EXISTS "concept_edges_insert_member" ON concept_edges;
DROP POLICY IF EXISTS "concept_edges_delete_creator" ON concept_edges;
DROP POLICY IF EXISTS "resources_select_member" ON resources;
DROP POLICY IF EXISTS "resources_insert_member" ON resources;
DROP POLICY IF EXISTS "resources_update_creator" ON resources;
DROP POLICY IF EXISTS "resources_delete_creator" ON resources;
DROP POLICY IF EXISTS "reading_schedule_select_member" ON reading_schedule;
DROP POLICY IF EXISTS "reading_schedule_insert_host" ON reading_schedule;
DROP POLICY IF EXISTS "reading_schedule_update_host" ON reading_schedule;
DROP POLICY IF EXISTS "reading_schedule_delete_host" ON reading_schedule;
DROP POLICY IF EXISTS "weekly_roles_select_member" ON weekly_roles;
DROP POLICY IF EXISTS "weekly_roles_insert_host" ON weekly_roles;
DROP POLICY IF EXISTS "weekly_roles_delete_host" ON weekly_roles;
DROP POLICY IF EXISTS "discussion_prompts_select_member" ON discussion_prompts;
DROP POLICY IF EXISTS "discussion_prompts_insert_host" ON discussion_prompts;
DROP POLICY IF EXISTS "reading_checkins_select_own" ON reading_checkins;
DROP POLICY IF EXISTS "reading_checkins_insert_own" ON reading_checkins;
DROP POLICY IF EXISTS "reading_checkins_update_own" ON reading_checkins;
DROP POLICY IF EXISTS "session_notes_select_member" ON session_notes;
DROP POLICY IF EXISTS "session_notes_insert_member" ON session_notes;
DROP POLICY IF EXISTS "session_notes_update_member" ON session_notes;
DROP POLICY IF EXISTS "confusion_counts_select_member" ON confusion_counts;
-- confusion_flags: legacy table that may not exist in this database
-- (replaced by confusion_counts). Conditional to handle either state.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'confusion_flags'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "confusion_flags_select_member" ON confusion_flags';
    EXECUTE 'DROP POLICY IF EXISTS "confusion_flags_insert_member" ON confusion_flags';
    EXECUTE 'DROP POLICY IF EXISTS "confusion_flags_delete_own" ON confusion_flags';
  END IF;
END $$;
DROP POLICY IF EXISTS "thread_branches_select_member" ON thread_branches;
DROP POLICY IF EXISTS "thread_branches_insert_member" ON thread_branches;
DROP POLICY IF EXISTS "invite_codes_select_host" ON invite_codes;
DROP POLICY IF EXISTS "group_memberships_select_member" ON group_memberships;
DROP POLICY IF EXISTS "group_memberships_insert_self_or_host" ON group_memberships;

-- Recreate the pre-L1 open SELECT policies (per 003/004).
CREATE POLICY "threads_select" ON threads FOR SELECT USING (true);
CREATE POLICY "replies_select" ON replies FOR SELECT USING (true);
CREATE POLICY "annotations_select" ON annotations FOR SELECT USING (true);
CREATE POLICY "annotation_replies_select" ON annotation_replies FOR SELECT USING (true);
CREATE POLICY "glossary_entries_select" ON glossary_entries FOR SELECT USING (true);
CREATE POLICY "resources_select" ON resources FOR SELECT USING (true);
CREATE POLICY "reading_schedule_select" ON reading_schedule FOR SELECT USING (true);
CREATE POLICY "weekly_roles_select" ON weekly_roles FOR SELECT USING (true);
CREATE POLICY "discussion_prompts_select" ON discussion_prompts FOR SELECT USING (true);
CREATE POLICY "glossary_versions_select" ON glossary_versions FOR SELECT USING (true);
CREATE POLICY "session_notes_select" ON session_notes FOR SELECT USING (true);
CREATE POLICY "reading_checkins_select" ON reading_checkins FOR SELECT USING (true);
CREATE POLICY "Anyone can read confusion counts" ON confusion_counts FOR SELECT USING (true);
-- Same conditional shape for the legacy confusion_flags policies.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'confusion_flags'
  ) THEN
    EXECUTE 'CREATE POLICY "confusion_flags_select" ON confusion_flags FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "confusion_flags_insert" ON confusion_flags FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "confusion_flags_delete" ON confusion_flags FOR DELETE USING (true)';
  END IF;
END $$;
CREATE POLICY "reading_checkins_insert" ON reading_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY "reading_checkins_update" ON reading_checkins FOR UPDATE USING (true);
CREATE POLICY "session_notes_insert" ON session_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "session_notes_update" ON session_notes FOR UPDATE USING (true);
CREATE POLICY "glossary_versions_insert" ON glossary_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "group_members_select" ON group_memberships FOR SELECT USING (true);
CREATE POLICY "group_members_insert" ON group_memberships FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. Drop indexes added by L1
-- =====================================================
DROP INDEX IF EXISTS idx_group_memberships_group_id;
DROP INDEX IF EXISTS idx_group_memberships_user_id;
DROP INDEX IF EXISTS idx_group_memberships_user_group;
DROP INDEX IF EXISTS idx_thread_branches_group_id;
DROP INDEX IF EXISTS idx_glossary_versions_group_id;
DROP INDEX IF EXISTS idx_glossary_comments_group_id;
DROP INDEX IF EXISTS idx_concept_edges_group_id;
DROP INDEX IF EXISTS idx_confusion_counts_group_id;
DROP INDEX IF EXISTS idx_invite_codes_group_id;
DROP INDEX IF EXISTS idx_profiles_current_group_id;

-- Recreate the pre-L1 indexes from migration 001 (using old name).
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_memberships(user_id);

-- =====================================================
-- 6. Remove Watermelon group + memberships
-- =====================================================
-- Remove Mars's Watermelon-host membership (cascade safe).
DELETE FROM group_memberships
WHERE group_id = '00000000-0000-0000-0000-000000000002';

-- Drop Watermelon row. Rolls back the seed.
DELETE FROM groups WHERE id = '00000000-0000-0000-0000-000000000002';

-- Reset profiles.current_group_id to NULL (we drop the column below;
-- this is just hygiene if the column survives a partial rollback).
UPDATE profiles SET current_group_id = NULL;

-- =====================================================
-- 5. Drop trigger functions + triggers
-- =====================================================
DROP TRIGGER IF EXISTS replies_group_id_matches ON replies;
DROP TRIGGER IF EXISTS annotation_replies_group_id_matches ON annotation_replies;
DROP TRIGGER IF EXISTS thread_branches_group_id_matches ON thread_branches;
DROP TRIGGER IF EXISTS glossary_versions_group_id_matches ON glossary_versions;
DROP TRIGGER IF EXISTS glossary_comments_group_id_matches ON glossary_comments;
DROP TRIGGER IF EXISTS concept_edges_group_id_matches ON concept_edges;

DROP FUNCTION IF EXISTS enforce_replies_group_id_matches_thread();
DROP FUNCTION IF EXISTS enforce_annotation_replies_group_id_matches_annotation();
DROP FUNCTION IF EXISTS enforce_thread_branches_group_id_matches_parent();
DROP FUNCTION IF EXISTS enforce_glossary_versions_group_id_matches_entry();
DROP FUNCTION IF EXISTS enforce_glossary_comments_group_id_matches_entry();
DROP FUNCTION IF EXISTS enforce_concept_edges_group_id_matches_terms();

-- =====================================================
-- 4. Drop new columns
-- =====================================================
ALTER TABLE profiles DROP COLUMN IF EXISTS current_group_id;
ALTER TABLE confusion_counts DROP COLUMN IF EXISTS group_id;
ALTER TABLE invite_codes DROP COLUMN IF EXISTS group_id;
ALTER TABLE thread_branches DROP COLUMN IF EXISTS group_id;
ALTER TABLE glossary_versions DROP COLUMN IF EXISTS group_id;
ALTER TABLE glossary_comments DROP COLUMN IF EXISTS group_id;
ALTER TABLE concept_edges DROP COLUMN IF EXISTS group_id;

-- =====================================================
-- 3. Drop is_group_member helper
-- =====================================================
DROP FUNCTION IF EXISTS is_group_member(uuid);

-- =====================================================
-- 2. Reverse rename + role column type swap
-- =====================================================
-- Reverse the role-column migration: add user_role column → populate
-- from current group_role with reverse mapping → drop group_role
-- column → rename. Then rename the table back.

ALTER TABLE group_memberships ADD COLUMN IF NOT EXISTS role_old user_role;
UPDATE group_memberships
SET role_old = CASE
  WHEN role::text = 'host' THEN 'admin'::user_role
  WHEN role::text = 'member' THEN 'member'::user_role
  ELSE 'member'::user_role
END
WHERE role_old IS NULL;
ALTER TABLE group_memberships DROP COLUMN IF EXISTS role;
ALTER TABLE group_memberships RENAME COLUMN role_old TO role;
ALTER TABLE group_memberships ALTER COLUMN role SET NOT NULL;
ALTER TABLE group_memberships ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE IF EXISTS group_memberships RENAME TO group_members;

-- =====================================================
-- 1. Drop group_role enum
-- =====================================================
DROP TYPE IF EXISTS group_role;

COMMIT;

-- =====================================================
-- Post-rollback verification queries
-- =====================================================
--
-- 1. group_role enum gone:
--    SELECT typname FROM pg_type WHERE typname = 'group_role';
--    Expect: 0 rows.
--
-- 2. group_members table back, group_memberships gone:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_name IN ('group_members', 'group_memberships');
--    Expect: group_members only.
--
-- 3. is_group_member function gone:
--    SELECT proname FROM pg_proc WHERE proname = 'is_group_member';
--    Expect: 0 rows.
--
-- 4. Columns dropped:
--    SELECT table_name, column_name FROM information_schema.columns
--    WHERE column_name = 'group_id'
--      AND table_name IN ('confusion_counts', 'invite_codes', 'thread_branches',
--                         'glossary_versions', 'glossary_comments', 'concept_edges');
--    Expect: 0 rows.
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'profiles' AND column_name = 'current_group_id';
--    Expect: 0 rows.
--
-- 5. Watermelon gone:
--    SELECT slug FROM groups WHERE slug = 'watermelon';
--    Expect: 0 rows.
--    SELECT slug FROM groups WHERE slug = 'christchurch-capital';
--    Expect: 1 row (existing test group preserved).
--
-- 6. Confusion RPC back to (uuid, integer):
--    SELECT proname, pg_get_function_arguments(oid) FROM pg_proc
--    WHERE proname IN ('increment_confusion', 'decrement_confusion');
--    Expect: each takes (p_chapter_id uuid, p_paragraph_index integer).
--
-- 7. RLS policies are open again (USING(true) selects):
--    SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE tablename IN ('threads', 'annotations', 'glossary_entries')
--      AND cmd = 'SELECT';
--    Expect: each table has a SELECT policy whose qual is 'true'.
