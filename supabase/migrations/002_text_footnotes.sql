-- =====================================================
-- MIGRATION 002: Text Footnotes table
-- =====================================================
-- Adds:
-- 1. text_footnotes table for storing footnotes with Marx/Engels attribution
-- 2. RLS policy for public read access
-- 3. Index for chapter-based lookup
-- =====================================================

-- Footnotes associated with text chapters
CREATE TABLE IF NOT EXISTS text_footnotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES text_chapters(id) ON DELETE CASCADE,
  footnote_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'marx' CHECK (author IN ('marx', 'engels')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chapter_id, footnote_number)
);

-- Enable RLS
ALTER TABLE text_footnotes ENABLE ROW LEVEL SECURITY;

-- Allow public read access (footnotes are part of the text, not user data)
CREATE POLICY "Anyone can read footnotes"
  ON text_footnotes FOR SELECT
  USING (true);

-- Add index for quick lookup by chapter
CREATE INDEX idx_text_footnotes_chapter ON text_footnotes(chapter_id, footnote_number);
