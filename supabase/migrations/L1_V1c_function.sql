-- L1 V1c — is_group_member function shape
SELECT proname, provolatile, prosecdef
FROM pg_proc WHERE proname = 'is_group_member';
-- Expected: 1 row, provolatile = 's' (stable), prosecdef = true (security definer).
