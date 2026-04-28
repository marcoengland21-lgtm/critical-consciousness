-- L1 V1a — group_memberships table column shape
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'group_memberships'
ORDER BY ordinal_position;
-- Expected 5 rows: id (uuid), user_id (uuid), group_id (uuid),
-- role (USER-DEFINED — group_role), joined_at (timestamp with time zone).
