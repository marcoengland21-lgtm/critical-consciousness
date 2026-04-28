-- ====================================================================
-- L1 V3 — RPCs updated to new signatures
-- ====================================================================
-- Run AFTER V2 passes. Receipt for the audit-completeness assertion:
-- the old 2-arg signatures must NOT exist; only the new 3-arg signatures
-- with p_group_id should be callable.
-- ====================================================================

SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc WHERE proname IN ('increment_confusion', 'decrement_confusion')
ORDER BY proname, pg_get_function_arguments(oid);
-- Expected: 2 rows (one for each function).
-- Each row's pg_get_function_arguments output MUST contain `p_group_id uuid`
-- (alongside p_chapter_id uuid and p_paragraph_index integer).
--
-- If you see EITHER:
--   - a row with arguments that do NOT contain p_group_id (the 2-arg
--     version is still alive — DROP step didn't run)
--   - more than 2 rows (both old and new signatures coexist)
-- STOP and surface. V3 is the receipt that the audit-completeness
-- assertion holds; if it fails, callers in production could silently
-- write confusion counts to the wrong group.
