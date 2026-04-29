# Bugs surfaced and fixed during recurring-v1 verification

Two issues caught during V3b → V5 walks. Both fixed mid-verification
and the affected phases re-run cleanly post-fix.

## 1. Admin URL override silently failed on /schedule, /reading, /glossary, /threads/new

### Symptom

V3b (christchurch-capital host configured view via
`/schedule?group=christchurch-capital`) initially rendered
Watermelon's pre-seed empty state instead of christchurch-capital's
configured state. SystemStatusStrip showed "Watermelon · Reading
journey not yet started" and the page banner showed "This group
hasn't started reading yet."

### Diagnosis

The four affected pages didn't pass `searchParams` through to
`getCurrentGroup`. The resolver's URL override step requires
`searchParams` to read the `?group=` value; without it, the
override was silently skipped and the resolver fell through to
Mars's stored `current_group_id` (Watermelon).

Pre-fix audit by grep:

| Page | searchParams plumbing |
|---|---|
| /dashboard | ✓ (already had it) |
| /threads | ✓ (already had it for type/chapter filters) |
| /schedule | ✗ |
| /reading | ✗ |
| /glossary | ✗ |
| /threads/new | ✗ |

Pre-existing gap (not introduced by sub-batch 5 specifically), but
it blocked the verification walks and is a real bug in the admin
override pattern.

### Fix

Commit `48ee78e` ("Fix: admin URL override (?group=<slug>) now
works on schedule, reading, glossary, threads/new") added
searchParams plumbing to the four pages. Pure plumbing, no schema
or data changes, tsc clean.

### Re-verification

After commit + Netlify deploy, V3b retried on a FRESH tab and
passed — configured state rendered correctly with christchurch-
capital banner, host controls populated, "· current" suffix on
the chapter dropdown.

The original tab continued to render Watermelon — Next.js RSC
client cache held the pre-fix output across multiple navigations
within the same tab. Fresh tab confirmed override works.

### Known follow-up

`/journal/new/page.tsx` was NOT in this fix and still has the
override gap. Surfaced during V11 site 4 verification. Effect:
GlossaryModal queries the wrong group's glossary when opened with
`?group=` URL override. Functional behavior correct for resolved
group; override path broken. Queued for the small follow-up
commit before Brief 1 starts.


## 2. 007 RPCs missing from production schema cache

### Symptom

V5 step 3 (click Advance to commit chapter advance) returned the
error message rendered on the schedule page:

> Could not find the function public.advance_chapter(p_group_id, p_new_chapter_id) in the schema cache

### Diagnosis

Diagnostic SQL on `pg_proc`:

```sql
SELECT proname, pg_get_function_arguments(oid), prosecdef
FROM pg_proc
WHERE proname IN ('advance_chapter', 'set_group_started_at', 'set_group_session_timing')
ORDER BY proname;
```

Result: 1 row only — `set_group_session_timing` (010 RPC). Both
007 RPCs (`advance_chapter` + `set_group_started_at`) were
missing from production.

Root cause: 007's paired-test loop got truncated. The forward
created the RPCs, the rollback dropped them, but the FORWARD
re-application (the final step that should leave the RPCs
present) wasn't executed. The "both done" message in the
session was sent before the rollback-then-forward loop completed.

That 006 + 010 schemas were applied AND the V2 query showed
christchurch-capital had `started_at` set is a coincidence —
`started_at` was set via direct UPDATE during 006 seed steps,
not via the (then-missing) `set_group_started_at` RPC.

### Fix

Re-applied 007 forward via SQL editor:
- Dropped + recreated both functions (atomic deploy, idempotent)
- Granted EXECUTE to authenticated
- Committed
- `NOTIFY pgrst, 'reload schema';` to refresh PostgREST schema cache

Post-fix `pg_proc` query:

| proname | arguments | is_security_definer |
|---|---|---|
| advance_chapter | p_group_id uuid, p_new_chapter_id uuid | true |
| set_group_session_timing | p_group_id uuid, p_next_session_at timestamp with time zone, p_recurrence text | true |
| set_group_started_at | p_group_id uuid, p_started_at date | true |

All three RPCs present, correct signatures, SECURITY DEFINER.

### Re-verification

V5 retried after the fix:
- Step 1 (select Ch2): PASS
- Step 2 (Apply): PASS, confirmation prompt shown
- Step 3 (Advance): PASS, chapter advanced, history row written
- Steps 4-5 (dashboard + reading ripple): PASS
- Step 6 (advance back): PASS, second history row written
- Final state: christchurch-capital restored to Ch1§4 with two
  permanent history rows preserving the test record

### Process note

The L1 process notes in CLAUDE.md already cover this discipline:
"rollback-then-forward as a paired test on every migration before
the migration is 'done' — running forward without ever testing
rollback is the precondition that bit L1, and avoiding it is
independent of whether the test happens on a branch or on main."

The 007 incident is the case study showing the inverse failure
mode: rollback gets executed without forward re-applied. The
discipline rule is the same — paired test ENDS with the migration
in the intended state (forward applied), not just rolled back.

To capture in the CLAUDE.md ship-clean update for recurring-v1:
the "rollback-then-forward as paired test" rule has two failure
modes, not one — forward-without-rollback (L1) and
rollback-without-forward (007). Both need explicit confirmation
that the LAST step is the intended end-state.
