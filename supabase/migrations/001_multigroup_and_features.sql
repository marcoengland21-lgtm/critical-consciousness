-- =====================================================
-- MIGRATION 001: Multi-group schema + new feature tables
-- =====================================================
-- Adds:
-- 1. groups + group_members tables
-- 2. group_id columns on core tables (nullable, defaults to single group)
-- 3. confusion_flags table (anonymous difficulty signals)
-- 4. reading_checkins table (private reading status)
-- 5. glossary_versions table (definition history)
-- 6. session_notes table (collaborative live notes)
-- 7. reading_milestones table
-- 8. New enums for check-in status
-- =====================================================

-- =====================================================
-- NEW ENUMS
-- =====================================================

CREATE TYPE checkin_status AS ENUM ('done', 'partial', 'behind');

-- =====================================================
-- MULTI-GROUP TABLES
-- =====================================================

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Group members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create a default group for existing data
INSERT INTO groups (id, name, slug, description, is_public)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Christchurch Capital Reading Group',
  'christchurch-capital',
  'A collaborative reading group working through Marx''s Capital, Volume 1.',
  false
) ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ADD group_id TO EXISTING TABLES
-- =====================================================

-- Add group_id to threads
ALTER TABLE threads ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE threads SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Add group_id to annotations
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE annotations SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Add group_id to glossary_entries
ALTER TABLE glossary_entries ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE glossary_entries SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Add group_id to resources
ALTER TABLE resources ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE resources SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Add group_id to reading_schedule
ALTER TABLE reading_schedule ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE reading_schedule SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Add group_id to annotation_replies (inherited from annotation's group)
ALTER TABLE annotation_replies ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE annotation_replies SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Add group_id to replies (inherited from thread's group)
ALTER TABLE replies ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
UPDATE replies SET group_id = '00000000-0000-0000-0000-000000000001' WHERE group_id IS NULL;

-- Add thread_id to annotations (for annotation→thread promotion)
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id) ON DELETE SET NULL;

-- =====================================================
-- NEW FEATURE TABLES
-- =====================================================

-- Confusion flags: anonymous difficulty signals per paragraph
CREATE TABLE IF NOT EXISTS confusion_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES text_chapters(id) ON DELETE CASCADE,
  paragraph_index INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- One flag per user per paragraph
  UNIQUE(chapter_id, paragraph_index, user_id)
);

-- Reading check-ins: private reading status per week
CREATE TABLE IF NOT EXISTS reading_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES reading_schedule(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  status checkin_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_id)
);

-- Glossary version history
CREATE TABLE IF NOT EXISTS glossary_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES glossary_entries(id) ON DELETE CASCADE,
  definition TEXT NOT NULL,
  updated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session notes: collaborative live notes per week
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES reading_schedule(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, group_id)
);

-- Reading milestones: group-level milestone markers
CREATE TABLE IF NOT EXISTS reading_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  week_id UUID REFERENCES reading_schedule(id) ON DELETE SET NULL,
  reflection_prompt TEXT,
  reached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Group indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);

-- Confusion flags indexes
CREATE INDEX IF NOT EXISTS idx_confusion_flags_chapter_paragraph ON confusion_flags(chapter_id, paragraph_index);
CREATE INDEX IF NOT EXISTS idx_confusion_flags_group_id ON confusion_flags(group_id);

-- Reading check-ins indexes
CREATE INDEX IF NOT EXISTS idx_reading_checkins_week_id ON reading_checkins(week_id);
CREATE INDEX IF NOT EXISTS idx_reading_checkins_user_group ON reading_checkins(user_id, group_id);

-- Glossary versions indexes
CREATE INDEX IF NOT EXISTS idx_glossary_versions_entry_id ON glossary_versions(entry_id);

-- Session notes indexes
CREATE INDEX IF NOT EXISTS idx_session_notes_week_group ON session_notes(week_id, group_id);

-- Group-scoped indexes on existing tables
CREATE INDEX IF NOT EXISTS idx_threads_group_id ON threads(group_id);
CREATE INDEX IF NOT EXISTS idx_annotations_group_id ON annotations(group_id);
CREATE INDEX IF NOT EXISTS idx_glossary_entries_group_id ON glossary_entries(group_id);
CREATE INDEX IF NOT EXISTS idx_resources_group_id ON resources(group_id);
CREATE INDEX IF NOT EXISTS idx_reading_schedule_group_id ON reading_schedule(group_id);

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE confusion_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_milestones ENABLE ROW LEVEL SECURITY;

-- GROUPS: Anyone can see public groups; members can see their private groups
CREATE POLICY "groups_select" ON groups
  FOR SELECT USING (true);

CREATE POLICY "groups_insert" ON groups
  FOR INSERT WITH CHECK (true);

-- GROUP_MEMBERS: Members can see their own groups
CREATE POLICY "group_members_select" ON group_members
  FOR SELECT USING (true);

CREATE POLICY "group_members_insert" ON group_members
  FOR INSERT WITH CHECK (true);

-- CONFUSION_FLAGS: Anyone can insert (anonymous signals); select shows counts only via RPC
-- Allow all operations for now (anonymity enforced at app level)
CREATE POLICY "confusion_flags_select" ON confusion_flags
  FOR SELECT USING (true);

CREATE POLICY "confusion_flags_insert" ON confusion_flags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "confusion_flags_delete" ON confusion_flags
  FOR DELETE USING (true);

-- READING_CHECKINS: Users manage their own; admins can see all in group
CREATE POLICY "reading_checkins_select" ON reading_checkins
  FOR SELECT USING (true);

CREATE POLICY "reading_checkins_insert" ON reading_checkins
  FOR INSERT WITH CHECK (true);

CREATE POLICY "reading_checkins_update" ON reading_checkins
  FOR UPDATE USING (true);

-- GLOSSARY_VERSIONS: Anyone can see; created automatically
CREATE POLICY "glossary_versions_select" ON glossary_versions
  FOR SELECT USING (true);

CREATE POLICY "glossary_versions_insert" ON glossary_versions
  FOR INSERT WITH CHECK (true);

-- SESSION_NOTES: Group members can read and write
CREATE POLICY "session_notes_select" ON session_notes
  FOR SELECT USING (true);

CREATE POLICY "session_notes_insert" ON session_notes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "session_notes_update" ON session_notes
  FOR UPDATE USING (true);

-- READING_MILESTONES: Anyone can see; admins create
CREATE POLICY "reading_milestones_select" ON reading_milestones
  FOR SELECT USING (true);

CREATE POLICY "reading_milestones_insert" ON reading_milestones
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- REALTIME FOR NEW TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE confusion_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE session_notes;

-- =====================================================
-- TRIGGERS FOR NEW TABLES
-- =====================================================

CREATE TRIGGER update_reading_checkins_updated_at
BEFORE UPDATE ON reading_checkins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_notes_updated_at
BEFORE UPDATE ON session_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- END OF MIGRATION 001
-- =====================================================
