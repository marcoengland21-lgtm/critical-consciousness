-- Glossary seed: Chapter 1 essential vocabulary
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
-- This uses the admin user's ID for created_by.
-- It will find the first admin user in the profiles table.
-- It looks up reading_schedule week UUIDs by week_number.
-- Terms use ON CONFLICT (term) DO NOTHING so it's safe to run multiple times.

-- Ensure unique constraint on term (needed for ON CONFLICT)
ALTER TABLE glossary_entries
  ADD CONSTRAINT IF NOT EXISTS glossary_entries_term_unique UNIQUE (term);

DO $$
DECLARE
  admin_id UUID;
  week1_id UUID;
  week2_id UUID;
  week3_id UUID;
  week4_id UUID;
BEGIN
  -- Get the admin user's ID
  SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found. Create an admin account first.';
  END IF;

  -- Look up week UUIDs from reading_schedule
  SELECT id INTO week1_id FROM reading_schedule WHERE week_number = 1 LIMIT 1;
  SELECT id INTO week2_id FROM reading_schedule WHERE week_number = 2 LIMIT 1;
  SELECT id INTO week3_id FROM reading_schedule WHERE week_number = 3 LIMIT 1;
  SELECT id INTO week4_id FROM reading_schedule WHERE week_number = 4 LIMIT 1;

  -- Chapter 1, Section 1 terms
  INSERT INTO glossary_entries (term, definition, first_appearance_week, related_terms, created_by)
  VALUES
    ('Commodity', 'A commodity is, first of all, an external object, a thing which through its qualities satisfies human needs of whatever kind. It is the elementary form of wealth in capitalist society — the form in which products of human labour enter exchange. Every commodity has both a use-value and an exchange-value.', week1_id, ARRAY['use-value', 'exchange-value', 'value'], admin_id),
    ('Use-Value', 'The usefulness of a thing — the way it satisfies some human need, whether "from the stomach, or from fancy." Use-values are qualitative and specific: bread nourishes, a coat warms. A use-value is realised only in consumption. In capitalist society, use-values also serve as the material bearers of exchange-value.', week1_id, ARRAY['commodity', 'exchange-value'], admin_id),
    ('Exchange-Value', 'The quantitative proportion in which use-values of one kind exchange for use-values of another kind. It appears first as something accidental and relative. But behind these fluctuating exchange ratios lies something common to all commodities: value, measured by the labour-time socially necessary for their production.', week1_id, ARRAY['commodity', 'use-value', 'value'], admin_id),
    ('Value', 'The common substance that makes commodities commensurable in exchange. Value is determined by the quantity of labour socially necessary for the production of a commodity — measured in units of labour-time. Value is not a natural property of things but a social relation that appears as a property of things.', week1_id, ARRAY['exchange-value', 'socially necessary labour time', 'abstract labour'], admin_id)
  ON CONFLICT (term) DO NOTHING;

  -- Chapter 1, Section 2 terms
  INSERT INTO glossary_entries (term, definition, first_appearance_week, related_terms, created_by)
  VALUES
    ('Abstract Labour', 'Labour considered apart from its specific useful form — not weaving or tailoring but "human labour in the abstract," the expenditure of human brains, muscles, nerves. Abstract labour is what all different kinds of labour have in common, and it is the substance of value. This is one of Marx''s most original and contested concepts.', week2_id, ARRAY['concrete labour', 'value', 'socially necessary labour time'], admin_id),
    ('Concrete Labour', 'Labour in its specific useful form — tailoring, weaving, spinning, etc. Concrete labour produces use-values. The same act of labour is simultaneously concrete (producing a specific useful thing) and abstract (contributing to value as expenditure of human labour power in general). This "twofold character" of labour is what Marx calls "the pivot on which a clear comprehension of political economy turns."', week2_id, ARRAY['abstract labour', 'use-value', 'labour-power'], admin_id),
    ('Socially Necessary Labour Time', 'The labour-time required to produce any use-value under the conditions of production normal for a given society and with the average degree of skill and intensity of labour prevalent at the time. This determines the magnitude of a commodity''s value. Individual producers who take longer than socially necessary create no more value than those who are faster.', week2_id, ARRAY['value', 'abstract labour', 'magnitude of value'], admin_id),
    ('Magnitude of Value', 'The quantitative measure of value, determined by the amount of socially necessary labour time embodied in a commodity. As productivity increases, less labour is needed to produce each unit, so the magnitude of value per commodity falls — even as more use-values are created. "The value of a commodity is related to the labour-time necessary for its production."', week2_id, ARRAY['value', 'socially necessary labour time'], admin_id)
  ON CONFLICT (term) DO NOTHING;

  -- Chapter 1, Section 3 terms (the value-form — hardest section)
  INSERT INTO glossary_entries (term, definition, first_appearance_week, related_terms, created_by)
  VALUES
    ('Value-Form', 'The form in which value appears or expresses itself. Value cannot express itself directly — it needs another commodity to serve as its mirror. The analysis of the value-form traces how simple barter between two commodities develops, through expanded and general forms, into the money-form. This section is notoriously difficult but reveals how money is not arbitrary but a necessary product of the commodity form itself.', week3_id, ARRAY['relative form of value', 'equivalent form', 'money-form'], admin_id),
    ('Relative Form of Value', 'In an expression like "20 yards of linen = 1 coat," the linen is in the relative form of value — it expresses its value in terms of the coat. The commodity in the relative form actively expresses its value, but cannot do so except by referring to another commodity. A commodity cannot express its value in terms of itself.', week3_id, ARRAY['equivalent form', 'value-form'], admin_id),
    ('Equivalent Form', 'In "20 yards of linen = 1 coat," the coat is in the equivalent form — its body serves as the mirror of the linen''s value. The equivalent form has the peculiarity that use-value becomes the form of appearance of its opposite, value. Concrete labour becomes the form of appearance of abstract labour. Private labour takes the form of directly social labour.', week3_id, ARRAY['relative form of value', 'value-form', 'universal equivalent'], admin_id),
    ('Universal Equivalent', 'A single commodity that all other commodities use to express their value — the commodity excluded from the world of commodities to serve as the general mirror of value. Historically, gold became the universal equivalent. Every commodity says: "My value is expressed in gold." This is the genesis of the money-form.', week3_id, ARRAY['equivalent form', 'money-form', 'value-form'], admin_id),
    ('Money-Form', 'The fully developed form of value where one commodity (historically gold) serves as the universal equivalent — the form in which all commodities express their value. Money is not a technical invention or social convention but the necessary result of the contradictions within the commodity form itself. "Money necessarily crystallises out of the process of exchange."', week3_id, ARRAY['universal equivalent', 'commodity', 'value-form'], admin_id)
  ON CONFLICT (term) DO NOTHING;

  -- Chapter 1, Section 4 terms
  INSERT INTO glossary_entries (term, definition, first_appearance_week, related_terms, created_by)
  VALUES
    ('Commodity Fetishism', 'The process by which social relations between people appear as relations between things. When we say "this commodity is worth £10," we treat value as a natural property of the object rather than a social relation. The products of labour "appear as autonomous figures endowed with a life of their own." Marx compares this to religion, where "the products of the human brain appear as autonomous figures." This is not mere illusion — it is a real social process.', week4_id, ARRAY['commodity', 'value', 'value-form'], admin_id),
    ('Labour-Power', 'The capacity or ability to labour — as distinct from labour itself. Labour-power is what the worker sells to the capitalist. It is itself a commodity with a value (determined by the cost of the worker''s subsistence). The distinction between labour and labour-power is crucial to Marx''s theory of exploitation: the capitalist buys labour-power but extracts more labour than the value of that labour-power.', week1_id, ARRAY['commodity', 'value', 'abstract labour'], admin_id)
  ON CONFLICT (term) DO NOTHING;

  RAISE NOTICE 'Glossary seeded with % Chapter 1 terms.', 15;
END $$;
