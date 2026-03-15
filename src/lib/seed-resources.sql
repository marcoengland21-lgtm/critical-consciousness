-- Seed essential resources for the Capital Study Group
-- Run once via Supabase SQL editor. Uses ON CONFLICT (url) to be idempotent.
-- Requires the admin user (Marco) to exist in profiles.

-- Ensure unique constraint on url (needed for ON CONFLICT)
ALTER TABLE resources
  ADD CONSTRAINT IF NOT EXISTS resources_url_unique UNIQUE (url);

DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found — skipping seed';
    RETURN;
  END IF;

  -- Primary Texts
  INSERT INTO resources (title, url, description, resource_type, created_by) VALUES
    ('Capital, Volume I — Full Text (Marxists.org)', 'https://www.marxists.org/archive/marx/works/1867-c1/', 'The complete text of Capital, Volume I in the Ben Fowkes translation. The standard English edition used by most study groups.', 'primary_text', admin_id),
    ('Capital, Volume I — PDF (Marxists.org)', 'https://www.marxists.org/archive/marx/works/download/pdf/Capital-Volume-I.pdf', 'Downloadable PDF of Capital, Volume I for offline reading and annotation.', 'primary_text', admin_id)
  ON CONFLICT (url) DO NOTHING;

  -- Companion Texts
  INSERT INTO resources (title, url, description, resource_type, created_by) VALUES
    ('David Harvey — Reading Capital (Lecture Series)', 'https://davidharvey.org/reading-capital/', 'David Harvey''s legendary lecture series walking through Capital chapter by chapter. The most accessible companion — start here if you''re new.', 'companion', admin_id),
    ('David Harvey — A Companion to Marx''s Capital', 'https://www.versobooks.com/en-gb/products/89-a-companion-to-marx-s-capital', 'The book version of Harvey''s lecture series. Chapter-by-chapter guide through Volume I.', 'companion', admin_id),
    ('Michael Heinrich — An Introduction to the Three Volumes of Marx''s Capital', 'https://monthlyreview.org/product/an-introduction-to-the-three-volumes-of-karl-marxs-capital/', 'The most rigorous companion for early chapters. Heinrich is especially strong on the value-form and commodity fetishism. German school of Marx interpretation.', 'companion', admin_id),
    ('Harry Cleaver — Reading Capital Politically', 'https://libcom.org/article/reading-capital-politically-harry-cleaver', 'An autonomist/workerist reading of Capital. Emphasises working-class resistance and struggle. A useful counterpoint to Harvey''s more academic approach.', 'companion', admin_id),
    ('East Bay DSA — Capital Reading Group Syllabus', 'https://dsa-lsc.org/2018/07/02/reading-capital-with-comrades-a-chapter-by-chapter-guide/', 'The best freely available study guide. Allocates 5 weeks to Chapter 1 alone — normalises the difficulty. Good discussion questions for each chapter.', 'companion', admin_id)
  ON CONFLICT (url) DO NOTHING;

  -- Lectures
  INSERT INTO resources (title, url, description, resource_type, created_by) VALUES
    ('David Harvey — Reading Marx''s Capital Vol 1 (YouTube)', 'https://www.youtube.com/playlist?list=PL0A7FFF28B99C1303', 'Full playlist of Harvey''s video lectures. 13 classes, ~2 hours each. Essential viewing, especially for Chapter 1.', 'lecture', admin_id),
    ('Brendan Cooney — Kapitalism 101 (Video Series)', 'https://kapitalism101.wordpress.com/law-of-value-the-series/', 'Animated video series explaining core concepts from Capital. Excellent visual explanations of use-value, exchange-value, abstract labour, and the value-form.', 'lecture', admin_id),
    ('Michael Heinrich — Chapter 1 Lecture (YouTube)', 'https://www.youtube.com/watch?v=UwPbF8sD0II', 'Heinrich''s lecture on Chapter 1 of Capital. More rigorous than Harvey on the value-form. Watch after Harvey if you want deeper understanding.', 'lecture', admin_id)
  ON CONFLICT (url) DO NOTHING;

  -- Articles
  INSERT INTO resources (title, url, description, resource_type, created_by) VALUES
    ('Marx''s Prefaces and Afterwords to Capital', 'https://www.marxists.org/archive/marx/works/1867-c1/p1.htm', 'Marx''s own prefaces to the various editions, plus the important Afterword to the Second Edition. Essential context for understanding his method.', 'article', admin_id),
    ('Diane Elson — The Value Theory of Labour', 'https://homepages.warwick.ac.uk/~syrbe/pubs/Elson.pdf', 'Influential essay arguing Marx develops a "value theory of labour" not a "labour theory of value." Reframes the entire project.', 'article', admin_id)
  ON CONFLICT (url) DO NOTHING;

  -- Tools
  INSERT INTO resources (title, url, description, resource_type, created_by) VALUES
    ('Marxists.org — Encyclopaedia of Marxism', 'https://www.marxists.org/glossary/index.htm', 'Comprehensive glossary of Marxist terms. Useful when you encounter a concept Marx assumes you know (e.g., Hegel''s dialectic, Ricardo''s theory of rent).', 'tool', admin_id),
    ('Capital Study Group Platform', 'https://capitalstudygroup.netlify.app/', 'This platform! Read the text, annotate together, discuss in threads, and build our shared glossary.', 'tool', admin_id)
  ON CONFLICT (url) DO NOTHING;

  RAISE NOTICE 'Seeded % resources successfully', 14;
END $$;
