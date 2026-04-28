# L1 Multi-tenancy Verification

This doc is the spec for verifying migration `005_l1_multitenancy.sql` before
declaring L1 done. It is also the rollback plan if any check fails.

Read it once end-to-end before applying the migration. Do not skip the
two-user RLS test — that is the whole point of L1.

---

## What L1 changes (one paragraph)

Before L1: schema was multi-tenant (group_id columns existed) but the
application was effectively single-tenant. No reads filtered by group_id.
RLS policies on group-scoped tables were `USING (true)` (set in 003/004 for
the guest-reviewer access window). A `DEFAULT_GROUP_ID` constant pinned
every write to one group.

After L1: a new `group_memberships` table (renamed from `group_members`)
defines who belongs to which group with what role (`host`/`member`).
A `is_group_member(group_id)` SQL helper drives RLS. Every group-scoped
SELECT requires membership; every INSERT/UPDATE/DELETE requires both
membership AND author/creator-id parity. A server-side `getCurrentGroup()`
resolver replaces `DEFAULT_GROUP_ID` and lets a user belong to multiple
groups (admin can override via `?group=slug` URL param). Watermelon is
seeded as the launch group (UUID `00000000-0000-0000-0000-000000000002`);
the existing test group (`...001`) is preserved with Mars as host on both.

Inherited tables (`replies`, `annotation_replies`, `glossary_versions`,
`glossary_comments`, `concept_edges`, `thread_branches`) get denormalized
`group_id` columns plus BEFORE INSERT/UPDATE triggers enforcing
`child.group_id = parent.group_id`. RPCs `increment_confusion` and
`decrement_confusion` get a new `p_group_id` parameter; old-signature
calls fail with "function does not exist" so any caller missed in the
read-query audit surfaces immediately rather than silently writing to
the wrong group.

---

## Pre-deploy checklist

Before touching production:

1. **Branch the database.** Use Supabase branching to create a preview
   branch off `main`. The Free tier supports this; preview branches
   replicate the production schema. Do all verification on the preview
   branch first.
2. **Snapshot the production database.** From the Supabase dashboard
   → Database → Backups, ensure a recent backup exists. If none exists
   in the last 24 hours, trigger one before proceeding.
3. **Confirm the application has been built.** Run `npm run build`
   locally — the L1 read-query audit + filter additions should compile
   clean. If any TypeScript error mentions a missing `groupId` prop, fix
   that before deploying the migration.
4. **Read the migration end-to-end.** It is intentionally readable top to
   bottom; the section comments explain each step.
5. **Have the rollback file open in a tab.** `005_l1_multitenancy_rollback.sql`.
   You may need it within seconds of running the forward migration if
   something has gone wrong.

---

## Migration deployment

In Supabase SQL Editor on the **preview branch** (not production yet):

```sql
-- Run the forward migration in one transaction. It is idempotent for
-- column-add/IF NOT EXISTS steps but the table-rename is not — a second
-- run will fail at the rename. That's intentional: re-running is a bug.
\i 005_l1_multitenancy.sql
```

Expected output: `COMMIT` at the end with no errors.

Then run the verification queries below.

If everything passes on the preview branch, repeat on production. Do
production during low-traffic hours (NZ time, 2am–6am Pacific/Auckland),
since the policy DROP/CREATE cycle briefly rejects writes.

---

## Verification

### V1 — schema present

```sql
-- group_memberships table exists with the expected columns.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'group_memberships'
ORDER BY ordinal_position;
-- Expect: id, user_id, group_id, role (group_role enum), joined_at.

-- group_role enum has 'host' and 'member' values.
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'group_role')
ORDER BY enumsortorder;
-- Expect: host, member.

-- is_group_member function exists, is STABLE + SECURITY DEFINER.
SELECT proname, provolatile, prosecdef
FROM pg_proc WHERE proname = 'is_group_member';
-- Expect: provolatile = 's' (stable), prosecdef = true.

-- group_id columns added to every inheritor table.
SELECT table_name FROM information_schema.columns
WHERE column_name = 'group_id'
  AND table_name IN ('confusion_counts', 'invite_codes', 'replies',
                     'annotation_replies', 'glossary_versions',
                     'glossary_comments', 'concept_edges', 'thread_branches');
-- Expect all 8 rows.
```

### V2 — Watermelon seeded, Mars on both groups

```sql
-- Watermelon group exists with the expected UUID.
SELECT id, name, slug FROM groups
WHERE id = '00000000-0000-0000-0000-000000000002';
-- Expect: 1 row, name='Watermelon', slug='watermelon'.

-- Test group preserved.
SELECT id, name FROM groups
WHERE id = '00000000-0000-0000-0000-000000000001';
-- Expect: 1 row.

-- Mars is host on BOTH groups.
SELECT g.name, gm.role
FROM group_memberships gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
WHERE p.role = 'admin'
ORDER BY g.created_at;
-- Expect: 2 rows, both with role='host'.
```

### V3 — RPCs updated to new signatures

```sql
-- Old (2-arg) signatures should NOT exist.
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc WHERE proname IN ('increment_confusion', 'decrement_confusion');
-- Expect: 2 rows, each with arguments containing `p_group_id uuid`.
-- If you see a 2-arg version still listed, something went wrong with
-- the DROP — review and re-run that section.
```

### V4 — RLS test (the critical one)

This is the test that catches a leak. Run it as an authenticated user
context, not as service_role.

Setup: create two test users, each member of exactly one group:

```sql
-- In Supabase Auth UI or via service_role:
--   user_alpha@example.test  → group ...001 only
--   user_beta@example.test   → group ...002 only

-- Then in SQL editor with `SET LOCAL ROLE authenticated; SET LOCAL
-- request.jwt.claim.sub = '<user_alpha uuid>';` simulate alpha:

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<user_alpha-uuid>';

-- Alpha should NOT be able to read any thread in group ...002.
SELECT count(*) FROM threads WHERE group_id = '00000000-0000-0000-0000-000000000002';
-- Expect: 0.

-- Alpha should NOT be able to write a thread to group ...002.
INSERT INTO threads (title, body, thread_type, author_id, group_id)
VALUES ('test', 'test', 'discussion',
        '<user_alpha-uuid>',
        '00000000-0000-0000-0000-000000000002');
-- Expect: ERROR — new row violates row-level security policy.

-- Reset, switch to Mars (member of both):
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<mars-uuid>';

-- Mars CAN read threads from both groups.
SELECT group_id, count(*) FROM threads GROUP BY group_id;
-- Expect: both UUIDs visible (where threads exist).
```

If V4 passes — Alpha cannot see Beta's data, cannot write into Beta's
group, and Mars can see both — RLS is working.

### V5 — application smoke test

In the running app (preview deployment if available), with two browser
profiles:

1. Sign in as `user_alpha`. Navigate to `/threads`, `/glossary`,
   `/schedule`, `/dashboard`. Confirm group name in `<SystemStatusStrip>`
   reads "GROUP ONE" (or whatever name is set on group ...001) and ONLY
   that group's content is visible.
2. Sign in as `user_beta` in another browser profile. Confirm group name
   reads "WATERMELON" and ONLY that group's content is visible. Notably,
   if `user_alpha` posted a thread, `user_beta` MUST NOT see it.
3. Sign in as Mars (admin). Confirm both groups are accessible:
   default landing shows the active group from `profiles.current_group_id`;
   appending `?group=watermelon` switches to Watermelon, `?group=test-group`
   switches back. Confirm switching is gated to admin (a non-admin URL-
   override attempt should silently ignore the param).

### V6 — screenshot record

Take screenshots for the post-launch record:

- Alpha's `/threads` (showing only Alpha's group threads).
- Beta's `/threads` (showing only Beta's group threads — different content).
- Mars on Watermelon (`?group=watermelon`).
- Mars on test group (`?group=test-group`).
- The RLS error message from the V4 INSERT attempt.

Save them in `docs/L1_VERIFICATION_RECORD/` (create the folder).

---

## Rollback

If any verification step fails on the **preview branch**, abort and
investigate. Do not promote a failed migration to production.

If a failure surfaces on **production after deploy**, rollback immediately:

```sql
\i 005_l1_multitenancy_rollback.sql
```

The rollback file:

1. Drops the new RLS policies.
2. Restores `USING (true)` policies on group-scoped tables (matching the
   003/004 state).
3. Drops the membership-derived indexes.
4. Removes the Watermelon row.
5. Drops the trigger functions enforcing child/parent group_id parity.
6. Drops the new group_id columns from the inheritor tables (data loss
   for any rows written between forward migration and rollback — but
   those rows are still queryable via author_id/created_by; only the
   group_id metadata is lost).
7. Drops the `is_group_member` function.
8. Renames `group_memberships` back to `group_members` and reverts the
   role column type.
9. Drops the `group_role` enum.

After rollback, the app reverts to the pre-L1 behaviour: every read sees
every group, single-group writes via DEFAULT_GROUP_ID. To restore
DEFAULT_GROUP_ID code-side, revert the application commit that retired it.

If the production rollback also fails (e.g. data inconsistency between
parent and child rows blocks the trigger drop), restore from the backup
taken in the pre-deploy checklist.

---

## Post-launch monitoring (first 48 hours)

Watch for:

- `[CCP]` console errors mentioning RLS or `policy violation` — these
  are user-facing failures from a missed group filter or wrong group
  context.
- Slow queries in Supabase Logs > Postgres > Slow queries — if any
  group-scoped table query suddenly runs slow, confirm the new index
  on `(group_id, ...)` is being used (`EXPLAIN ANALYZE`).
- Any row in `confusion_counts`, `replies`, `annotation_replies`,
  `glossary_versions`, `glossary_comments`, `concept_edges`,
  `thread_branches` with NULL `group_id`. Run hourly:

```sql
SELECT 'confusion_counts' AS t, count(*) FROM confusion_counts WHERE group_id IS NULL
UNION ALL
SELECT 'replies', count(*) FROM replies WHERE group_id IS NULL
UNION ALL
SELECT 'annotation_replies', count(*) FROM annotation_replies WHERE group_id IS NULL
UNION ALL
SELECT 'glossary_versions', count(*) FROM glossary_versions WHERE group_id IS NULL
UNION ALL
SELECT 'glossary_comments', count(*) FROM glossary_comments WHERE group_id IS NULL
UNION ALL
SELECT 'concept_edges', count(*) FROM concept_edges WHERE group_id IS NULL
UNION ALL
SELECT 'thread_branches', count(*) FROM thread_branches WHERE group_id IS NULL;
```

All counts must stay zero. If any becomes non-zero, an INSERT path
was missed — find it via the row's `created_by`/`author_id` and the
`created_at` timestamp.

---

## Files of record

- `supabase/migrations/005_l1_multitenancy.sql` — forward migration
- `supabase/migrations/005_l1_multitenancy_rollback.sql` — rollback
- `src/lib/group-resolver.ts` — server-side group resolver
- `CLAUDE.md` — needs an L1 entry in the Decision Log after verification
  passes (deferred until V1–V6 all green).
