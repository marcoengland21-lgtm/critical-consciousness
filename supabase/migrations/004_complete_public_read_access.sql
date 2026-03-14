-- Complete public read access for all content tables.
-- Allows the app to use the regular anon client instead of the admin/service-role client.
-- Write operations still require authentication via existing INSERT/UPDATE/DELETE policies.

-- Reading schedule and related
DROP POLICY IF EXISTS "reading_schedule_select" ON reading_schedule;
CREATE POLICY "reading_schedule_select" ON reading_schedule FOR SELECT USING (true);

DROP POLICY IF EXISTS "weekly_roles_select" ON weekly_roles;
CREATE POLICY "weekly_roles_select" ON weekly_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "discussion_prompts_select" ON discussion_prompts;
CREATE POLICY "discussion_prompts_select" ON discussion_prompts FOR SELECT USING (true);

-- Text content
DROP POLICY IF EXISTS "text_documents_select" ON text_documents;
CREATE POLICY "text_documents_select" ON text_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "text_chapters_select" ON text_chapters;
CREATE POLICY "text_chapters_select" ON text_chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "text_footnotes_select" ON text_footnotes;
CREATE POLICY "text_footnotes_select" ON text_footnotes FOR SELECT USING (true);

-- Community content
DROP POLICY IF EXISTS "glossary_entries_select" ON glossary_entries;
CREATE POLICY "glossary_entries_select" ON glossary_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "resources_select" ON resources;
CREATE POLICY "resources_select" ON resources FOR SELECT USING (true);
