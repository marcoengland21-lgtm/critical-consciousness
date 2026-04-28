-- L1 V1b — group_role enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'group_role')
ORDER BY enumsortorder;
-- Expected: 2 rows — host, member.
