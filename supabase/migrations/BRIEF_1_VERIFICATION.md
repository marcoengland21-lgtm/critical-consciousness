# Brief 1 — Sprint A Session 1 Verification Record

**Status: schema-side verifications PASSED (V1–V2). Application-side walkthroughs (V3–V6) execute against the deployed site after push.**

---

## Summary of changes

Two migrations + the application code that consumes them:

- `011_has_completed_onboarding.sql` — adds `profiles.has_completed_onboarding` (BOOLEAN NOT NULL DEFAULT false), backfills existing accounts to true with `user_alpha@example.test` and `user_beta@example.test` overridden to false for E2E walks.
- `012_watermelon_invite_code.sql` — seeds `WATERMELON26` invite code row scoped to Watermelon (`groups.id = 00000000-0000-0000-0000-000000000002`), `max_uses=NULL` (reusable), `created_by` resolved to Mars's profile UUID via role lookup.
- `src/app/page.tsx` — replaced entirely with the interim landing per mum's design + Brief 1 corrections (single primary "Join Watermelon" CTA, dual-counter meta-row with honest empty states, footer trimmed to "Capital Study Group · est. 2026").
- `src/app/(auth)/register/actions.ts` + `register/page.tsx` — single atomic `registerUser` server action (validate → admin.createUser → membership insert → use_count increment → signInWithPassword), with field-scoped error rendering. Closes the L1-flagged signup-creates-membership gap.
- `src/app/(auth)/login/actions.ts` + `login/page.tsx` — new `loginUser` server action with `has_completed_onboarding` routing branch.
- `src/app/welcome/page.tsx` + `WelcomeScroll.tsx` + `welcome/actions.ts` — the eight-section onboarding scroll with light scroll-driven animation (IntersectionObserver-driven fade-in + subtle scale, proximity scroll-snap, prefers-reduced-motion respect, mobile parity).
- `src/lib/session-timing-format.ts` — header comment block capturing the inline-vs-shared-helper trigger condition (architectural decision capture for the inline-in-page-components shape).

---

## V1 — Migration 011 schema check (PASSED in sub-batch 1)

Forward → V1 → rollback → V1 → forward → V1 paired-test loop executed against live DB via Supabase SQL editor.

**Check 1 result (column shape):**
```
has_completed_onboarding | boolean | NO | false
```

**Check 2 result (backfill landing):**
```
marcoengland21@gmail.com           | admin  | true
guest@criticalconsciousness.local  | member | true
user_alpha@example.test            | member | false
user_beta@example.test             | member | false
```

End-state: forward applied. Resting state confirmed.

---

## V2 — Migration 012 seed check (PASSED in sub-batch 1)

Forward → V1 → rollback → V1 (count=0) → forward → V1 paired-test loop executed.

**V1 result:**
```
code         | WATERMELON26
group_id     | 00000000-0000-0000-0000-000000000002
group_slug   | watermelon
group_name   | Watermelon
max_uses     | NULL
active       | true
created_by   | 97d2db21-64af-42e9-8765-d7ae30518c17  (Mars/admin/Marco)
```

End-state: forward applied. Row reappears with same shape after rollback-then-forward.

---

## V3 — Interim landing render (post-deploy walkthrough)

After push and Netlify deploy, visit `https://capitalstudygroup.netlify.app/` while logged out.

Expected:

1. Quiet platform header at top: mono "C" badge + "Capital Study Group" + italic tagline ("A platform for Marxist study groups", desktop only).
2. Two-line hero: "Welcome to" / "Watermelon." in Lora italic.
3. Subhead: "A small group reading Marx's Capital, Volume I together."
4. Meta-row state depends on whether host has set Watermelon's `started_at`, `current_chapter_id`, `current_chapter_started_at`, `next_session_at` via the schedule page:
   - **All four set:** three-key row with CURRENTLY ("Week N · Week M on Chapter 1, §X"), SESSIONS ("Tuesday 7pm" or whatever weekday/time), FORMAT ("Read on your own. Meet weekly.").
   - **`next_session_at` only:** SESSIONS + FORMAT (no CURRENTLY).
   - **chapter trio only (no `next_session_at`):** CURRENTLY + FORMAT (no SESSIONS).
   - **None set:** meta-row entirely omitted.
5. Single primary CTA: "Join Watermelon" → `/register`.
6. Quiet secondary: "Already have an account? Sign in" → `/login`.
7. Footer: "Capital Study Group · est. 2026" (single line, no "Hosting one reading group during launch. About →" tail).

Then visit `/` while logged in. Expected: server-side redirect to `/dashboard` (no flash of the unauth landing).

Mobile parity: at 375px viewport, italic tagline drops from header, hero stays two-line, meta-row stacks vertically (no hairline dividers between stacked items), CTAs full-width.

---

## V4 — Signup flow with WATERMELON26 (post-deploy walkthrough)

Visit `/register` while logged out.

Expected page state:
1. Eyebrow "JOINING WATERMELON" + heading "Create your account" + subhead "You'll be added to Watermelon. Takes a minute."
2. Four fields: Invite code (helper "From the email or message that brought you here."), Your name, Email, Password (helper "At least 8 characters.").
3. CTA: "Join Watermelon".

**V4a — Successful signup.** Use a fresh email + the password ≥ 8 chars + `WATERMELON26`. Submit. Expected: navigates to `/welcome` with the user authenticated. Verify in Supabase dashboard:
- `auth.users` has the new email.
- `profiles` row exists with display_name and `has_completed_onboarding=false` (DEFAULT).
- `group_memberships` row exists with `group_id=00000000-0000-0000-0000-000000000002` and `role=member`.
- `invite_codes.use_count` for WATERMELON26 incremented by 1.

**V4b — Invalid invite code.** Submit with `BADCODE`. Expected: form stays on `/register`, inline error under invite-code field "That code isn't right. Check the email or message that brought you here." Other fields preserved.

**V4c — Email already exists.** Submit with the V4a email + a different password. Expected: inline error under email field "An account with this email already exists. Sign in instead, or use a different email." No new auth user created.

**V4d — Password too short.** Submit with a fresh email + 5-char password. Expected: inline error under password field "Needs to be at least 8 characters." No auth user created.

**V4e — Network/unknown error.** Difficult to reproduce reliably; documented for completeness. The general-error banner above the form would render "Something went wrong. Try again." with form fields preserved.

---

## V5 — Sign-in routing (post-deploy walkthrough)

**V5a — `has_completed_onboarding=true` user.** Sign in as Mars (marcoengland21@gmail.com). Expected: lands on `/dashboard` (not `/welcome`).

**V5b — `has_completed_onboarding=false` user.** Sign in as `user_alpha@example.test` or `user_beta@example.test` (per migration 011 backfill). Expected: lands on `/welcome` (the onboarding scroll).

**V5c — Bad credentials.** Submit with a real email + wrong password. Expected: generic error banner "That email and password don't match. Try again, or reset your password." (Never disambiguates email vs password.)

---

## V6 — Onboarding scroll walkthrough (post-deploy, v2 redesign)

Reach `/welcome` either via signup (V4a) or signin with `has_completed_onboarding=false` user (V5b).

The scroll was rebuilt post-V3-V6 diagnosis as a surfaces-not-sections design. Six sections (down from eight), four animated platform-mockup surfaces with capability beats labelled below each mockup.

Expected:

1. Six viewport-height sections, scroll-snap proximity (mid-section pause allowed). Section order: 01 Opener → 02 Reading → 03 Group → 04 Personal → 05 Dashboard → 06 Ready.
2. Each section fades in (~600ms ease-out) as it enters viewport. Primary visual scales 0.96 → 1.0 within the same window.
3. Opener (section 1): personalised hero "Welcome to Watermelon, [display_name]." with two-line subhead "A small group reading Marx's Capital, Volume I together. / Slowly, carefully." Stagger-fade entrance, no platform motion.
4. Reading surface (section 2): chapter-view mockup with five capability beats over a 7s loop — Marginalia (annotation card fades into right margin), Replies tuck under, Glossary in line (dotted underline draws on "commodity", popover opens), Confusion anonymous (counter climbs 0→7 with **irregular timing** — hand-tuned arrivals at 250/350/500/1200/1400/2200/2900ms reflecting a multi-actor social dynamic), Listen along (audio scrubber starts moving). Beat label cycles below mockup as the loop plays.
5. Group surface (section 3): thread view with two capability beats — Confusion becomes agenda (the "7" count from Reading surface morphs into a thread title), Branch when it deserves space → Lineage stays visible (highlight in reply, branch affordance, child thread slides in with "← Branched from §1" label). **Held absence: replies have no like buttons.**
6. Personal surface (section 4): journal editor with one extended motion sequence and three sequential labels — Private journal (typing motion, autosave pulse), Private by default (lock icon glow), The same move, made public (highlight in journal body, identical branch gesture as Group surface, thread spawns from private writing).
7. Dashboard surface (section 5): full dashboard mockup with two hero beats and ambient elements. Beat 1 — Where we are: orientation strip materialises ("[Group] · Week 12 · Week 3 on Chapter 1, §4 · Next session [day] 7pm") plus a rhythm strip below showing the 7-day weekday row with the meeting day highlighted, "WE MEET WEEKLY" eyebrow. Beat 2 — Where the group's attention is: magnitude bars fill in with non-uniform per-bar delays (multi-actor read). Ambient: Capital quote callout, recent threads list, concept scaffolding panel. **Held absence: no streak counter, no notification badge, no progress percentage.**
8. CTA (section 6): "Read at your pace. Bring what you've got to the next session." button submits the `completeOnboarding` server action. Expected: flag flips to true in DB, redirect to `/dashboard`. Verify in Supabase dashboard the user's `has_completed_onboarding=true` after.
9. Subsequent signin for the same user lands on `/dashboard`, not `/welcome` (V5a behavior).

**Pedagogical coherence check:**

- Irregular-rhythm motion on the confusion counter (Reading surface) and the magnitude bars (Dashboard) carries the "multiple actors arriving at irregular intervals" read through motion alone, no avatars or names.
- Highlight-and-branch motion on Group surface and Personal surface uses identical visual treatment (same affordance, same animation curve, same arrival direction for the resulting thread). The label "the same move, made public" names the parity at the moment it lands on Personal.
- Two deliberate absences (no like button on Group reply, no engagement-wrappers on Dashboard) teach calm-technology through what's missing rather than declaring it.

**Mobile parity (375px):**

- All sections render correctly; no horizontal scrolling.
- Marginalia / reply / child-thread cards reposition inline below their anchor element (vs floating off the right edge on desktop).
- Confusion flag indicator tucks above the paragraph on mobile.
- Dashboard ambient grid collapses to single column.

**Reduced-motion check:**

In Chrome DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce. Reload `/welcome`. Expected: no fade-in, no scale, no scroll-snap, no per-beat motion. Mockups render in their final/visible state from first paint — confusion counter shows 7, magnitude bars filled, popovers open, child threads visible, lock icon glowing.

---

## Decisions captured for CLAUDE.md Decision Log

These land in CLAUDE.md when this piece ships clean (post-V6):

1. **Brief 1 signup flow rewrite — single atomic `registerUser` server action** rather than the two-step client orchestration (`validateInviteCode` then client-side `auth.signUp`). Reasons: closes the L1-flagged signup-creates-membership gap atomically; orphan-auth-user race becomes addressable via `admin.deleteUser` rollback; Session 2's developer-flag check becomes a one-line addition.

2. **Inline-in-page-components for templating shape (Brief 1, sub-batch 2).** Dual-counter computation lives inline in the interim landing meta-row + SystemStatusStrip's existing inline. Trigger condition for refactoring to a shared helper: a third NEW surface needs the same shape (Session 3's group-scoped schedule view, R2's moderation views, post-launch). Architectural note captured in `src/lib/session-timing-format.ts` header.

3. **`has_completed_onboarding` routing branch in sign-in flow.** Defensive default: any non-`true` flag value routes to `/welcome` (worst case the user sees onboarding once more). Profile lookup uses service role rather than the user-cookie client because newly-set session cookies aren't necessarily readable within the same server-action invocation.

4. **Onboarding scroll uses inline `<style>` block rather than globals.css extension.** Single-consumer animation styles (welcome-scroll, welcome-section, welcome-visual). globals.css addition would be speculative since these styles only apply on `/welcome`. If a second scroll surface ever appears (unlikely), promote to globals.css then.

5. **Chrome MCP / Supabase dashboard verification quirks** (captured during sub-batch 1 paired tests):
   - The Cowork redaction layer occasionally blocks dashboard renders if the tab is backgrounded — keeping the tab foregrounded is the unblocker.
   - Supabase fires a "Query has destructive operations" confirmation dialog before DROP/DELETE etc. — Run button click only opens the dialog; an additional click on "Run this query" inside is required.
   - Supabase's result grid virtualizes columns horizontally — DOM-scraping `[role="gridcell"]` only returns currently-rendered cells. Wide queries (>~6 columns at default panel width) need narrower projections or programmatic scroll before scraping.

6. **Use_count race accepted as known tech debt.** WATERMELON26 has `max_uses=NULL` so race is harmless for v1. The new `registerUser` flow increments AFTER auth user creation succeeds (vs the legacy pre-signup increment), which is the right shape for finite-use codes when they ship — this is now the working pattern, not a future fix.

---

## Push readiness

Schema verifications complete. Application code typechecks cleanly. Sandbox can't run `next build` (linux/arm64 SWC binary missing) but Mars's local Mac and Netlify x64 builds will run.

After push: V3–V6 walkthroughs run against the deployed site to confirm application-side behavior. If any V3–V6 surfaces unexpected state, fix before declaring ship-clean.
