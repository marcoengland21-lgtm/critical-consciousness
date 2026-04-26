# Critical Consciousness Project — Browser Test Report

**Date:** 14 March 2026
**Tester:** Claude (Cowork mode with Chrome extension)
**Site:** https://capitalstudygroup.netlify.app
**Logged in as:** Marco (admin)
**Browser:** Chrome (desktop, ~1610x763 viewport)

---

## Test Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1     |
| HIGH     | 2     |
| MEDIUM   | 3     |
| LOW      | 3     |

**Overall verdict:** The site is functional and usable. The one CRITICAL bug (chapter page crash) was found and fixed during this session. Remaining issues are mostly UX polish and accessibility improvements — nothing blocks the reading group from using the platform.

---

## CRITICAL

### 1. Chapter page crash — `cookies()` inside `unstable_cache()` (FIXED)

**Flow:** Reading > Click any chapter link
**What happened:** Server-side crash with error digest `3737101613@E846`. Netlify function logs showed: `Route /reading/[slug]/[chapter] used 'cookies()' inside a function cached with 'unstable_cache()'`.
**Root cause:** `createClient()` calls `cookies()` from `next/headers`, and was used inside two `unstable_cache()` wrapped functions (`getStaticChapterData` and `getFootnotes`).
**Fix applied:** Created `createStaticClient()` in `src/lib/supabase/server.ts` — a cookie-free Supabase client using `@supabase/supabase-js` directly. Replaced calls in both cached functions. Added `error.tsx` boundary for the chapter route.
**Commit:** `bff9776`
**Status:** FIXED and deployed.

---

## HIGH

### 2. Auth middleware disabled — no login enforcement

**Flow:** All pages
**What happened:** The middleware at `src/lib/supabase/middleware.ts` has the auth redirect logic commented out with `// TODO: RE-ENABLE AUTH`. Similarly, `src/app/(main)/layout.tsx` has a `// TODO: RE-ENABLE AUTH` comment. This means anyone can access all pages without logging in. The `createAdminClient()` in `admin.ts` uses the service role key and bypasses RLS entirely.
**Risk:** Before launch, unauthenticated visitors could see all content. The service role client (`admin.ts`) is currently imported in some server components — if this pattern spreads, it undermines RLS entirely.
**Recommendation:** Re-enable auth redirects in middleware before any public launch. Audit all uses of `createAdminClient()` and replace with `createClient()` where possible. Ensure RLS policies are working correctly with the anon key.

### 3. React #418 hydration mismatch errors on dashboard

**Flow:** Dashboard page load
**What happened:** In the previous testing session, console showed `Minified React error #418` (text content mismatch between server and client HTML). This is a hydration error meaning the server rendered different text than the client expected.
**Likely cause:** Date/time rendering (e.g., "8h ago" in TimeAgo component) or browser-dependent content. The server renders a timestamp at build/request time, but by the time the client hydrates, the relative time has changed.
**Recommendation:** Wrap time-dependent rendering in a client component with `useEffect` to avoid SSR mismatch, or use `suppressHydrationWarning` on the specific element. Check the `TimeAgo` component at `src/components/ui/TimeAgo.tsx`.

---

## MEDIUM

### 4. Reading TOC — chapter links lack visual link affordance

**Flow:** Reading page (`/reading`)
**What happened:** Chapter titles in the table of contents look like plain text. There's no underline, no color differentiation, and no visible CTA. The "Read →" text uses `opacity-0 group-hover:opacity-100` so it's invisible by default and only appears on hover.
**Why it matters:** Users aged 14-80+ need clear visual cues that items are clickable. On touch devices, hover states don't exist, so the "Read →" indicator never appears.
**Code location:** `src/app/(main)/reading/page.tsx` lines 263-267 and 325-330.
**Recommendation:** Either make "Read →" always visible (or at least on mobile), or add a subtle link color/underline to the chapter titles. The `group-hover:underline` on the `<h3>` is good for desktop but invisible on mobile.

### 5. Reading TOC links — missing accessible names

**Flow:** Reading page accessibility
**What happened:** When using the Chrome accessibility tree "interactive" filter, the chapter links were not found. The `<a>` tags wrap child elements but have no direct text content or `aria-label`, making them harder for screen readers.
**Recommendation:** Add `aria-label` to each chapter link, e.g., `aria-label="Read Chapter 1, Section 1: The Two Factors of a Commodity"`.

### 6. "This Week" badge contrast issue in TOC

**Flow:** Reading page
**What happened:** The "This Week" badge uses `backgroundColor: 'var(--accent-purple)'` with `color: 'var(--text-primary)'`. In light mode, this is dark purple background with dark text — very low contrast.
**Code location:** `src/app/(main)/reading/page.tsx` lines 257-260.
**Recommendation:** Change the badge text color to `var(--text-inverse)` (light text on purple background).

---

## LOW

### 7. Session time shows "5:30 am" — likely timezone display issue

**Flow:** Dashboard > "This Week's Reading" card
**What happened:** "Next Session: Tuesday, 17 Mar, 5:30 am" — this seems very early for a reading group in Christchurch. The `session_date` in the database is stored as `TIMESTAMPTZ`, so the displayed time depends on the viewer's timezone. The server may be rendering in UTC while the session is set in NZDT.
**Recommendation:** Either store times in the group's local timezone with a note, or explicitly format with the correct timezone (e.g., `Pacific/Auckland`).

### 8. No loading/skeleton states visible on fast connections

**Flow:** All pages
**What happened:** Loading files exist (`loading.tsx` for dashboard, reading, threads) with skeleton shimmers, but on fast connections they flash too briefly to evaluate. The `skeleton-shimmer` CSS animation is defined and the loading components exist — this is working as designed.
**Note:** This is not a bug, just noting that loading states couldn't be fully evaluated due to fast Netlify CDN response times.

### 9. Concepts page exists but isn't in navigation

**Flow:** URL bar
**What happened:** There's a `src/app/(main)/concepts/page.tsx` file and a `ConceptMap` component, but "Concepts" doesn't appear in the navigation bar. This appears to be an intentionally hidden/in-progress feature.
**Recommendation:** Either add it to nav when ready, or remove the route to avoid confusion.

---

## What's Working Well

- **Dark mode** — Full theme toggle with CSS custom properties. Transitions smoothly. Persists in localStorage. Cross-tab sync via storage events. All components properly themed.
- **Navigation** — All 6 nav links work correctly. Active link highlighting with purple underline. Correct order (Dashboard, Reading, Threads, Glossary, Schedule, Resources). Logo links to dashboard.
- **Reading experience** — Chapter pages load with breadcrumbs, section tabs for Ch1, Lora serif font, footnotes with Marx/Engels attribution, annotation highlights, text selection toolbar.
- **Annotations** — Text selection shows popover with "Annotate" and "Start Thread" buttons. Annotation panel slides in with textarea, confusion flag toggle, Cancel/Save.
- **Threads** — Full CRUD: create with 6 type cards (visual emoji icons, smooth selection), filter tabs, thread detail with reply section, Edit/Delete for own threads.
- **Schedule** — Week cards with Completed/Current badges, dates, discussion prompts, collapsible Session Notes (CSS grid animation), "View Week N Threads" cross-links, "GET A HEAD START" prompts.
- **Glossary** — Search input, inline Add Term form with Term/Definition fields.
- **Resources** — Type filter tabs, inline Add Resource form with type dropdown and week selector.
- **Dashboard** — Welcome message, This Week's Reading card, progress check-in (Done/Partial/Behind persists), annotation activity by section, themes explored, recent discussions, Quick Links sidebar, Annotate Together CTA.
- **Cross-page links** — Dashboard "Annotate Together" → reading chapter. Schedule "View Week N Threads" → filtered threads. Reading "Start a Thread" → new thread form with chapter context. All tested and working.
- **Accessibility** — Skip-to-content link, ARIA labels on nav, focus-visible outlines, min touch target sizes, prefers-reduced-motion support.
- **Animation system** — fade-in-up, slide-in-right, scale-in, stagger-children, collapsible CSS grid transitions, skeleton shimmer, btn-transition with active scale. All feel smooth and intentional.
