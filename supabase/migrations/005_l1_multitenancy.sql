-- =====================================================
-- MIGRATION 005: L1 multi-tenancy
-- =====================================================
-- Closes the schema-vs-application gap from migration 001's "multi-
-- tenant by design" framing. Adds membership-based RLS that the
-- application can't bypass, plus the missing pieces (confusion_counts
-- group_id, invite_codes group_id, profiles.current_group_id, the
-- group_memberships rename + role enum split).
--
-- After this migration, unauthenticated and non-member users cannot
-- read group-scoped data. This intentionally retires the public-read
-- policies that 003 / 004 added for guest/reviewer access — that
-- pattern is incompatible with the membership boundary L1 enforces.
-- Platform content (text_documents, text_chapters, text_footnotes,
-- profiles) stays public-readable since it isn't group-scoped.
--
-- Sections:
--   1. group_role enum
--   2. group_members → group_memberships (rename + role column type swap)
--   3. is_group_member() helper function (SECURITY DEFINER STABLE)
--   4. New columns + backfills (confusion_counts, invite_codes,
--      profiles, thread_branches, glossary_versions, glossary_comments,
--      concept_edges)
--   5. Trigger functions enforcing child.group_id = parent.group_id
--   6. Watermelon group seed + host memberships for the admin user
--   7. Indexes (rename old, add new)
--   8. RLS — replace USING(true) on group-scoped tables with
--      is_group_member(group_id)
--   9. RPC signature change: increment_confusion / decrement_confusion
--      now take p_group_id
--
-- Run via Supabase SQL editor on a branch first per the deploy
-- runbook (forward → verify → rollback → verify → forward on main).

BEGIN;

-- =====================================================
-- 1. group_role enum
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_role') THEN
    CREATE TYPE group_role AS ENUM ('host', 'member');
  END IF;
END $$;

-- =====================================================
-- 2. Rename group_members → group_memberships
--    + role column type swap (user_role → group_role)
-- =====================================================
ALTER TABLE IF EXISTS group_members RENAME TO group_memberships;

-- Drop the old indexes by their old name (we recreate with new names below).
DROP INDEX IF EXISTS idx_group_members_group_id;
DROP INDEX IF EXISTS idx_group_members_user_id;

-- Drop old RLS policies tied to old table name (recreated by section 8).
DROP POLICY IF EXISTS "group_members_select" ON group_memberships;
DROP POLICY IF EXISTS "group_members_insert" ON group_memberships;

-- PostgreSQL doesn't allow direct ALTER COLUMN TYPE between enums,
-- so the role column migration is: add new column → populate from
-- old column with explicit mapping → drop old column → rename new
-- column. Idempotent via IF EXISTS / IF NOT EXISTS.
ALTER TABLE group_memberships
  ADD COLUMN IF NOT EXISTS role_new group_role;

-- Populate the new column from the old. Existing user_role enum
-- values: 'admin' → 'host'; 'member' → 'member'. Default for any
-- NULL is 'member'.
UPDATE group_memberships
SET role_new = CASE
  WHEN role::text = 'admin' THEN 'host'::group_role
  WHEN role::text = 'member' THEN 'member'::group_role
  ELSE 'member'::group_role
END
WHERE role_new IS NULL;

-- Drop old column, rename new to take its place.
ALTER TABLE group_memberships DROP COLUMN IF EXISTS role;
ALTER TABLE group_memberships RENAME COLUMN role_new TO role;
ALTER TABLE group_memberships ALTER COLUMN role SET NOT NULL;
ALTER TABLE group_memberships ALTER COLUMN role SET DEFAULT 'member';

-- =====================================================
-- 3. is_group_member() — RLS helper
-- =====================================================
-- SECURITY DEFINER bypasses RLS on group_memberships when the
-- function runs (avoids recursive-policy errors). STABLE allows
-- query-plan caching across calls within a query.
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_memberships
    WHERE user_id = auth.uid()
      AND group_id = p_group_id
  );
$$;

-- =====================================================
-- 4. New columns + backfills
-- =====================================================

-- profiles.current_group_id — resolver's source of truth.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS current_group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- confusion_counts.group_id — was missing from 001. Backfill to test group.
ALTER TABLE confusion_counts
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE confusion_counts SET group_id = '00000000-0000-0000-0000-000000000001'
  WHERE group_id IS NULL;
ALTER TABLE confusion_counts ALTER COLUMN group_id SET NOT NULL;

-- invite_codes.group_id — was missing from 001. Backfill to test group.
ALTER TABLE invite_codes
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE invite_codes SET group_id = '00000000-0000-0000-0000-000000000001'
  WHERE group_id IS NULL;

-- Inherited tables — denormalized group_id columns for uniform RLS.
-- All backfill to test group (existing data was created under that
-- group). Trigger functions in section 5 keep these in sync going
-- forward.

-- thread_branches: inherits from parent_thread.
ALTER TABLE thread_branches
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE thread_branches tb SET group_id = t.group_id
  FROM threads t WHERE tb.parent_thread_id = t.id AND tb.group_id IS NULL;
ALTER TABLE thread_branches ALTER COLUMN group_id SET NOT NULL;

-- glossary_versions: inherits from glossary_entries.entry_id.
ALTER TABLE glossary_versions
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE glossary_versions gv SET group_id = ge.group_id
  FROM glossary_entries ge WHERE gv.entry_id = ge.id AND gv.group_id IS NULL;
ALTER TABLE glossary_versions ALTER COLUMN group_id SET NOT NULL;

-- glossary_comments: inherits from glossary_entries.entry_id.
ALTER TABLE glossary_comments
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE glossary_comments gc SET group_id = ge.group_id
  FROM glossary_entries ge WHERE gc.entry_id = ge.id AND gc.group_id IS NULL;
ALTER TABLE glossary_comments ALTER COLUMN group_id SET NOT NULL;

-- concept_edges: inherits from glossary_entries via from_term_id (and
-- must match to_term_id). Backfill picks up from from_term_id.
ALTER TABLE concept_edges
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE concept_edges ce SET group_id = ge.group_id
  FROM glossary_entries ge WHERE ce.from_term_id = ge.id AND ce.group_id IS NULL;
ALTER TABLE concept_edges ALTER COLUMN group_id SET NOT NULL;

-- =====================================================
-- 5. Trigger functions: enforce child.group_id = parent.group_id
-- =====================================================
-- Pure CHECK constraints can't reference other tables. BEFORE INSERT/UPDATE
-- triggers that lookup the parent's group_id and reject mismatches give
-- the same schema-layer guarantee. Each table gets its own function so
-- the parent-table reference is explicit at definition time.

-- replies → threads
CREATE OR REPLACE FUNCTION enforce_replies_group_id_matches_thread()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE parent_gid UUID;
BEGIN
  SELECT group_id INTO parent_gid FROM threads WHERE id = NEW.thread_id;
  IF parent_gid IS NULL THEN
    RAISE EXCEPTION 'replies.thread_id % does not exist or has no group_id', NEW.thread_id;
  END IF;
  IF NEW.group_id IS NULL THEN
    NEW.group_id := parent_gid;
  ELSIF NEW.group_id <> parent_gid THEN
    RAISE EXCEPTION 'replies.group_id (%) must match parent thread.group_id (%)', NEW.group_id, parent_gid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS replies_group_id_matches ON replies;
CREATE TRIGGER replies_group_id_matches
  BEFORE INSERT OR UPDATE ON replies
  FOR EACH ROW EXECUTE FUNCTION enforce_replies_group_id_matches_thread();

-- annotation_replies → annotations
CREATE OR REPLACE FUNCTION enforce_annotation_replies_group_id_matches_annotation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE parent_gid UUID;
BEGIN
  SELECT group_id INTO parent_gid FROM annotations WHERE id = NEW.annotation_id;
  IF parent_gid IS NULL THEN
    RAISE EXCEPTION 'annotation_replies.annotation_id % does not exist or has no group_id', NEW.annotation_id;
  END IF;
  IF NEW.group_id IS NULL THEN
    NEW.group_id := parent_gid;
  ELSIF NEW.group_id <> parent_gid THEN
    RAISE EXCEPTION 'annotation_replies.group_id (%) must match parent annotation.group_id (%)', NEW.group_id, parent_gid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS annotation_replies_group_id_matches ON annotation_replies;
CREATE TRIGGER annotation_replies_group_id_matches
  BEFORE INSERT OR UPDATE ON annotation_replies
  FOR EACH ROW EXECUTE FUNCTION enforce_annotation_replies_group_id_matches_annotation();

-- thread_branches → parent_thread
CREATE OR REPLACE FUNCTION enforce_thread_branches_group_id_matches_parent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE parent_gid UUID;
BEGIN
  SELECT group_id INTO parent_gid FROM threads WHERE id = NEW.parent_thread_id;
  IF parent_gid IS NULL THEN
    RAISE EXCEPTION 'thread_branches.parent_thread_id % does not exist', NEW.parent_thread_id;
  END IF;
  IF NEW.group_id IS NULL THEN
    NEW.group_id := parent_gid;
  ELSIF NEW.group_id <> parent_gid THEN
    RAISE EXCEPTION 'thread_branches.group_id (%) must match parent thread.group_id (%)', NEW.group_id, parent_gid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS thread_branches_group_id_matches ON thread_branches;
CREATE TRIGGER thread_branches_group_id_matches
  BEFORE INSERT OR UPDATE ON thread_branches
  FOR EACH ROW EXECUTE FUNCTION enforce_thread_branches_group_id_matches_parent();

-- glossary_versions → glossary_entries
CREATE OR REPLACE FUNCTION enforce_glossary_versions_group_id_matches_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE parent_gid UUID;
BEGIN
  SELECT group_id INTO parent_gid FROM glossary_entries WHERE id = NEW.entry_id;
  IF parent_gid IS NULL THEN
    RAISE EXCEPTION 'glossary_versions.entry_id % does not exist', NEW.entry_id;
  END IF;
  IF NEW.group_id IS NULL THEN
    NEW.group_id := parent_gid;
  ELSIF NEW.group_id <> parent_gid THEN
    RAISE EXCEPTION 'glossary_versions.group_id (%) must match parent glossary_entry.group_id (%)', NEW.group_id, parent_gid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS glossary_versions_group_id_matches ON glossary_versions;
CREATE TRIGGER glossary_versions_group_id_matches
  BEFORE INSERT OR UPDATE ON glossary_versions
  FOR EACH ROW EXECUTE FUNCTION enforce_glossary_versions_group_id_matches_entry();

-- glossary_comments → glossary_entries
CREATE OR REPLACE FUNCTION enforce_glossary_comments_group_id_matches_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE parent_gid UUID;
BEGIN
  SELECT group_id INTO parent_gid FROM glossary_entries WHERE id = NEW.entry_id;
  IF parent_gid IS NULL THEN
    RAISE EXCEPTION 'glossary_comments.entry_id % does not exist', NEW.entry_id;
  END IF;
  IF NEW.group_id IS NULL THEN
    NEW.group_id := parent_gid;
  ELSIF NEW.group_id <> parent_gid THEN
    RAISE EXCEPTION 'glossary_comments.group_id (%) must match parent glossary_entry.group_id (%)', NEW.group_id, parent_gid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS glossary_comments_group_id_matches ON glossary_comments;
CREATE TRIGGER glossary_comments_group_id_matches
  BEFORE INSERT OR UPDATE ON glossary_comments
  FOR EACH ROW EXECUTE FUNCTION enforce_glossary_comments_group_id_matches_entry();

-- concept_edges → BOTH from_term_id AND to_term_id must share group_id
CREATE OR REPLACE FUNCTION enforce_concept_edges_group_id_matches_terms()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE from_gid UUID; to_gid UUID;
BEGIN
  SELECT group_id INTO from_gid FROM glossary_entries WHERE id = NEW.from_term_id;
  SELECT group_id INTO to_gid FROM glossary_entries WHERE id = NEW.to_term_id;
  IF from_gid IS NULL OR to_gid IS NULL THEN
    RAISE EXCEPTION 'concept_edges term references missing or have no group_id';
  END IF;
  IF from_gid <> to_gid THEN
    RAISE EXCEPTION 'concept_edges connects terms across groups (% vs %) — not allowed', from_gid, to_gid;
  END IF;
  IF NEW.group_id IS NULL THEN
    NEW.group_id := from_gid;
  ELSIF NEW.group_id <> from_gid THEN
    RAISE EXCEPTION 'concept_edges.group_id (%) must match term group_id (%)', NEW.group_id, from_gid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS concept_edges_group_id_matches ON concept_edges;
CREATE TRIGGER concept_edges_group_id_matches
  BEFORE INSERT OR UPDATE ON concept_edges
  FOR EACH ROW EXECUTE FUNCTION enforce_concept_edges_group_id_matches_terms();

-- =====================================================
-- 6. Watermelon group seed + Mars's host memberships
-- =====================================================
-- Watermelon = the launch group, fresh UUID. Existing test group
-- (00000000-0000-0000-0000-000000000001) keeps its identity.
-- Both get the admin user (Mars) seeded as host.
-- We look up the admin user by role rather than hardcoding a UUID
-- so the migration is portable across environments.

-- Insert Watermelon. Use a deterministic UUID so we can reference it
-- from rollback / verification. Conflict-on-slug means re-running is
-- idempotent.
INSERT INTO groups (id, name, slug, description, is_public)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Watermelon',
  'watermelon',
  'The launch reading group.',
  false
) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Mars's host memberships on both groups. Looks up admin user by role
-- (CLAUDE.md: "Marco is currently the only user with admin role").
INSERT INTO group_memberships (group_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000002', p.id, 'host'
FROM profiles p WHERE p.role = 'admin'
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'host';

INSERT INTO group_memberships (group_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', p.id, 'host'
FROM profiles p WHERE p.role = 'admin'
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'host';

-- Set Mars's profiles.current_group_id to Watermelon (the launch
-- group is the default active group; the URL override switches to
-- the test group when needed).
UPDATE profiles
SET current_group_id = '00000000-0000-0000-0000-000000000002'
WHERE role = 'admin' AND current_group_id IS NULL;

-- =====================================================
-- 7. Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
-- Compound index that matches the is_group_member() function's WHERE.
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_group ON group_memberships(user_id, group_id);

-- New denormalized group_id indexes (mirrors what 001 added for the
-- already-existing columns).
CREATE INDEX IF NOT EXISTS idx_thread_branches_group_id ON thread_branches(group_id);
CREATE INDEX IF NOT EXISTS idx_glossary_versions_group_id ON glossary_versions(group_id);
CREATE INDEX IF NOT EXISTS idx_glossary_comments_group_id ON glossary_comments(group_id);
CREATE INDEX IF NOT EXISTS idx_concept_edges_group_id ON concept_edges(group_id);
CREATE INDEX IF NOT EXISTS idx_confusion_counts_group_id ON confusion_counts(group_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_group_id ON invite_codes(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_group_id ON profiles(current_group_id);

-- =====================================================
-- 8. RLS — replace USING(true) with is_group_member(group_id)
-- =====================================================
-- Pattern: SELECT requires membership; INSERT requires membership +
-- author/creator semantics where applicable; UPDATE/DELETE require
-- membership + ownership.
--
-- Tables affected: threads, replies, annotations, annotation_replies,
-- glossary_entries, glossary_versions, glossary_comments,
-- concept_edges, resources, reading_schedule, weekly_roles,
-- discussion_prompts, reading_checkins, session_notes,
-- confusion_counts, confusion_flags, thread_branches, invite_codes.
--
-- Tables UNCHANGED (stay public-readable, NOT group-scoped): profiles,
-- text_documents, text_chapters, text_footnotes, groups,
-- group_memberships, reading_milestones, private_notes (user-owned via
-- separate user_id RLS).

-- Helper: a single membership-only SELECT policy + ownership-aware
-- write policies. Because we drop and recreate, the migration is
-- idempotent across re-runs.

-- ── threads ─────────────────────────────────────────
DROP POLICY IF EXISTS "threads_select" ON threads;
DROP POLICY IF EXISTS "threads_select_member" ON threads;
DROP POLICY IF EXISTS "Anyone can read threads" ON threads;
CREATE POLICY "threads_select_member" ON threads FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "threads_insert" ON threads;
DROP POLICY IF EXISTS "threads_insert_member" ON threads;
CREATE POLICY "threads_insert_member" ON threads FOR INSERT
  WITH CHECK (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "threads_update" ON threads;
DROP POLICY IF EXISTS "threads_update_owner" ON threads;
CREATE POLICY "threads_update_owner" ON threads FOR UPDATE
  USING (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "threads_delete" ON threads;
DROP POLICY IF EXISTS "threads_delete_owner" ON threads;
CREATE POLICY "threads_delete_owner" ON threads FOR DELETE
  USING (is_group_member(group_id) AND author_id = auth.uid());

-- ── replies ─────────────────────────────────────────
DROP POLICY IF EXISTS "replies_select" ON replies;
DROP POLICY IF EXISTS "replies_select_member" ON replies;
CREATE POLICY "replies_select_member" ON replies FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "replies_insert" ON replies;
DROP POLICY IF EXISTS "replies_insert_member" ON replies;
CREATE POLICY "replies_insert_member" ON replies FOR INSERT
  WITH CHECK (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "replies_update" ON replies;
DROP POLICY IF EXISTS "replies_update_owner" ON replies;
CREATE POLICY "replies_update_owner" ON replies FOR UPDATE
  USING (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "replies_delete" ON replies;
DROP POLICY IF EXISTS "replies_delete_owner" ON replies;
CREATE POLICY "replies_delete_owner" ON replies FOR DELETE
  USING (is_group_member(group_id) AND author_id = auth.uid());

-- ── annotations ─────────────────────────────────────
-- annotations also have is_public column from chunk 3b piece 2c-i
-- (draft-state privacy). Member can read any public annotation in
-- the group OR their own private ones in the group.
DROP POLICY IF EXISTS "annotations_select" ON annotations;
DROP POLICY IF EXISTS "Public annotations are readable by all" ON annotations;
DROP POLICY IF EXISTS "Authors can read their own annotations" ON annotations;
DROP POLICY IF EXISTS "annotations_select_member" ON annotations;
CREATE POLICY "annotations_select_public_in_group" ON annotations FOR SELECT
  USING (is_group_member(group_id) AND is_public = true);
CREATE POLICY "annotations_select_own_drafts_in_group" ON annotations FOR SELECT
  USING (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "annotations_insert" ON annotations;
DROP POLICY IF EXISTS "annotations_insert_member" ON annotations;
CREATE POLICY "annotations_insert_member" ON annotations FOR INSERT
  WITH CHECK (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "annotations_update" ON annotations;
DROP POLICY IF EXISTS "annotations_update_owner" ON annotations;
CREATE POLICY "annotations_update_owner" ON annotations FOR UPDATE
  USING (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "annotations_delete" ON annotations;
DROP POLICY IF EXISTS "annotations_delete_owner" ON annotations;
CREATE POLICY "annotations_delete_owner" ON annotations FOR DELETE
  USING (is_group_member(group_id) AND author_id = auth.uid());

-- ── annotation_replies ──────────────────────────────
-- Inherit parent annotation's visibility AND require membership.
DROP POLICY IF EXISTS "annotation_replies_select" ON annotation_replies;
DROP POLICY IF EXISTS "Replies follow parent annotation visibility" ON annotation_replies;
DROP POLICY IF EXISTS "annotation_replies_select_member" ON annotation_replies;
CREATE POLICY "annotation_replies_select_member" ON annotation_replies FOR SELECT
  USING (
    is_group_member(group_id)
    AND EXISTS (
      SELECT 1 FROM annotations
      WHERE annotations.id = annotation_replies.annotation_id
        AND (annotations.is_public = true OR annotations.author_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "annotation_replies_insert" ON annotation_replies;
DROP POLICY IF EXISTS "annotation_replies_insert_member" ON annotation_replies;
CREATE POLICY "annotation_replies_insert_member" ON annotation_replies FOR INSERT
  WITH CHECK (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "annotation_replies_update_owner" ON annotation_replies;
CREATE POLICY "annotation_replies_update_owner" ON annotation_replies FOR UPDATE
  USING (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "annotation_replies_delete_owner" ON annotation_replies;
CREATE POLICY "annotation_replies_delete_owner" ON annotation_replies FOR DELETE
  USING (is_group_member(group_id) AND author_id = auth.uid());

-- ── glossary_entries ────────────────────────────────
DROP POLICY IF EXISTS "glossary_entries_select" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_entries_select_member" ON glossary_entries;
CREATE POLICY "glossary_entries_select_member" ON glossary_entries FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "glossary_entries_insert" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_entries_insert_member" ON glossary_entries;
CREATE POLICY "glossary_entries_insert_member" ON glossary_entries FOR INSERT
  WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "glossary_entries_update" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_entries_update_member" ON glossary_entries;
CREATE POLICY "glossary_entries_update_member" ON glossary_entries FOR UPDATE
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "glossary_entries_delete" ON glossary_entries;
DROP POLICY IF EXISTS "glossary_entries_delete_creator" ON glossary_entries;
CREATE POLICY "glossary_entries_delete_creator" ON glossary_entries FOR DELETE
  USING (is_group_member(group_id) AND created_by = auth.uid());

-- ── glossary_versions ───────────────────────────────
DROP POLICY IF EXISTS "glossary_versions_select" ON glossary_versions;
DROP POLICY IF EXISTS "glossary_versions_select_member" ON glossary_versions;
CREATE POLICY "glossary_versions_select_member" ON glossary_versions FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "glossary_versions_insert" ON glossary_versions;
DROP POLICY IF EXISTS "glossary_versions_insert_member" ON glossary_versions;
CREATE POLICY "glossary_versions_insert_member" ON glossary_versions FOR INSERT
  WITH CHECK (is_group_member(group_id));

-- ── glossary_comments ───────────────────────────────
DROP POLICY IF EXISTS "glossary_comments_select" ON glossary_comments;
DROP POLICY IF EXISTS "glossary_comments_select_member" ON glossary_comments;
CREATE POLICY "glossary_comments_select_member" ON glossary_comments FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "glossary_comments_insert" ON glossary_comments;
DROP POLICY IF EXISTS "glossary_comments_insert_member" ON glossary_comments;
CREATE POLICY "glossary_comments_insert_member" ON glossary_comments FOR INSERT
  WITH CHECK (is_group_member(group_id) AND author_id = auth.uid());
DROP POLICY IF EXISTS "glossary_comments_delete_author" ON glossary_comments;
CREATE POLICY "glossary_comments_delete_author" ON glossary_comments FOR DELETE
  USING (is_group_member(group_id) AND author_id = auth.uid());

-- ── concept_edges ───────────────────────────────────
DROP POLICY IF EXISTS "concept_edges_select" ON concept_edges;
DROP POLICY IF EXISTS "concept_edges_select_member" ON concept_edges;
CREATE POLICY "concept_edges_select_member" ON concept_edges FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "concept_edges_insert" ON concept_edges;
DROP POLICY IF EXISTS "concept_edges_insert_member" ON concept_edges;
CREATE POLICY "concept_edges_insert_member" ON concept_edges FOR INSERT
  WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "concept_edges_delete_creator" ON concept_edges;
CREATE POLICY "concept_edges_delete_creator" ON concept_edges FOR DELETE
  USING (is_group_member(group_id) AND created_by = auth.uid());

-- ── resources ───────────────────────────────────────
DROP POLICY IF EXISTS "resources_select" ON resources;
DROP POLICY IF EXISTS "resources_select_member" ON resources;
CREATE POLICY "resources_select_member" ON resources FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "resources_insert" ON resources;
DROP POLICY IF EXISTS "resources_insert_member" ON resources;
CREATE POLICY "resources_insert_member" ON resources FOR INSERT
  WITH CHECK (is_group_member(group_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "resources_update" ON resources;
DROP POLICY IF EXISTS "resources_update_creator" ON resources;
CREATE POLICY "resources_update_creator" ON resources FOR UPDATE
  USING (is_group_member(group_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS "resources_delete" ON resources;
DROP POLICY IF EXISTS "resources_delete_creator" ON resources;
CREATE POLICY "resources_delete_creator" ON resources FOR DELETE
  USING (is_group_member(group_id) AND created_by = auth.uid());

-- ── reading_schedule ────────────────────────────────
DROP POLICY IF EXISTS "reading_schedule_select" ON reading_schedule;
DROP POLICY IF EXISTS "reading_schedule_select_member" ON reading_schedule;
CREATE POLICY "reading_schedule_select_member" ON reading_schedule FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "reading_schedule_insert" ON reading_schedule;
DROP POLICY IF EXISTS "reading_schedule_insert_host" ON reading_schedule;
CREATE POLICY "reading_schedule_insert_host" ON reading_schedule FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE user_id = auth.uid() AND group_id = reading_schedule.group_id AND role = 'host'
    )
  );
DROP POLICY IF EXISTS "reading_schedule_update" ON reading_schedule;
DROP POLICY IF EXISTS "reading_schedule_update_host" ON reading_schedule;
CREATE POLICY "reading_schedule_update_host" ON reading_schedule FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE user_id = auth.uid() AND group_id = reading_schedule.group_id AND role = 'host'
    )
  );
DROP POLICY IF EXISTS "reading_schedule_delete" ON reading_schedule;
DROP POLICY IF EXISTS "reading_schedule_delete_host" ON reading_schedule;
CREATE POLICY "reading_schedule_delete_host" ON reading_schedule FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE user_id = auth.uid() AND group_id = reading_schedule.group_id AND role = 'host'
    )
  );

-- ── weekly_roles ────────────────────────────────────
-- Inherit visibility from reading_schedule.
DROP POLICY IF EXISTS "weekly_roles_select" ON weekly_roles;
DROP POLICY IF EXISTS "weekly_roles_select_member" ON weekly_roles;
CREATE POLICY "weekly_roles_select_member" ON weekly_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reading_schedule
      WHERE reading_schedule.id = weekly_roles.week_id
        AND is_group_member(reading_schedule.group_id)
    )
  );
DROP POLICY IF EXISTS "weekly_roles_insert" ON weekly_roles;
DROP POLICY IF EXISTS "weekly_roles_insert_host" ON weekly_roles;
CREATE POLICY "weekly_roles_insert_host" ON weekly_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_schedule rs
      JOIN group_memberships gm ON gm.group_id = rs.group_id
      WHERE rs.id = weekly_roles.week_id AND gm.user_id = auth.uid() AND gm.role = 'host'
    )
  );
DROP POLICY IF EXISTS "weekly_roles_delete" ON weekly_roles;
DROP POLICY IF EXISTS "weekly_roles_delete_host" ON weekly_roles;
CREATE POLICY "weekly_roles_delete_host" ON weekly_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reading_schedule rs
      JOIN group_memberships gm ON gm.group_id = rs.group_id
      WHERE rs.id = weekly_roles.week_id AND gm.user_id = auth.uid() AND gm.role = 'host'
    )
  );

-- ── discussion_prompts ──────────────────────────────
-- Same inheritance pattern as weekly_roles.
DROP POLICY IF EXISTS "discussion_prompts_select" ON discussion_prompts;
DROP POLICY IF EXISTS "discussion_prompts_select_member" ON discussion_prompts;
CREATE POLICY "discussion_prompts_select_member" ON discussion_prompts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reading_schedule
      WHERE reading_schedule.id = discussion_prompts.week_id
        AND is_group_member(reading_schedule.group_id)
    )
  );
DROP POLICY IF EXISTS "discussion_prompts_insert" ON discussion_prompts;
DROP POLICY IF EXISTS "discussion_prompts_insert_host" ON discussion_prompts;
CREATE POLICY "discussion_prompts_insert_host" ON discussion_prompts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reading_schedule rs
      JOIN group_memberships gm ON gm.group_id = rs.group_id
      WHERE rs.id = discussion_prompts.week_id AND gm.user_id = auth.uid() AND gm.role = 'host'
    )
  );

-- ── reading_checkins ────────────────────────────────
DROP POLICY IF EXISTS "reading_checkins_select" ON reading_checkins;
DROP POLICY IF EXISTS "reading_checkins_select_own" ON reading_checkins;
CREATE POLICY "reading_checkins_select_own" ON reading_checkins FOR SELECT
  USING (is_group_member(group_id) AND user_id = auth.uid());
DROP POLICY IF EXISTS "reading_checkins_insert" ON reading_checkins;
DROP POLICY IF EXISTS "reading_checkins_insert_own" ON reading_checkins;
CREATE POLICY "reading_checkins_insert_own" ON reading_checkins FOR INSERT
  WITH CHECK (is_group_member(group_id) AND user_id = auth.uid());
DROP POLICY IF EXISTS "reading_checkins_update" ON reading_checkins;
DROP POLICY IF EXISTS "reading_checkins_update_own" ON reading_checkins;
CREATE POLICY "reading_checkins_update_own" ON reading_checkins FOR UPDATE
  USING (is_group_member(group_id) AND user_id = auth.uid());

-- ── session_notes ───────────────────────────────────
DROP POLICY IF EXISTS "session_notes_select" ON session_notes;
DROP POLICY IF EXISTS "session_notes_select_member" ON session_notes;
CREATE POLICY "session_notes_select_member" ON session_notes FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "session_notes_insert" ON session_notes;
DROP POLICY IF EXISTS "session_notes_insert_member" ON session_notes;
CREATE POLICY "session_notes_insert_member" ON session_notes FOR INSERT
  WITH CHECK (is_group_member(group_id));
DROP POLICY IF EXISTS "session_notes_update" ON session_notes;
DROP POLICY IF EXISTS "session_notes_update_member" ON session_notes;
CREATE POLICY "session_notes_update_member" ON session_notes FOR UPDATE
  USING (is_group_member(group_id));

-- ── confusion_counts ────────────────────────────────
-- Counts only — read by all members of the group; write only via RPC.
DROP POLICY IF EXISTS "Anyone can read confusion counts" ON confusion_counts;
DROP POLICY IF EXISTS "confusion_counts_select_member" ON confusion_counts;
CREATE POLICY "confusion_counts_select_member" ON confusion_counts FOR SELECT
  USING (is_group_member(group_id));

-- ── confusion_flags (legacy non-anonymous table from migration 001;
-- has user_id. confusion_counts is the active anonymous table) ──────
-- Conditional: this database may or may not have the legacy
-- confusion_flags table — the team replaced the per-user model with
-- the counts-only confusion_counts model, and the legacy table was
-- dropped along the way (or never fully created). If it exists, harden
-- its RLS the same way as everything else; if it doesn't, skip.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'confusion_flags'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "confusion_flags_select" ON confusion_flags';
    EXECUTE 'DROP POLICY IF EXISTS "confusion_flags_insert" ON confusion_flags';
    EXECUTE 'DROP POLICY IF EXISTS "confusion_flags_delete" ON confusion_flags';
    EXECUTE 'DROP POLICY IF EXISTS "confusion_flags_select_member" ON confusion_flags';
    EXECUTE 'CREATE POLICY "confusion_flags_select_member" ON confusion_flags FOR SELECT USING (is_group_member(group_id))';
    EXECUTE 'CREATE POLICY "confusion_flags_insert_member" ON confusion_flags FOR INSERT WITH CHECK (is_group_member(group_id) AND user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "confusion_flags_delete_own" ON confusion_flags FOR DELETE USING (is_group_member(group_id) AND user_id = auth.uid())';
  END IF;
END $$;

-- ── thread_branches ─────────────────────────────────
DROP POLICY IF EXISTS "thread_branches_select" ON thread_branches;
DROP POLICY IF EXISTS "thread_branches_select_member" ON thread_branches;
CREATE POLICY "thread_branches_select_member" ON thread_branches FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "thread_branches_insert" ON thread_branches;
DROP POLICY IF EXISTS "thread_branches_insert_member" ON thread_branches;
CREATE POLICY "thread_branches_insert_member" ON thread_branches FOR INSERT
  WITH CHECK (is_group_member(group_id) AND branched_by = auth.uid());

-- ── invite_codes ────────────────────────────────────
-- Hosts can manage their own group's invites; nobody else can read
-- them. (Anon-readable INSERT path stays nominally available for the
-- register-actions flow Brief 1 wires up, but the membership check
-- there is a different mechanism.)
DROP POLICY IF EXISTS "invite_codes_select" ON invite_codes;
DROP POLICY IF EXISTS "invite_codes_select_host" ON invite_codes;
CREATE POLICY "invite_codes_select_host" ON invite_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE user_id = auth.uid() AND group_id = invite_codes.group_id AND role = 'host'
    )
  );

-- ── group_memberships ───────────────────────────────
-- Members can see other members of the same group.
DROP POLICY IF EXISTS "group_memberships_select" ON group_memberships;
DROP POLICY IF EXISTS "group_memberships_select_member" ON group_memberships;
CREATE POLICY "group_memberships_select_member" ON group_memberships FOR SELECT
  USING (is_group_member(group_id));
DROP POLICY IF EXISTS "group_memberships_insert" ON group_memberships;
DROP POLICY IF EXISTS "group_memberships_insert_self_or_host" ON group_memberships;
CREATE POLICY "group_memberships_insert_self_or_host" ON group_memberships FOR INSERT
  WITH CHECK (
    -- A user can insert their own membership (signup flow with invite),
    user_id = auth.uid()
    OR
    -- or a host of the group can add members
    EXISTS (
      SELECT 1 FROM group_memberships gm2
      WHERE gm2.user_id = auth.uid() AND gm2.group_id = group_memberships.group_id AND gm2.role = 'host'
    )
  );

-- =====================================================
-- 9. RPC signature change: confusion increment / decrement
-- =====================================================
-- Drop the old (chapter_id, paragraph_index) signatures and create
-- new (chapter_id, paragraph_index, group_id) signatures. The
-- application is updated atomically in the same deploy; no mixed-
-- signature window.

DROP FUNCTION IF EXISTS increment_confusion(uuid, integer);
DROP FUNCTION IF EXISTS decrement_confusion(uuid, integer);

CREATE OR REPLACE FUNCTION increment_confusion(
  p_chapter_id uuid,
  p_paragraph_index integer,
  p_group_id uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO confusion_counts (chapter_id, paragraph_index, count, group_id)
  VALUES (p_chapter_id, p_paragraph_index, 1, p_group_id)
  ON CONFLICT (chapter_id, paragraph_index)
  DO UPDATE SET count = confusion_counts.count + 1
  RETURNING count;
$$;

CREATE OR REPLACE FUNCTION decrement_confusion(
  p_chapter_id uuid,
  p_paragraph_index integer,
  p_group_id uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE confusion_counts
  SET count = GREATEST(0, count - 1)
  WHERE chapter_id = p_chapter_id
    AND paragraph_index = p_paragraph_index
    AND group_id = p_group_id
  RETURNING count;
$$;

-- =====================================================
-- DONE. Verification queries below — copy and run after migration.
-- =====================================================
COMMIT;

-- After running this migration, paste the following block into the SQL
-- editor and confirm each result.
--
-- 1. group_role enum exists with the right values:
--    SELECT enumlabel FROM pg_enum
--    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'group_role');
--    Expect: host, member.
--
-- 2. group_memberships table renamed:
--    SELECT table_name FROM information_schema.tables WHERE table_name IN ('group_members', 'group_memberships');
--    Expect: group_memberships only.
--
-- 3. is_group_member exists:
--    SELECT proname FROM pg_proc WHERE proname = 'is_group_member';
--    Expect: 1 row.
--
-- 4. New columns:
--    SELECT table_name, column_name FROM information_schema.columns
--    WHERE column_name = 'group_id'
--      AND table_name IN ('confusion_counts', 'invite_codes', 'thread_branches',
--                         'glossary_versions', 'glossary_comments', 'concept_edges');
--    Expect: 6 rows.
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'profiles' AND column_name = 'current_group_id';
--    Expect: 1 row.
--
-- 5. Watermelon group + Mars memberships:
--    SELECT name, slug FROM groups WHERE slug IN ('watermelon', 'christchurch-capital');
--    Expect: 2 rows (Watermelon + the existing test group).
--    SELECT g.slug, gm.role FROM group_memberships gm
--    JOIN groups g ON g.id = gm.group_id
--    JOIN profiles p ON p.id = gm.user_id
--    WHERE p.role = 'admin';
--    Expect: 2 rows, both with role='host'.
--
-- 6. RLS — try as a non-member user (set request.jwt.claim.sub to a UUID
--    not in any group_memberships row):
--    SET LOCAL ROLE authenticated;
--    SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-deadbeef0000';
--    SELECT count(*) FROM threads;       -- expect 0
--    SELECT count(*) FROM annotations;   -- expect 0
--    SELECT count(*) FROM glossary_entries;  -- expect 0
--    RESET ROLE;
--
-- 7. Confusion RPC signatures:
--    SELECT proname, pg_get_function_arguments(oid) FROM pg_proc
--    WHERE proname IN ('increment_confusion', 'decrement_confusion');
--    Expect: each takes (p_chapter_id uuid, p_paragraph_index integer, p_group_id uuid).
