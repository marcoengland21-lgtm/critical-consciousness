# L1 verification record

Evidence for the L1 multi-tenancy migration verification, captured against
the production `main` branch on 2026-04-28.

## Database-layer verification (complete)

| File                          | What it proves                                                          | Status |
|-------------------------------|-------------------------------------------------------------------------|--------|
| `V1_schema.txt`               | group_memberships table, group_role enum, is_group_member function, group_id columns on all 8 inheritor tables | Pass |
| `V2_seed.txt`                 | Watermelon row exists, test group preserved, Mars host on both, current_group_id defaults to Watermelon | Pass |
| `V3_rpc_signatures.txt`       | Confusion RPCs take p_group_id; old 2-arg signatures are gone           | Pass |
| `V4_test_user_wiring.txt`     | alpha → test group only, beta → Watermelon only, both with resolver landing match | Pass |
| `V4_alpha_reads.txt`          | alpha cannot read Watermelon data (RLS blocks cross-group SELECT)       | Pass |
| `V4_alpha_writes.txt`         | alpha cannot write into Watermelon (RLS blocks cross-group INSERT)      | Pass |
| `V4_beta_reads.txt`           | beta cannot read test-group data (RLS blocks cross-group SELECT)        | Pass |
| `V4_beta_writes.txt`          | beta cannot write into test-group (RLS blocks cross-group INSERT)       | Pass |

V4 is the load-bearing structural proof: RLS at the database layer
prevents cross-group reads AND writes in BOTH directions. The
schema-vs-application gap is closed at the database layer.

## Application-layer verification (V5 — pending)

V5 confirms the application correctly scopes its queries through the RLS
layer. To run:

1. Mars logs in as user_alpha at https://capitalstudygroup.netlify.app
2. Claude drives Chrome MCP to walk routes (dashboard, threads, glossary,
   reading, schedule, resources). Confirms SystemStatusStrip shows
   "Christchurch Capital Reading Group" and only test-group data is
   visible.
3. Mars logs out, logs in as user_beta. Same drill. Expected:
   SystemStatusStrip shows "Watermelon", only Watermelon data visible
   (currently empty since Watermelon is fresh).
4. Screenshots saved here.

## Process notes (carry into CLAUDE.md Decision Log post-ship)

From the second-opinion review:

- **Pre-flight grep applies to every table referenced in DDL**, not just
  the obvious ones. The L1 forward migration referenced `confusion_flags`
  which didn't exist in the live DB; caught at first run when migration
  errored. Fixed with a `DO ... IF EXISTS` conditional. The lesson is
  to grep the live schema for every table touched by DDL before writing
  the migration.
- **Branching is for rollback verification, not just data safety.** L1
  ran on production directly because the platform is pre-launch and
  the data risk was minimal. Cost: rollback path is now untested for
  L1 (and we can't test it without losing dev data). For future
  migrations, branch first regardless of data risk.
- **Tool-limitation iteration must change shape.** When the Supabase SQL
  editor was hiding intermediate results behind later errors, the first
  three workarounds were variations of the same shape (highlight-and-run).
  The fix that worked was splitting into single-block files where each
  file contains exactly the one query whose result we wanted to see.
- **Runbooks make dependencies explicit.** The V4 wiring SQL silently
  no-op'd when run before the test users existed. A "confirm users in
  Auth → Users before running wiring" check would have caught it.
- **"Wanting to move on" at the end of a session is a real bias to flag.**
  Mid-session I tried to declare V4 verified based on one direction +
  symmetric policy structure. The second opinion correctly pushed back:
  evidence-based completeness is the verification doc's standard, not
  argument-based sufficiency. Captured both directions directly.

## Migration files of record

- `supabase/migrations/005_l1_multitenancy.sql` (forward, patched with
  the `confusion_flags` IF EXISTS conditional)
- `supabase/migrations/005_l1_multitenancy_rollback.sql` (rollback,
  patched same way)
- `supabase/migrations/005_L1_VERIFICATION.md` (the verification doc
  this record is the evidence for)

## Deviations from plan (accepted, documented)

- **Ran on production main, not preview branch.** Pre-launch state, only
  Mars's dev/test data at risk. Rollback test step skipped as a
  consequence.
- **Migration patched mid-flight to handle the missing `confusion_flags`
  table.** Both forward and rollback files updated; the patched versions
  are now the source of truth.
