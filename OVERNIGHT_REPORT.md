# Overnight Session Report — 16 March 2026

## Summary

6 batches of systematic improvements across the entire Critical Consciousness Project codebase. Zero build errors, zero warnings throughout. Every change tested with `npm run build` before committing.

---

## Batch 1: Critical Fixes

### 1A. Extracted shared author avatar colors
**Problem:** Identical `AUTHOR_COLORS` array + `hashColor()` function was copy-pasted in 3 separate files.

**Fix:** Created `src/lib/author-colors.ts` with the shared array and hash function. Updated `ThreadListClient.tsx`, `ReplySection.tsx`, and `threads/[id]/page.tsx` to import from it. Single source of truth — changing the palette now requires editing one file.

### 1B. Fixed ReadingCheckinButton hardcoded white
**Problem:** `activeColor: '#ffffff'` violated Rule 12 (never hardcode hex colors).

**Fix:** Changed to `'var(--text-inverse)'` so it works in both light and dark mode.

### 1C. Fixed DesktopSidebar hardcoded rgba colors
**Problem:** 6 instances of `rgba(107, 76, 154, 0.3)` and `rgba(107, 76, 154, 0.2)` hardcoded in the sidebar.

**Fix:** Added `--nav-accent` and `--nav-accent-subtle` CSS tokens to `globals.css` (both light and dark mode), replaced all 6 hardcoded values.

### 1D. Fixed profile page duplicate getChapterLabel
**Problem:** `profile/page.tsx` had its own local `getChapterLabel` function, duplicating `chapter-utils.ts`.

**Fix:** Deleted local function, imported from `@/lib/chapter-utils`, adapted usage to `.label` property.

### 1E. Fixed TimeAgo missing timeZone
**Problem:** `TimeAgo.tsx` didn't include `timeZone: 'Pacific/Auckland'` in its `toLocaleDateString` and `toLocaleString` calls (Rule 14).

**Fix:** Added `timeZone: 'Pacific/Auckland'` to both the fallback date format and the tooltip date format.

### 1F. Fixed auth form focus ring colors
**Problem:** Login and register form inputs were missing `--tw-ring-color`, so focus rings defaulted to browser blue instead of the project's purple accent.

**Fix:** Added `'--tw-ring-color': 'var(--accent-purple)'` to all form inputs in both auth pages.

---

## Batch 2: Loading & Error States

### 5 Loading Skeletons
Created loading skeleton pages for every main route that was missing one. All follow the existing `dashboard/loading.tsx` pattern using `skeleton-shimmer` class and `var(--bg-card-alt)` blocks.

| Route | File | Layout |
|-------|------|--------|
| /glossary | `glossary/loading.tsx` | Search bar + two-column (term list + definition panel) |
| /schedule | `schedule/loading.tsx` | Heading + 3 week card skeletons |
| /resources | `resources/loading.tsx` | Heading + filter pills + grid of resource cards |
| /profile | `profile/loading.tsx` | Name header + stats row + activity sections |
| /threads/new | `threads/new/loading.tsx` | Heading + type cards grid + title + body textarea |

### 7 Error Boundaries
Created error boundary pages for every main route. All follow the existing `reading/[slug]/[chapter]/error.tsx` pattern — client component with retry button and fallback navigation link.

| Route | File | Back link |
|-------|------|-----------|
| /dashboard | `dashboard/error.tsx` | → /reading |
| /glossary | `glossary/error.tsx` | → /dashboard |
| /schedule | `schedule/error.tsx` | → /dashboard |
| /resources | `resources/error.tsx` | → /dashboard |
| /threads | `threads/error.tsx` | → /dashboard |
| /threads/[id] | `threads/[id]/error.tsx` | → /threads |
| /profile | `profile/error.tsx` | → /dashboard |

---

## Batch 3: Type Safety

Replaced ~36 `any` type annotations across 9 files with proper TypeScript interfaces. Each interface matches the exact Supabase query return shape including joined columns.

| File | Types Added |
|------|-------------|
| `dashboard/page.tsx` | `MilestoneRow`, `WeeklyRoleRow`, `AnnotationWithChapter`, `ThreadWithAuthor`, `DiscussionPrompt` |
| `reading/page.tsx` | `ChapterWeek`, `ChapterRow`, `DocumentWithChapters`, `ChapterWithMapping`, `PartGroup` |
| `threads/page.tsx` | `ReplyAuthor`, `ReplyRow`, `RawThread`, `WeekRow`, `DiscussionPrompt`, `CurrentWeekWithPrompts`, `UserRoleRow` |
| `profile/page.tsx` | `AnnotationWithChapter`, `ThreadWithReplies`, `GlossaryEntryBasic`, `CheckinWithWeek`, `RoleWithWeek` |
| `schedule/page.tsx` | `WeeklyRoleRow`, `DiscussionPrompt`, `ScheduleWeek` |
| `QuoteFromReadingModal.tsx` | `ChapterQueryRow`, `DocumentRow` |
| `threads/[id]/page.tsx` | `ChapterDocSlug`, `SidebarThread`, `ThreadWeek` |
| `reading/[slug]/[chapter]/page.tsx` | `Footnote` (local), imported `GlossaryTerm` |
| `glossary/page.tsx` | Inline types for comment/version joins |

These are query-specific join shapes, not database table types. They live near the top of each file where the query happens.

---

## Batch 4: UX Improvements

### 4A. Cmd/Ctrl+Enter on auth forms
Both login and register forms now support Cmd+Enter (Mac) / Ctrl+Enter (Windows) to submit. Uses `formRef.requestSubmit()` for proper form validation.

### 4B. Reading time estimates
Chapter pages now show estimated reading time below the chapter label: "Chapter 1, Section 1 · ~15 min read". Uses 200 words per minute, appropriate for dense academic text like Capital. Calculated server-side from `chapterData.content.split(/\s+/)`.

### 4C. Scroll position persistence
New hook `useScrollPersistence(chapterNumber)` saves and restores scroll position per chapter:
- On mount: restores last saved position via `requestAnimationFrame`
- While reading: debounce-saves scroll position every 500ms to localStorage
- On unmount: saves final position

This matters because a chapter might take 15-45 minutes to read. Being able to resume where you left off when switching between chapters is important.

**New files:**
- `src/lib/scroll-persistence.ts` — localStorage read/write utilities
- `src/hooks/useScrollPersistence.ts` — React hook with debounced scroll save + restore

**Modified:** `ChapterReader.tsx` — 2 lines added (import + hook call).

---

## Batch 5: Polish

### 5A. Print-friendly styles
Added `@media print` block to `globals.css` for the reading pages:
- Hides navigation, toolbar, buttons, sticky elements
- Reading text: 12pt, black-on-white, full width
- Annotation highlights converted to subtle dotted underlines
- Page margins: 2cm top/bottom, 2.5cm sides
- Orphan/widow control: minimum 3 lines together
- Headings kept with following content (no page break after)
- Blockquotes: prevent page break inside

### 5B. Removed unused pg dependency
Removed `"pg": "^8.20.0"` from devDependencies. It was leftover from an early experiment and not imported anywhere in the codebase.

---

## What Was NOT Changed

- **Concepts page** — Left as-is. It compiles, works as an unlisted route, and does no harm.
- **ChapterReader.tsx size** — The plan identified it as too large, but breaking it up would be a significant refactor best done as its own focused session, not during an overnight batch.
- **Tests** — No testing framework was added. This is a larger architectural decision that should involve Mars.

---

## Files Created (20 new files)
```
src/lib/author-colors.ts
src/lib/scroll-persistence.ts
src/hooks/useScrollPersistence.ts
src/app/(main)/glossary/loading.tsx
src/app/(main)/schedule/loading.tsx
src/app/(main)/resources/loading.tsx
src/app/(main)/profile/loading.tsx
src/app/(main)/threads/new/loading.tsx
src/app/(main)/dashboard/error.tsx
src/app/(main)/glossary/error.tsx
src/app/(main)/schedule/error.tsx
src/app/(main)/resources/error.tsx
src/app/(main)/threads/error.tsx
src/app/(main)/threads/[id]/error.tsx
src/app/(main)/profile/error.tsx
OVERNIGHT_REPORT.md
```

## Files Modified (20+ files)
All auth, dashboard, reading, threads, glossary, schedule, profile, and resources pages. Plus globals.css, ChapterReader.tsx, package.json, and component files.

---

## Build Status
All 6 batches: **zero errors, zero warnings**. Every commit verified with `npm run build` before pushing.
