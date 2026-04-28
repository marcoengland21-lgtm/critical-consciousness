-- ====================================================================
-- L1 V1 — Schema present
-- ====================================================================
-- Run AFTER the forward migration (005_l1_multitenancy.sql) on the
-- preview branch. Confirms the schema-level pieces are in place.
--
-- Expected outputs are documented under each query.
-- Paste the full output back to Claude when done.
-- ====================================================================

-- 1a. group_memberships table shape
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'group_memberships'
ORDER BY ordinal_position;
-- Expected rows: id (uuid), user_id (uuid), group_id (uuid),
-- role (USER-DEFINED — group_role), joined_at (timestamp with time zone).


-- 1b. group_role enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'group_role')
ORDER BY enumsortorder;
-- Expected: 2 rows — host, member.


-- 1c. is_group_member function shape
SELECT proname, provolatile, prosecdef
FROM pg_proc WHERE proname = 'is_group_member';
-- Expected: 1 row, provolatile = 's' (stable), prosecdef = true.


-- 1d. group_id columns on every inheritor table
SELECT table_name FROM information_schema.columns
WHERE column_name = 'group_id'
  AND table_name IN ('confusion_counts', 'invite_codes', 'replies',
                     'annotation_replies', 'glossary_versions',
                     'glossary_comments', 'concept_edges', 'thread_branches')
ORDER BY table_name;
-- Expected: 8 rows — annotation_replies, concept_edges, confusion_counts,
-- glossary_comments, glossary_versions, invite_codes, replies, thread_branches.
