-- ============================================================================
-- Concept edges — IMPROVEMENTS_PLAN.md §11.2
--
-- Directed connections between glossary terms. Replaces the lossy
-- glossary_entries.related_terms[] array (kept for back-compat) with a
-- proper junction table that supports directionality, edge types, notes,
-- and audit. Drives the concept-map visualisation (§11.4) and the per-term
-- "this concept builds on / concepts that build on this" UI (§11.6).
--
-- Edge types stored as text rather than enum so new types can be added
-- without a migration. v1 only uses 'builds_on'. Other types in the schema
-- are forward-looking — see the column comment.
--
-- Run ONCE in Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS concept_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_term_id uuid NOT NULL REFERENCES glossary_entries(id) ON DELETE CASCADE,
  to_term_id uuid NOT NULL REFERENCES glossary_entries(id) ON DELETE CASCADE,
  edge_type text NOT NULL DEFAULT 'builds_on',
  -- 'builds_on'    : from depends on / is a prerequisite for to (the v1 default)
  -- 'leads_to'     : symmetric inverse (stored if author chose this framing)
  -- 'contrasts'    : from is set against to in Marx's argument
  -- 'appears_with' : weaker association, no dependency claim
  note text,                           -- optional one-line annotation
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_term_id, to_term_id, edge_type),
  CHECK (from_term_id <> to_term_id)
);

CREATE INDEX IF NOT EXISTS concept_edges_from_idx ON concept_edges(from_term_id);
CREATE INDEX IF NOT EXISTS concept_edges_to_idx   ON concept_edges(to_term_id);
CREATE INDEX IF NOT EXISTS concept_edges_type_idx ON concept_edges(edge_type);

-- Auto-update updated_at on UPDATE (matches the pattern used elsewhere).
CREATE OR REPLACE FUNCTION concept_edges_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS concept_edges_updated_at ON concept_edges;
CREATE TRIGGER concept_edges_updated_at
  BEFORE UPDATE ON concept_edges
  FOR EACH ROW EXECUTE FUNCTION concept_edges_set_updated_at();

ALTER TABLE concept_edges ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user
DROP POLICY IF EXISTS concept_edges_select ON concept_edges;
CREATE POLICY concept_edges_select ON concept_edges
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert: any authenticated user, must own the row
DROP POLICY IF EXISTS concept_edges_insert ON concept_edges;
CREATE POLICY concept_edges_insert ON concept_edges
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Update: wiki-style — anyone authenticated can refine an existing edge's note
DROP POLICY IF EXISTS concept_edges_update ON concept_edges;
CREATE POLICY concept_edges_update ON concept_edges
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Delete: only the original creator (deletion of someone else's edge is
-- effectively destructive — refining via UPDATE is the wiki-style alternative)
DROP POLICY IF EXISTS concept_edges_delete ON concept_edges;
CREATE POLICY concept_edges_delete ON concept_edges
  FOR DELETE USING (created_by = auth.uid());

-- Realtime — surface new connections in the live concept-map view
ALTER PUBLICATION supabase_realtime ADD TABLE concept_edges;

-- ----------------------------------------------------------------------------
-- IMPORTANT — production launches with this table EMPTY.
-- The map is GROUP-BUILT. Sparse early-weeks state is itself a teaching
-- artifact, not a bug to paper over by pre-seeding. See §11.7.
-- ----------------------------------------------------------------------------
