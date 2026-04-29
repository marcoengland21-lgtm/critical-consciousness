-- 012_watermelon_invite_code_rollback.sql
--
-- Rollback for 012_watermelon_invite_code.sql. Removes the
-- WATERMELON26 invite_codes row.
--
-- Side effect: if the code has been used (use_count > 0), the
-- increment history is lost — but the membership rows already
-- created via that code remain intact (no FK from group_memberships
-- back to invite_codes). Members keep their access; the rollback
-- only removes the gateway, not the gates already passed through.

DELETE FROM invite_codes WHERE code = 'WATERMELON26';
