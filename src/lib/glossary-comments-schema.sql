-- Glossary comments: discussion on glossary entries
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS glossary_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES glossary_entries(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE glossary_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read glossary comments" ON glossary_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own comments" ON glossary_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments" ON glossary_comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments" ON glossary_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_glossary_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_glossary_comments_updated_at
  BEFORE UPDATE ON glossary_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_glossary_comments_updated_at();
