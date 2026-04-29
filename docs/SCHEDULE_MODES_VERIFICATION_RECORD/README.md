# Schedule modes (recurring v1) — verification record

Verification of the recurring-v1 schedule modes piece (commits
`d1b2289` → `00324f3` → `e78cbee` → `e4895f3` → `48ee78e`).

Run on **29 April 2026** (NZ) by Mars driving Cowork via Chrome MCP
against production at `https://capitalstudygroup.netlify.app`.

## Result: V1–V11 PASSED

All eleven verification phases run to completion. Two minor
follow-up items captured during the walks; they do not block
ship-clean and are scoped to a small follow-up commit before
Brief 1 begins.

## Phases

| Phase | What it proves | Method | Status |
|---|---|---|---|
| V1 | Migrations 006–010 schema applied correctly | Per-migration V1 schema-check queries during paired tests | PASS |
| V2 | Watermelon + christchurch-capital schedule state | SQL on `groups` + `text_chapters` join | PASS |
| V3a | Schedule page host pre-seed view (Watermelon) | Chrome MCP read of `/schedule` as Mars | PASS |
| V3b | Schedule page host configured view (christchurch-capital) | Chrome MCP read of `/schedule?group=christchurch-capital` as Mars | PASS (after override-fix commit + 007 RPC re-apply) |
| V4 | Schedule page member view (configured state, no host controls) | Chrome MCP read of `/schedule` as user_alpha | PASS |
| V5 | Advance current chapter — RPC + UI ripple to dashboard + reading | Chrome MCP drive: select Ch2 → Apply → Advance → re-navigate | PASS |
| V6a | Watermelon dashboard orientation absent (pre-seed) | Chrome MCP read of `/dashboard` as Mars (no override) | PASS |
| V6b | christchurch-capital dashboard dual-counter format | Chrome MCP read of `/dashboard?group=christchurch-capital` (covered during V5 ripple) | PASS |
| V7 | Honest empty states on widgets when no current chapter | Chrome MCP read of Watermelon dashboard widgets | PASS |
| V8 | "of 32" / "32 weeks" / "TOTAL_WEEKS" gone from production code | Local grep over `src/` | PASS (one comment-only reference, intentional) |
| V9 | Migrations reversible | Rollback-then-forward paired tests on main per migration | PASS |
| V10 | tsc clean across the application | `npx tsc --noEmit` after each sub-batch | PASS |
| V11 | All 8 current-chapter-aware sites recurring-mode-aware | Chrome MCP per-site walks on christchurch-capital | PASS (1 caveat on /journal/new — see below) |

## Bugs surfaced and fixed during verification

### Override gap on /schedule, /reading, /glossary, /threads/new

V3b initially failed: pre-seed Watermelon empty state rendered
despite `?group=christchurch-capital` URL override. Diagnosis: those
four pages lacked `searchParams` plumbing through to
`getCurrentGroup`, so the resolver couldn't see the override and
fell through to the user's stored `current_group_id`.

Fixed in commit `48ee78e` ("Fix: admin URL override (?group=<slug>)
now works on schedule, reading, glossary, threads/new"). Pure
plumbing, no schema or data changes. Pages already with
`searchParams` plumbing pre-fix: `/dashboard`, `/threads`.

After commit + Netlify deploy, V3b retried on a fresh tab and
passed. Original tab carried RSC client cache from before the fix
and continued to render Watermelon — fresh tab confirmed override
works correctly.

### 007 RPC schema-cache miss

V5 initial Advance click returned the error `Could not find the
function public.advance_chapter(p_group_id, p_new_chapter_id) in
the schema cache`. Diagnostic SQL on `pg_proc` showed only the 010
RPC (`set_group_session_timing`) present; both 007 RPCs
(`advance_chapter` + `set_group_started_at`) were missing.

Most likely cause: 007's paired-test loop was truncated after
running rollback without re-applying forward, leaving the RPCs
dropped from the live DB. The schema (006 columns, history table)
and the 010 RPC were unaffected.

Fixed by re-applying 007 forward via the SQL editor +
`NOTIFY pgrst, 'reload schema'`. Post-fix `pg_proc` query
confirmed all three custom RPCs present with correct signatures
and `is_security_definer = true`.

**Process note for ship-clean update of CLAUDE.md:** paired-test
discipline must end with forward re-applied, not just rollback
executed. Mid-loop interruption that completes the rollback step
without the final forward leaves the DB in an unintended state.
The 007 paired test was reported done without verifying the final
forward re-application against `pg_proc`. The L1 process note
about "rollback-then-forward as paired test before declaring
done" already covers this; the 007 incident is the case study
showing what the discipline gap looks like in practice.

## V5 advance test — two history rows recorded

Per Mars's runbook, V5 advanced Ch1§4 → Ch2 → Ch1§4 to verify the
full advance ripple AND restore clean test state. Two history
rows resulted, both visible in the completed chapters timeline:

1. **Chapter 2: The Process of Exchange** · 1 week · 29 Apr – 29 Apr
2. **Chapter 1, Section 4: The Fetishism of Commodities and the
   Secret Thereof** · 1 week · 28 Apr – 29 Apr

The "1 week" rendering for both stays comes from `weeksBetween`
using `Math.max(1, Math.round(...))` — same-day stays floor to 1
week of attention, matching the design.

End-state: christchurch-capital's `current_chapter_id` restored
to Ch1 §4. Two permanent history rows preserved as honest record.

## Surface-during-build expansions

Captured in chat during the recurring-v1 build, applied by Claude
based on Mars's "small judgment calls per the efficiency shift;
ship with your judgment, surface only if structural" directive:

1. NewThreadForm banner reflects the SELECTED chapter (live-tracking),
   not the resolver's `currentChapterId`. Pinning to currentChapterId
   while allowing override would be a UI lie.

2. ConceptsNotesModal + ChapterConceptSlice swept from
   `first_appearance_week` (broken — `text_chapters.week_id` is
   NULL platform-wide) to `first_appearance_chapter` directly.
   Pre-existing dead-column bug fixed AND post-009 half-state
   prevented in one move.

3. Reading-page item 6 expanded beyond the locked badge swap to
   include completed-chapter signal swap (now sourced from
   `group_chapter_history` instead of `pastWeekIds` from due_date)
   AND part-group highlight swap. Same file, same data anchor —
   leaving 2 + 3 on broken weekId logic = recurring groups see no
   completed markers and no current-part highlight.

4. ChapterConceptSlice updated despite being orphaned (no callers)
   for code-base consistency — leaving stale code invites future
   confusion.

5. `/threads/page.tsx` chapter.week_id-driven `Week N` per-card
   badge swapped to `chapter_id`-driven shortLabel ("Ch 1, Sec 4"
   / "Ch 5"). Same swap pattern.

6. /threads contextual sidebar dropped (item 7b — discussion_prompts
   + weekly_roles surfaced scope-out data). Single-column
   max-w-3xl matches `/threads/new` constraint.

## Known limitations / deferred items

These are real constraints flagged during verification, not
regressions. They do not block ship-clean. Two are scoped to a
small follow-up commit before Brief 1 starts.

### Layout-level SystemStatusStrip can't honor URL override

The `/schedule?group=X` URL override works for the page content,
but the SystemStatusStrip is rendered in the server layout, which
in Next.js App Router does not receive `searchParams`. The strip
always shows the user's stored `current_group_id`. This is a Next.js
App Router behavior, not a recurring-v1 bug. The L4 multi-group
switching UI (queued post-launch) will solve this by changing the
user's stored group rather than relying on URL override for
layout-level surfaces.

### WhereStuckWidget legacy "this week's reading" empty-state copy

Empty-state text in `WhereStuckWidget.tsx` still reads
"No paragraphs flagged in this week's reading yet." Data scope
was correctly swapped to `currentChapterId` in sub-batch 4
item 8 — only the empty-state copy didn't get updated. To
land in follow-up commit.

### /journal/new override gap

The override fix commit (`48ee78e`) covered four pages
(/schedule, /reading, /glossary, /threads/new) but missed
`/journal/new/page.tsx`. The page resolves to the user's stored
group rather than the URL override. Effect on V11 site 4: the
GlossaryModal queries the wrong group's glossary entries when
opened with `?group=` override. Functional behavior is correct
for the resolved group; only the override path is broken. To
land in follow-up commit alongside the WhereStuckWidget copy fix.

### Broader dashboard sweep deferred

Items 7+8 (AttentionMagnitudeBars + WhereStuckWidget) were
scope-locked at brief time. Several other dashboard surfaces
share the same dead-column / current-week pattern but weren't
in the locked list:

- RhythmWidget day-strip (driven by `currentWeek.session_date`)
- Big-stat tile "Wk N" (driven by `currentWeek.week_number`)
- "Next Session: Tue 6pm" tile (driven by
  `currentWeek.session_date`)

These render half-state-broken in recurring v1 (currentWeek is
sourced from `reading_schedule` rows that recurring v1 doesn't
use). Flagged for a future broader dashboard sweep — scope larger
than the recurring-v1 ship-clean follow-up.

## Files

- `V2_db_state.txt` — V2 SQL output
- `V3_V4_schedule_walks.txt` — V3a (Watermelon host pre-seed), V3b
  (christchurch-capital host configured, post-fix), V4 (alpha
  member of christchurch-capital + beta member of Watermelon)
- `V5_advance_ripple.txt` — V5 advance Ch1§4 → Ch2 → Ch1§4 evidence
  (schedule + dashboard + reading ripple)
- `V6_V7_watermelon_dashboard.txt` — V6a (orientation absent), V7
  (honest empty states), V6b cross-reference
- `V11_eight_sites.txt` — per-site V11 captures
- `BUGS_FIXED_DURING_VERIFICATION.md` — override-fix + 007 re-apply

V8 grep (one comment-only "of 32" reference, intentional) +
V9 paired-test loops + V10 tsc clean documented inline in the
phases table above; no separate evidence file needed.
