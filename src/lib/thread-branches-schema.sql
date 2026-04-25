-- ============================================================================
-- Thread branching — IMPROVEMENTS_PLAN.md §4.2
--
-- Allows a reply (or a thread's OP) to spawn a NEW thread that retains a
-- recorded link to its parent. Implements branching dialogue: a sub-conversation
-- can grow without hijacking the parent thread or starting a fresh top-level
-- thread that loses lineage.
--
-- A thread is branched from at most one parent (UNIQUE on child_thread_id).
-- A reply can have multiple branches (rare but allowed — different members
-- might find different sub-conversations worth spawning).
-- A thread can have multiple branches across replies or directly from the OP.
-- parent_reply_id is nullable: a thread can be branched from another thread's
-- OP, not just from a specific reply.
--
-- Run ONCE in Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS thread_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_reply_id uuid REFERENCES replies(id) ON DELETE SET NULL,
  child_thread_id uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  branched_by uuid NOT NULL REFERENCES profiles(id),
  branched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(child_thread_id)
);

CREATE INDEX IF NOT EXISTS thread_branches_parent_thread_idx
  ON thread_branches(parent_thread_id);

CREATE INDEX IF NOT EXISTS thread_branches_parent_reply_idx
  ON thread_branches(parent_reply_id) WHERE parent_reply_id IS NOT NULL;

ALTER TABLE thread_branches ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user (matches threads SELECT policy)
DROP POLICY IF EXISTS thread_branches_select ON thread_branches;
CREATE POLICY thread_branches_select ON thread_branches
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert: any authenticated user, must own the row
DROP POLICY IF EXISTS thread_branches_insert ON thread_branches;
CREATE POLICY thread_branches_insert ON thread_branches
  FOR INSERT WITH CHECK (branched_by = auth.uid());

-- No UPDATE or DELETE policies — branches are immutable history.
-- (Cascade on parent thread deletion still removes the branch row.)

-- Realtime — surface new branches in the live UI
ALTER PUBLICATION supabase_realtime ADD TABLE thread_branches;
