# Schedule modes (recurring v1) — surface note

Investigation done. Reads on the eight open questions, three things in
the codebase that change the work shape from the brief, and a verification
doc draft for review.

---

## DECISIONS LOCKED (Mars sign-off received)

All six surface points answered. Locked positions:

1. **`group_chapter_history` table — YES.** Append-only across ALL
   transition types (advance / skip / go-back). Repeat stays produce
   repeat rows; data layer doesn't dedupe. UI handles rendering of
   repeated stays.
2. **`current_section` separate field — NO.** One column
   (`current_chapter_id` pointing at `text_chapters` row) covers both
   chapter and section. Single dropdown UI listing all 36 chapter rows
   with contextual labels ("Chapter 1, §1" / "Chapter 1, §2" / ... /
   "Chapter 2" / "Chapter 3" / ...) — same labels the chapters TOC
   already uses.
3. **Test group → recurring.** Sequencing locked: switch and Q6 cleanup
   ship in the same release, not separate batches. Half-state
   (recurring group with stale week filter on /threads) avoided.
4. **Members vs host — resolver's `role` field handles it.**
   `isHost = group.role === 'host'`, conditional render in
   ScheduleClient.
5. **Don't migrate `reading_schedule` rows.** Test group's 4 rows
   become harmless dead data (recurring mode doesn't read them), per
   the Q3 sequencing note.
6. **Cleanup scope WIDE — 8 sites total.** Per-site decisions:
   - `/threads/page.tsx` week filter dropdown — drop entirely in
     recurring mode
   - `/threads/new/page.tsx` week selector — drop, auto-tie new threads
     to `current_chapter_id`
   - `/glossary/page.tsx` "By Week" sort option — drop, leave A–Z only
   - `GlossaryModal.tsx` (journal toolbar) — chapter labels instead of
     week labels
   - `/reading/page.tsx` "This Week" badge — rename to "Current," mark
     `current_chapter_id`
   - `ConceptsThisWeekWidget.tsx` — **HIDE in recurring mode for v1.**
     Returns later when `first_appearance_chapter` field exists. Capture
     this scope-out in the verification record.
   - "Where the group's attention is" — scope to `current_chapter_id`'s
     sections, honest empty state if NULL
   - "Where we're stuck" — scope to `current_chapter_id`, honest empty
     state if NULL
7. **Visual judgments — defaults confirmed with one refinement:** host
   controls visually subtle (small headings, secondary treatment).
   Disabled dropdown options use `(soon)` not "coming later."
8. **Verification doc additions:**
   - V5: also verify `group_chapter_history` row written correctly per
     transition type (advance / skip / back)
   - V10: explicitly test test-group-on-recurring transition
   - V11 (new): walk all 8 current-week-aware sites in recurring mode

9. **Forward-noted scope-outs (deferred to future pieces).** Items
   removed from recurring v1 by design, with the future shape they
   return in. Not Decision Log entries yet — those land at piece
   ship-clean. Captured here as the piece-level record:

   - **`weekly_roles` and `discussion_prompts` retained as legacy
     data.** Schedule page rework drops per-week role assignments and
     per-week discussion prompts from the UI — neither concept maps
     cleanly to "host advances when the group is ready." Underlying
     tables stay populated (test group's existing rows, FK'd to
     `reading_schedule` rows not queried in recurring mode). Per-session
     role rotation is the proper recurring-mode replacement — matches
     how reading groups actually use Summarizer / Discussion Starter /
     Connector / Passage Picker (rotate each session, not each chapter).
     Requires a `sessions` table that doesn't exist yet. Until that
     piece runs, the platform has roles in schema but not surfaced.
     Accepted: surfacing chapter-scoped role assignment now would lock
     in the wrong unit and create migration debt.

   - **Session timing in orientation line tied to sessions table future
     work.** Recurring-v1 dual counter is two pieces: "Week N · Week M
     on Chapter X, §Y". When the `sessions` table piece lands, the
     orientation line gains a third piece: "· Next session [day]
     [time]". No schema field for "next session" exists in recurring
     mode today. Intentionally absent in v1 rather than a half-honest
     pull from elsewhere — the SystemStatusStrip and DashboardHeader
     are wired so adding the third piece later is additive.

## ADJUSTED SUB-BATCH ORDER

Collapsed widgets + grep cleanup into one batch (sites 1–8 ship together).

1. Schema migration (groups columns + enum + group_chapter_history table
   + indexes + RLS)
2. Watermelon seed update + test group switch to recurring (paired data
   migration in the same forward file)
3. Resolver / `getCurrentGroup` returns new schema-aware fields
4. Schedule page rework (recurring UI: current state + host controls +
   completed-chapters timeline + member view + empty state for
   pre-seed groups)
5. Dashboard orientation line refresh (dual counter)
6. All 8 current-week-aware sites — both named widgets + 6 found,
   recurring-mode treatment shipped together
7. Grep cleanup confirmation — zero "of 32" / "32 weeks" / "TOTAL_WEEKS"
   references remain
8. Verification (V1–V11)

## OPEN PRODUCT QUESTIONS DURING BUILD

These don't block migration writing. Surfacing during/before the
relevant sub-batch:

- **Pre-seed empty state copy** — what does Watermelon look like before
  Mars sets `started_at` + `current_chapter_id`? Defaults proposed
  during sub-batch 4 (schedule page) and 5 (dashboard header).
- **Reading page badge copy** — "Current" lean (single word, matches
  orientation language).
- **`group_chapter_history` RLS** — SELECT for any member of the
  group; INSERT only by host (per `group.role = 'host'`); no UPDATE or
  DELETE policies (append-only enforced at policy level).
- **Test group seed values** — `started_at = 2026-03-13` (created_at);
  `current_chapter_id` = chapter row where `chapter_number = 4`;
  `current_chapter_started_at = NOW()` at migration time. If different
  values preferred, surface before sub-batch 2 lands.

---

---

## Reads on the eight open questions

### Q1 — `reading_schedule` table fate

**Lean: leave it untouched, untyped, unrenamed.** The table has 14
columns shaped for date-based weekly scheduling (week_number, due_date,
session_date, session_location, zoom_link, page_start, page_end, etc.).
Recurring mode genuinely doesn't read from it. Bounded and specific
modes will when their UI ships. Renaming it (`reading_schedule_legacy`)
would force renames across 9 query sites in the app for no functional
gain — those sites stay unused in recurring mode and get re-engaged
when bounded/specific land.

**The wrinkle that needs your call:** the brief says "Completed chapters
timeline — list of past chapters the group has worked through, each
showing how many weeks the group spent on it." Recurring mode tracks
only `current_chapter_id` + `current_chapter_started_at` on `groups`.
When the host advances, the previous chapter's data is overwritten —
we lose the timeline data unless we persist transitions somewhere.

Two options for persistence:
- **(A) New table `group_chapter_history`** — `(group_id, chapter_id,
  started_at, ended_at)`. INSERT on each advance, before UPDATE on
  groups. Normalized, queryable, future-proof.
- **(B) Repurpose `reading_schedule`** to record advancement events
  (week_number = sequence, due_date = started_at, etc.). Reuses the
  table but muddies its semantics — bounded/specific would later
  conflict with these rows.

**My lean: A.** Cleaner, doesn't entangle recurring with bounded/
specific. Adds one small migration step.

### Q2 — "Current section within current chapter"

**The data model already collapses "section" into "chapter."** Per
CLAUDE.md's "Chapter Numbering (NON-OBVIOUS)" rule:
- `text_chapters.chapter_number` 1–4 = Chapter 1, Sections 1–4
- `chapter_number` 5–36 = Chapters 2–33

So `text_chapters` rows ARE the unit of advancement. There are 36 rows
total. `groups.current_chapter_id` pointing at the row for
`chapter_number = 4` IS "Chapter 1, §4" — `getChapterLabel(4)` does
the display formatting.

**Implication: we don't need a separate `current_section` field on
`groups`.** One column (`current_chapter_id`) does both jobs.

**The brief talks about two dropdowns** ("Set/change current chapter,
Set/change current section within chapter"). The data model only needs
one selection. The UI can present two dropdowns for usability (pick
Chapter from {Chapter 1, Chapter 2, ...}, then pick Section from
{§1, §2, ...} — though for Chapters 2+ which aren't subdivided, the
section dropdown has one option), but both compose into one
`current_chapter_id` write.

**Surface point: confirm you're OK with one column doing the work of
both.** If you want a separate `current_section` concept (e.g., to
support future texts that have actual section subdivisions independent
of chapter rows), I add a second field. For Capital Vol 1 specifically,
one column suffices.

### Q3 — Existing test group's schedule mode

**Lean: switch to recurring.** Trade-off:
- **Recurring (clean):** wipe out the 4 reading_schedule rows + their
  weekly_roles + discussion_prompts. Set `current_chapter_id` to one of
  the 36 chapter rows. Test group's UI behaves identically to
  Watermelon. Lose minor dev fixtures.
- **Bounded (preserves dev data):** keep the 4 weeks as-is, set
  `schedule_mode = 'bounded'`. But bounded has no UI in this piece. The
  schedule page either renders empty / "coming later" for bounded, or
  conditionally falls through to date-based logic — either way the UX
  is undefined.

The dev data preserved by bounded is light (4 rows of text labels and
session times). Cost of carrying it: undefined UX state for bounded
mode at launch. Cleaner to switch test group to recurring and re-seed
dev fixtures if needed later.

**Surface point: confirm switch test group to recurring.** Or your
preference if I'm wrong about the trade-off.

### Q4 — Members vs host on schedule page

The resolver already returns `role: 'host' | 'member'` on
`GroupContext`. Currently NOT used in the schedule page. Pattern is
straightforward:

```ts
// schedule/page.tsx
const isHost = group.role === 'host'
return <ScheduleClient ... isHost={isHost} />

// ScheduleClient.tsx
{isHost && <HostControls ... />}
```

No new auth infrastructure. The resolver gives us this for free.

### Q5 — Migration of existing reading_schedule data

**Lean: don't migrate.** If test group goes recurring (per Q3), the
4 reading_schedule rows aren't queried by recurring-mode logic — they
sit harmlessly in the table. If you decide test group stays bounded,
the rows are correct as-is. Either way, no migration step needed.

**Watermelon has zero rows in `reading_schedule`** — confirmed from V5
beta record. Nothing to migrate there either.

### Q6 — Anything else hardcoding "32" or "current week" assumptions

**Grep confirms only ONE hardcoded "32" in code** — a JSDoc comment in
`DashboardHeader.tsx:10` showing "Week 4 of 32" as an example. No
TOTAL_WEEKS constant, no "of 32" string literal, no `pages_per_week`
constant. The "Week 4 of 4" in production is computed dynamically from
`allWeeks.length` per group.

**But the "current week" concept is wider than the brief acknowledges.**
8 files compute "current week" — same logic everywhere (first
reading_schedule row where due_date >= now, or last row as fallback).
The dashboard's two widgets are named in the brief, but these other
sites also use current-week logic and need recurring-mode-aware
treatment:

- **`/threads/page.tsx`** — week filter dropdown ("All Weeks / Week 1 /
  ...") populated from reading_schedule rows; thread filter by
  `week_id`. In recurring mode there are no weeks → filter has no
  options → either remove the filter entirely in recurring mode, or
  show all threads with no week-based filtering.
- **`/threads/new/page.tsx`** — week selector when creating a thread.
  In recurring mode, threads aren't tied to weeks — drop the selector,
  or tie threads to `current_chapter_id` instead.
- **`/glossary/page.tsx`** — week filter for "By Week" sort mode.
  Recurring mode → drop "By Week" sort option, leave "A–Z."
- **`GlossaryModal.tsx` (journal toolbar)** — fetches reading_schedule
  for week labels in glossary picker. Recurring mode → use chapter
  labels instead.
- **`/reading/page.tsx`** — uses `currentWeekId` to mark the "This Week"
  badge on chapters. In recurring mode → mark the current chapter
  instead, using `current_chapter_id`.
- **`SystemStatusStrip.tsx`** — already noted in the brief.
- **`ConceptsThisWeekWidget.tsx`** — filters glossary by
  `first_appearance_week`. In recurring mode → either show all glossary
  terms, or filter by `first_appearance_chapter` (a new field, more
  work), or hide the widget. Lean: hide in recurring mode for now.
- **Dashboard's two widgets** — already in scope.

**Surface point: this is wider than the brief assumed.** The "widget
fixes" section names two widgets, but these other 6 sites also need
recurring-mode-aware treatment. Either:
- Treat them the same way (remove week-based logic in recurring mode),
- OR scope them out and accept that they show empty/broken UX in
  recurring mode at launch.

My lean: do the minimum sweep — for each of these 6 sites, decide "in
recurring mode, what does this surface even mean?" and either
gracefully degrade or drop the affected affordance. Adds work but
prevents the same kind of half-state bug we hit with L1.

### Q7 — Visual judgment from design

Three things the brief leaves to me where I'd rather check first:

- **Host controls layout on schedule page.** Vertical stack of
  dropdowns? Grouped settings panel? Inline-edit on the current state?
  My default: settings panel below the current-state display, hairline-
  divided per the design pack. Surface for confirmation.
- **Completed chapters timeline rendering.** Brief example: "Chapter 1
  — 7 weeks (Apr 28 – Jun 16, 2026)." Format options: simple list,
  vertical timeline with hairlines, card-per-chapter, table. My
  default: vertical list with Lora italic chapter title + secondary
  metadata line per item, matching the threads-list pattern from
  Piece 4. Surface for confirmation.
- **Schedule mode dropdown disabled state.** When bounded/specific
  are disabled with "coming later" notes — inline italic note next to
  the option? Tooltip on hover? Disabled with explanatory copy below
  the dropdown? My default: disabled options with parenthetical
  "(coming later)" inline. Surface for confirmation.

None of these are blocking. I can ship a default for each and you can
push back. But surfacing in case any have strong opinions.

### Q8 — Verification approach

Smaller than L1. Draft below in a separate section.

---

## Three things in the codebase that change the work shape

**1. `current_section` is unnecessary as a separate field.** (Q2 above.)
The brief implies a section field; the data model doesn't need one.
Saves a column, saves UI complexity, possibly changes your design
intent — surface for sign-off.

**2. Need a `group_chapter_history` table for the completed-chapters
timeline.** (Q1 above.) The brief assumes this data exists, but without
persistence, advancing loses the previous chapter's data. Adds one
small migration step + INSERT-before-UPDATE in the advance handler.
Not in the brief's "what this piece doesn't do" list, so I'm flagging
explicitly.

**3. "Current week" is wider than two widgets.** (Q6 above.) 6 other
sites use current-week logic that breaks or no-ops in recurring mode.
Either include them in scope or accept they degrade at launch. My
lean: include in scope; not huge work.

---

## Verification doc draft

Same shape as L1's V1–V6, smaller.

| Phase | What it proves | Method |
|---|---|---|
| V1 | Schema migration applied | `\d groups` shows new columns; enum exists; group_chapter_history table exists |
| V2 | Watermelon seeded as recurring | Direct query: `SELECT schedule_mode, started_at, current_chapter_id, current_chapter_started_at FROM groups WHERE slug = 'watermelon'` returns expected values |
| V3 | Schedule page renders correctly for host (Mars) | Chrome MCP walk: `/schedule` shows current state + host controls + completed-chapters timeline (empty initially); host controls visible |
| V4 | Schedule page renders correctly for member (alpha) on test group | Chrome MCP walk: `/schedule` shows current state + completed-chapters timeline; NO host controls visible |
| V5 | Host can advance current chapter via schedule page; ripples through | Chrome MCP: open dropdown, pick a different chapter, click apply. Re-load `/dashboard`: orientation line reflects new chapter, chapter counter resets to "Week 1 on Chapter X" |
| V6 | Dashboard orientation line shows dual counter format | Chrome MCP: read `/dashboard`, verify format `Week N · Week M on Chapter X, §Y · Next session ...` |
| V7 | Widgets honest when no current chapter set | SQL: temporarily UPDATE groups SET current_chapter_id = NULL for a test user's group; reload dashboard; verify "Where the group's attention is" + "Where we're stuck" render honest empty state, not 6-section fallback. Restore. |
| V8 | "of 32" framing gone everywhere | grep `of 32`, `32 weeks`, `TOTAL_WEEKS` across `/src` — zero matches |
| V9 | Migration reversible | Apply forward + rollback on a Supabase preview branch; verify schema returns to pre-V1 state |
| V10 | tsc clean + no regressions | `npm run build`; spot-check sign-in, dashboard, threads, glossary, reading, schedule old-→-new transition |

Surface this for review. If anything's missing or shaped wrong I adjust
before running.

---

## What I want you to weigh in on before I start coding

1. **`group_chapter_history` table — yes/no.** Lean yes (Q1).
2. **`current_section` as a separate field — yes/no.** Lean no, one
   column does both jobs (Q2).
3. **Test group → recurring or stay bounded.** Lean recurring (Q3).
4. **Scope of the "current week" cleanup — narrow (just the two
   widgets) or wide (all 8 sites).** Lean wide (Q6).
5. **Three visual judgment defaults** — sign off or push back (Q7).
6. **Verification doc draft.** Sign off as drafted, or adjust.

Once these six are answered, sub-batch order matches the brief:
schema migration → resolver updates → schedule page → dashboard
header → widgets → grep cleanup → verification.

Standing by.
