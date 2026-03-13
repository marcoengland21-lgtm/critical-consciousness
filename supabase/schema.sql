-- =====================================================
-- SUPABASE STUDY GROUP PLATFORM SCHEMA
-- =====================================================
-- This schema sets up a complete study group platform with:
-- - User management and roles
-- - Reading schedules with weekly assignments
-- - Discussion threads and replies
-- - Text documents with annotations
-- - Glossary for terminology
-- - Resources and weekly role assignments
--
-- All tables have UUID primary keys and timestamps.
-- Row-Level Security (RLS) is enabled on all tables.
-- Realtime updates are configured for collaboration tables.
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'member');

CREATE TYPE weekly_role_type AS ENUM ('summarizer', 'discussion_starter', 'connector', 'passage_picker');

CREATE TYPE thread_type AS ENUM ('discussion', 'reflection', 'summary', 'passage_pick', 'connection', 'general');

CREATE TYPE resource_type AS ENUM ('primary_text', 'companion', 'lecture', 'article', 'tool', 'other');


-- =====================================================
-- TABLES
-- =====================================================

-- Users profile table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role user_role DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invite codes for group access
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reading schedule defining weekly topics and sessions
CREATE TABLE reading_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  chapter_ref TEXT,
  page_start INTEGER,
  page_end INTEGER,
  due_date DATE NOT NULL,
  session_date TIMESTAMPTZ,
  session_location TEXT,
  zoom_link TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly role assignments for group members
CREATE TABLE weekly_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES reading_schedule(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_type weekly_role_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, role_type)
);

-- Discussion prompts for each week
CREATE TABLE discussion_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES reading_schedule(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Discussion threads
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_id UUID REFERENCES reading_schedule(id) ON DELETE SET NULL,
  thread_type thread_type DEFAULT 'discussion',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Replies to threads (nested comments)
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Glossary for terminology
CREATE TABLE glossary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  first_appearance_week UUID REFERENCES reading_schedule(id) ON DELETE SET NULL,
  related_terms TEXT[],
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Resources (links, materials, etc.)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  resource_type resource_type DEFAULT 'other',
  week_id UUID REFERENCES reading_schedule(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Text documents (primary texts, readings)
CREATE TABLE text_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chapters within text documents
CREATE TABLE text_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES text_documents(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  week_id UUID REFERENCES reading_schedule(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Annotations on text chapters
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES text_chapters(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  quote_exact TEXT NOT NULL,
  position_start INTEGER NOT NULL,
  position_end INTEGER NOT NULL,
  quote_prefix TEXT,
  quote_suffix TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Replies to annotations
CREATE TABLE annotation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function: Create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', new.email),
    'member'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Auto-create profile on auth.users INSERT
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update threads.updated_at
CREATE TRIGGER update_threads_updated_at
BEFORE UPDATE ON threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update replies.updated_at
CREATE TRIGGER update_replies_updated_at
BEFORE UPDATE ON replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update glossary_entries.updated_at
CREATE TRIGGER update_glossary_entries_updated_at
BEFORE UPDATE ON glossary_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update annotations.updated_at
CREATE TRIGGER update_annotations_updated_at
BEFORE UPDATE ON annotations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Update annotation_replies.updated_at
CREATE TRIGGER update_annotation_replies_updated_at
BEFORE UPDATE ON annotation_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================
-- ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_replies ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- PROFILES: Authenticated users can SELECT all; users can UPDATE their own display_name
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND display_name IS NOT NULL);

-- INVITE_CODES: Only admins can INSERT, UPDATE, DELETE
CREATE POLICY "invite_codes_select" ON invite_codes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "invite_codes_admin_insert" ON invite_codes
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "invite_codes_admin_update" ON invite_codes
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "invite_codes_admin_delete" ON invite_codes
  FOR DELETE USING (is_admin());

-- READING_SCHEDULE: Only admins can INSERT, UPDATE, DELETE
CREATE POLICY "reading_schedule_select" ON reading_schedule
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "reading_schedule_admin_insert" ON reading_schedule
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "reading_schedule_admin_update" ON reading_schedule
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "reading_schedule_admin_delete" ON reading_schedule
  FOR DELETE USING (is_admin());

-- WEEKLY_ROLES: Only admins can INSERT, UPDATE, DELETE
CREATE POLICY "weekly_roles_select" ON weekly_roles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "weekly_roles_admin_insert" ON weekly_roles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "weekly_roles_admin_update" ON weekly_roles
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "weekly_roles_admin_delete" ON weekly_roles
  FOR DELETE USING (is_admin());

-- DISCUSSION_PROMPTS: Only admins can INSERT, UPDATE, DELETE
CREATE POLICY "discussion_prompts_select" ON discussion_prompts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "discussion_prompts_admin_insert" ON discussion_prompts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "discussion_prompts_admin_update" ON discussion_prompts
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "discussion_prompts_admin_delete" ON discussion_prompts
  FOR DELETE USING (is_admin());

-- THREADS: Authenticated users can INSERT; authors/admins can UPDATE/DELETE own/any
CREATE POLICY "threads_select" ON threads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "threads_insert" ON threads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "threads_update_own" ON threads
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "threads_update_admin" ON threads
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "threads_delete_own" ON threads
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "threads_delete_admin" ON threads
  FOR DELETE USING (is_admin());

-- REPLIES: Authenticated users can INSERT; authors/admins can UPDATE/DELETE own/any
CREATE POLICY "replies_select" ON replies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "replies_insert" ON replies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "replies_update_own" ON replies
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "replies_update_admin" ON replies
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "replies_delete_own" ON replies
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "replies_delete_admin" ON replies
  FOR DELETE USING (is_admin());

-- GLOSSARY_ENTRIES: Authenticated users can INSERT and UPDATE any (wiki-style); admins can DELETE
CREATE POLICY "glossary_entries_select" ON glossary_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "glossary_entries_insert" ON glossary_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "glossary_entries_update" ON glossary_entries
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "glossary_entries_delete_admin" ON glossary_entries
  FOR DELETE USING (is_admin());

-- RESOURCES: Authenticated users can INSERT; admins can UPDATE/DELETE
CREATE POLICY "resources_select" ON resources
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "resources_insert" ON resources
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "resources_update_admin" ON resources
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "resources_delete_admin" ON resources
  FOR DELETE USING (is_admin());

-- TEXT_DOCUMENTS: Only admins can INSERT, UPDATE, DELETE
CREATE POLICY "text_documents_select" ON text_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "text_documents_admin_insert" ON text_documents
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "text_documents_admin_update" ON text_documents
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "text_documents_admin_delete" ON text_documents
  FOR DELETE USING (is_admin());

-- TEXT_CHAPTERS: Only admins can INSERT, UPDATE, DELETE
CREATE POLICY "text_chapters_select" ON text_chapters
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "text_chapters_admin_insert" ON text_chapters
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "text_chapters_admin_update" ON text_chapters
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "text_chapters_admin_delete" ON text_chapters
  FOR DELETE USING (is_admin());

-- ANNOTATIONS: Authenticated users can INSERT; authors can UPDATE/DELETE their own
CREATE POLICY "annotations_select" ON annotations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "annotations_insert" ON annotations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "annotations_update_own" ON annotations
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "annotations_delete_own" ON annotations
  FOR DELETE USING (auth.uid() = author_id);

-- ANNOTATION_REPLIES: Authenticated users can INSERT; authors can UPDATE/DELETE their own
CREATE POLICY "annotation_replies_select" ON annotation_replies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "annotation_replies_insert" ON annotation_replies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "annotation_replies_update_own" ON annotation_replies
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "annotation_replies_delete_own" ON annotation_replies
  FOR DELETE USING (auth.uid() = author_id);


-- =====================================================
-- INDEXES
-- =====================================================

-- Threads indexes
CREATE INDEX idx_threads_week_id_created_at ON threads(week_id, created_at DESC);
CREATE INDEX idx_threads_author_id ON threads(author_id);
CREATE INDEX idx_threads_thread_type ON threads(thread_type);

-- Replies indexes
CREATE INDEX idx_replies_thread_id_created_at ON replies(thread_id, created_at);
CREATE INDEX idx_replies_author_id ON replies(author_id);

-- Annotations indexes
CREATE INDEX idx_annotations_chapter_id_position_start ON annotations(chapter_id, position_start);
CREATE INDEX idx_annotations_author_id ON annotations(author_id);

-- Annotation replies indexes
CREATE INDEX idx_annotation_replies_annotation_id_created_at ON annotation_replies(annotation_id, created_at);
CREATE INDEX idx_annotation_replies_author_id ON annotation_replies(author_id);

-- Glossary indexes (with text_pattern_ops for search)
CREATE INDEX idx_glossary_entries_term ON glossary_entries(term);
CREATE INDEX idx_glossary_entries_term_pattern ON glossary_entries USING gin(term gin_trgm_ops);

-- Reading schedule indexes
CREATE INDEX idx_reading_schedule_week_number ON reading_schedule(week_number);

-- Weekly roles indexes
CREATE INDEX idx_weekly_roles_week_id ON weekly_roles(week_id);
CREATE INDEX idx_weekly_roles_user_id ON weekly_roles(user_id);

-- Text chapters indexes
CREATE INDEX idx_text_chapters_document_id ON text_chapters(document_id);
CREATE INDEX idx_text_chapters_week_id ON text_chapters(week_id);


-- =====================================================
-- REALTIME CONFIGURATION
-- =====================================================
-- Enable realtime updates on collaboration tables

ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;
ALTER PUBLICATION supabase_realtime ADD TABLE annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE annotation_replies;


-- =====================================================
-- END OF SCHEMA
-- =====================================================
