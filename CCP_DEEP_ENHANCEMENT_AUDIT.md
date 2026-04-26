# CCP Deep Enhancement Audit — Build Ticket

**Date:** 15 March 2026
**Auditor:** Claude (Cowork session with Mars)
**Scope:** All pages at 1440×900 (desktop) and 375px (mobile)
**Benchmark:** PMN Pulse (warm-zuccutto-ba2636.netlify.app)
**Commit range:** Post-design-comparison fixes through current HEAD

---

## How To Use This Report

Each section is a self-contained build ticket. Sections are ordered by page/feature area, not priority. The **Priority Ranking** at the end gives the recommended build order. Every recommendation includes the file(s) to touch and enough detail to implement without follow-up questions.

---

## Part 1: Space Usage & Layout Audit

### Current Measurements (1440×900 viewport)

| Element | Width | % of viewport | Notes |
|---------|-------|---------------|-------|
| Sidebar (collapsed) | 60px | 4% | Icon-only rail with "C" monogram |
| Sidebar (expanded) | ~240px | 17% | Full labels, only triggers inconsistently |
| Dead space (sidebar→content) | ~178px | 12% | Padding/margin between sidebar edge and content start |
| Main content area | ~1024px | 71% | `max-width` constrained |
| Right gutter | ~178px | 12% | Empty on most pages |

### Problems

**P1 — 24% of the viewport is empty gutters.** The content sits in a centered column with symmetric dead space on both sides. This is acceptable on the reading page (constrained line length is correct for readability), but on the dashboard, threads list, schedule, and resources pages, it wastes space that could hold useful content.

**P2 — Dashboard right sidebar underuses its column.** The two-column dashboard layout is a good improvement, but the right column (Your Roles, Annotate Together, Quick Links) is narrow and sparse. The cards could be taller/richer, or the column could hold more contextual content.

**P3 — Threads list is a single narrow column with vast empty space.** A thread list with 1 card and 80% whitespace looks broken, not calm. Even with many threads, the single-column layout won't use the available width.

**P4 — Resources page is empty AND narrow.** The filter pills + empty state sit in a thin column. When populated, single-column resource cards will underuse the space.

### Recommendations

**1.1 — Dashboard: Widen the two-column layout**
- File: `src/app/(main)/dashboard/page.tsx`
- Increase `max-width` on the dashboard container from current constraint to `max-w-6xl` or `1200px`
- Left column: 65%. Right column: 35%
- Right column cards should have more breathing room — add padding and let them fill naturally

**1.2 — Threads list: Two-column card grid at desktop**
- File: `src/app/(main)/threads/page.tsx`
- At `min-width: 768px`, render thread cards in a 2-column CSS grid
- Each card should show: type badge, title, author, timestamp, 2-3 lines of body preview, reply count
- This makes the page feel populated even with few threads
- Keep single-column below 768px

**1.3 — Resources page: Card grid layout**
- File: `src/app/(main)/resources/page.tsx`
- Render resources as a responsive card grid (2 cols at 768px, 3 cols at 1024px)
- Each card: resource type icon, title, description snippet, source domain, "Open →" link
- Filter pills stay above the grid

**1.4 — Reduce dead space between sidebar and content**
- File: `src/app/(main)/layout.tsx` or the main content wrapper
- The ~178px gap between collapsed sidebar and content start is excessive
- Reduce left padding on the main content area to 24-32px from the sidebar edge
- Content `max-width` constraints can handle readability — the container doesn't need extra centering margins

**1.5 — Reading page: No changes needed**
- The reading page correctly constrains to ~68ch line width
- Generous margins are intentional and correct for sustained reading
- The annotation panel slides in from the right, using the "dead" space purposefully

---

## Part 2: Reading Toolbar Redesign

### Current State

The reading page has a floating action button (bottom-right corner) that opens a slide-out panel containing:
- Position indicator (e.g., "Section 1 of 4")
- Font size controls (A−/size/A+)
- Theme toggle (sun icon)
- Focus mode toggle ("Focus 4")
- Annotation filter/search
- Chapter navigation list

There's also a Back to Top button (bottom-left) and a 2px purple scroll progress bar at the top.

### What's Working

- Slide-out panel is smooth (400ms ease-out-expo)
- Font size, theme, and focus mode are functional
- Annotation filter with debounced search works well
- Chapter nav inside the panel solves the old sidebar overlay bug
- Scroll progress bar provides passive reading feedback
- `prefers-reduced-motion` respected

### Problems

**P1 — Discoverability.** The floating button looks like a generic action button. First-time users won't know it contains reading controls, chapter navigation, AND annotation filtering. Three distinct functions hidden behind one unmarked button.

**P2 — No keyboard shortcuts for reading navigation.** Cmd+Enter exists for textareas, but there are no shortcuts for: prev/next chapter, toggle focus mode, toggle annotations, jump to chapter. For a reading-heavy app, this is a gap.

**P3 — The "Focus 4" label is cryptic.** What does the number mean? It appears to be focus mode level, but the UI doesn't explain it.

**P4 — Annotation count indicators in the left margin are subtle.** Small numbered badges appear next to paragraphs with annotations, but they're easy to miss. These are the primary way users discover that discussion exists on a passage.

### Recommendations

**2.1 — Add a persistent mini-toolbar below the scroll progress bar**
- File: `src/components/reading/ChapterReader.tsx`
- A thin bar (height: 36-40px) that sits below the scroll progress bar, visible while scrolling
- Contains: chapter title (truncated), font size A−/A+, focus mode toggle icon, annotation count badge
- Auto-hides after 3 seconds of no scroll (like video player controls), reappears on scroll
- This gives immediate access to the most-used controls without opening the full panel
- The floating button still opens the full panel for chapter nav, search, and settings

**2.2 — Add reading keyboard shortcuts**
- File: `src/components/reading/ChapterReader.tsx` (add `useEffect` with `keydown` listener)
- `←` / `→` or `j` / `k`: Previous/next chapter (with `router.push`)
- `f`: Toggle focus mode
- `a`: Toggle annotation visibility
- `?`: Show keyboard shortcut help overlay
- Only active when no input/textarea is focused
- Show shortcuts in the full panel as a small "Keyboard shortcuts" link

**2.3 — Rename focus mode label**
- File: `src/components/reading/ReadingBubble.tsx` or wherever the control renders
- Change "Focus 4" to "Focus Mode" with a simple on/off toggle
- If there are multiple focus levels, show them as "Focus: Reading Only" / "Focus: With Annotations" etc.

**2.4 — Make annotation indicators more visible**
- File: `src/components/reading/ChapterReader.tsx`
- Current: small numbered badges in the left margin
- Change: on hover over a paragraph with annotations, show a tooltip "3 annotations on this passage"
- Add a subtle left-border highlight (2px, `var(--accent-purple)` at 0.3 opacity) on paragraphs that have annotations
- This creates a visual "heat" pattern — readers can scan the left margin to see where discussion concentrates

**2.5 — Floating button should have a label or tooltip**
- File: component rendering the floating button
- Add `aria-label="Reading controls"` and a CSS tooltip on hover showing "Reading Controls"
- Consider adding a small text label below the icon on first visit (dismissable with localStorage)

---

## Part 3: Threads Enhancement Plan

### Current State

- Thread list shows type filter pills (All, Discussion, Reflection, Summary, etc.) + "New Thread" button
- Single-column card layout with type badge, title, author avatar, timestamp
- Thread detail shows: back link, type badge, title, author + **admin badge** (VIOLATION), body with markdown rendering, edit/delete buttons, reply section
- New thread form has 6 type cards with emoji + descriptions, related week dropdown, title, markdown body with "Quote from reading" button
- Reply section supports nested replies and Cmd+Enter submission

### What's Working

- Thread type cards in the composer are excellent — emoji + description helps users pick the right type
- "Quote from reading" button bridges reading and discussion
- Markdown rendering in thread bodies works well
- Blockquote styling is solid (left purple border, subtle background)
- Reply section has auto-resizing textarea

### Problems

**P1 — CRITICAL: Admin badge on thread detail page violates Freirean principles.**
- File: `src/app/(main)/threads/[id]/page.tsx` (lines 103-107)
- File: `src/components/threads/ReplySection.tsx` (lines 143-147)
- The code explicitly renders an "admin" badge next to the author name when `author.role === 'admin'`
- CLAUDE.md Rule 21: "Facilitator posts in threads must NOT be visually distinguished from member posts. No 'teacher' badge, no special styling."
- This must be removed immediately

**P2 — Thread list body preview is insufficient.** Thread cards show title + metadata, but body text preview is too short or absent. Rule 30: "Thread previews show enough body text to decide whether to click — 2-3 lines minimum."

**P3 — No reply count on thread cards.** Users can't tell if a thread has active discussion without clicking in.

**P4 — No thread search.** With a small group this is fine initially, but once there are 20+ threads across multiple weeks, finding past discussions becomes difficult.

**P5 — No "unread" indication.** The design intentionally avoids anxiety-producing unread counts, but there's no way at all to see what's new since your last visit. A subtle "new since your last visit" divider would respect calm tech principles while being useful.

**P6 — Single-column list wastes space at desktop.** See Part 1.

### Recommendations

**3.1 — URGENT: Remove admin badge from threads**
- File: `src/app/(main)/threads/[id]/page.tsx`
- Delete lines 103-107 (the `{thread.author?.role === 'admin' && (...)}` block)
- File: `src/components/threads/ReplySection.tsx`
- Delete lines 143-147 (same pattern in replies)
- All posts should look identical regardless of who wrote them

**3.2 — Enrich thread card previews**
- File: `src/app/(main)/threads/page.tsx` (or ThreadCard component if extracted)
- Each card should show:
  - Type badge (existing)
  - Title (existing)
  - **2-3 lines of body text** (truncated with `...`), rendered as plain text (strip markdown)
  - Author name + relative timestamp
  - Reply count: "3 replies" or "No replies yet"
  - Related week badge if set
- Use `line-clamp-3` (Tailwind) for body truncation

**3.3 — Add reply count to thread cards**
- Requires: a count query in the thread list page's data fetch
- Display as "💬 3" or "3 replies" below the body preview
- No "unread" count — just total replies

**3.4 — Add "new since last visit" divider (calm approach)**
- Store `last_visited_threads` timestamp in localStorage per user
- On thread list: show a subtle horizontal divider with text "New since [date]" between old and new threads
- On thread detail: show a subtle divider between old and new replies
- No count badges, no red dots, no notification icons — just a passive visual marker
- This respects calm tech while helping users find new content

**3.5 — Add thread search (when group grows)**
- File: `src/app/(main)/threads/page.tsx`
- Add a search input above the filter pills
- Client-side filter on title + body text (sufficient for <100 threads)
- If thread count grows, move to Supabase full-text search
- Priority: LOW — not needed for a group of 8 in early weeks

**3.6 — Two-column thread grid at desktop**
- See recommendation 1.2
- Each card becomes a self-contained unit with enough info to decide whether to click

---

## Part 4: Glossary Enhancement Plan

### Current State

- Search bar + "Add Term" button
- Empty state: "As we work through Capital together, we'll build a shared vocabulary here. Stumbled on a term? Add it." (excellent invitational language)
- GlossaryList component with search filtering
- GlossaryVersionHistory component exists (wiki-style edit history)
- GlossaryTooltip component exists (term highlighting on reading page)
- Schema: `term`, `definition`, `related_terms[]`, `first_appearance_week`

### What's Working

- The wiki-style model (any member can edit any definition) is pedagogically sound
- Version history preserves the evolution of understanding
- The empty state language is one of the best in the app
- Related terms array enables cross-referencing
- `first_appearance_week` links terms to the reading schedule

### Problems

**P1 — The glossary is empty.** For a group reading Capital, this is a critical gap. Chapter 1 alone introduces: commodity, use-value, exchange-value, value, abstract labour, concrete labour, socially necessary labour time, the value-form, relative form of value, equivalent form, money-form. The group shouldn't have to manually enter these.

**P2 — No visual hierarchy when populated.** When terms exist, they appear as a flat list. Capital's vocabulary has natural groupings: Chapter 1 value theory terms, Chapter 2-3 money/exchange terms, etc.

**P3 — GlossaryTooltip on reading page — unclear if it's active.** The component exists in the codebase, but without glossary entries, it can't function. When populated, terms in the reading text should show tooltip definitions on hover.

**P4 — No "I'm confused by this term" flag.** Users can flag paragraphs as confusing (ConfusionFlagButton), but can't flag individual glossary terms as needing better definition.

**P5 — Definition editing UX unknown.** The version history component exists, but the actual edit flow (inline edit? modal? separate page?) needs verification.

### Recommendations

**4.1 — Pre-seed glossary with Chapter 1 terms**
- Create a seed script or SQL insert for 15-20 essential Chapter 1 terms
- Each term needs: term name, initial definition (drawn from Marx's own definitions where possible), `first_appearance_week: 1`, empty `related_terms` initially
- Essential terms: commodity, use-value, exchange-value, value, abstract labour, concrete labour, socially necessary labour time, value-form, relative form of value, equivalent form, money-form, fetishism of commodities, labour-power (preview for later chapters)
- Definitions should be SHORT (2-3 sentences) and explicitly note "this definition will evolve as we read further"
- This seeds the collaborative process — members edit and improve, not start from scratch

**4.2 — Group terms by chapter/week of first appearance**
- File: `src/components/glossary/GlossaryList.tsx`
- Default view: group terms under headers like "Week 1: The Commodity" / "Week 2: Exchange"
- Toggle to alphabetical view
- Each group header shows the week number and reading title from the schedule
- This creates a timeline of the group's growing vocabulary

**4.3 — Verify and activate GlossaryTooltip on reading pages**
- File: `src/components/reading/GlossaryTooltip.tsx` and `ChapterReader.tsx`
- Ensure the tooltip system works end-to-end: detect glossary terms in chapter text → render as subtle underline (dotted, `var(--accent-purple)` at 0.4 opacity) → show definition tooltip on hover
- Tooltip should include: term, short definition, "See full entry →" link to glossary page
- Only activate for terms that exist in the glossary (not a predefined list)

**4.4 — Add "needs better definition" flag on glossary entries**
- Similar pattern to confusion flags but for glossary
- Anonymous count: "3 members think this definition needs work"
- Surfaces terms that need group attention without shaming the original author

**4.5 — Add "term of the week" to dashboard**
- File: `src/app/(main)/dashboard/page.tsx`
- In the right sidebar: show 1-2 recently added or recently edited glossary terms
- "This week's vocabulary: exchange-value — the proportion in which use-values of one kind exchange for use-values of another kind..."
- Links to the full glossary entry
- Keeps the glossary visible even when people aren't actively on the glossary page

---

## Part 5: Resources Enhancement Plan

### Current State

- Filter pills: All, Primary Text, Companion, Lecture, Article, Tool, Other
- "Add Resource" button
- Empty state: "Companion texts, lecture videos, and tools to help with the reading will be collected here."
- Schema: `title`, `url`, `resource_type`, `week_id`

### Problems

**P1 — The page is empty.** For a Capital reading group, there are well-known essential resources that should be pre-loaded.

**P2 — Resources are flat list, no context.** A URL alone doesn't tell you WHY this resource is useful or WHEN to use it. The schema has `week_id` for tying resources to weeks, but resources need descriptions too.

**P3 — No resource descriptions in the schema.** The `resources` table has `title`, `url`, `resource_type`, `week_id` but no `description` or `notes` column.

**P4 — Card layout would serve resources better than a list.** Resources are browsed visually — type icon, title, description, source domain make scanning fast.

### Recommendations

**5.1 — Add `description` column to resources table**
- SQL: `ALTER TABLE resources ADD COLUMN description TEXT;`
- Update TypeScript types in `src/types/database.ts`
- Update the add resource form to include a description textarea

**5.2 — Pre-seed essential resources**
- Seed with 10-15 resources the group will actually use:
  - **Primary Text:** Capital Vol I full text (marxists.org), Capital Vol I PDF
  - **Companion:** David Harvey's companion to Capital, Michael Heinrich's "Introduction to the Three Volumes of Capital", Harry Cleaver's "Reading Capital Politically"
  - **Lecture:** David Harvey's lecture series (YouTube playlist — free, 13 lectures), Brendan Cooney's "Kapitalism 101" video series
  - **Article:** East Bay DSA's Capital reading guide, Marx's 1867 Preface to the First Edition
  - **Tool:** marxists.org glossary of terms, Marxist Internet Archive
- Each with a 1-2 sentence description of why it's useful
- Set `week_id` where relevant (e.g., Harvey Lecture 1 → Week 1)

**5.3 — Card grid layout**
- File: `src/app/(main)/resources/page.tsx` and/or `src/components/resources/ResourcesList.tsx`
- Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop
- Each card: type icon (color-coded by resource_type), title, description (2 lines truncated), source domain extracted from URL, "Open →" external link
- Resource type color coding: Primary=red, Companion=purple, Lecture=blue, Article=green, Tool=gray

**5.4 — Group resources by week (optional view)**
- Toggle between "By Type" (current filter pills) and "By Week"
- "By Week" groups resources under week headers: "Week 1: The Commodity" / "Week 2: Exchange" / "General (no week)"
- Helps members find resources relevant to the current reading

**5.5 — "Recommended this week" section on dashboard**
- File: `src/app/(main)/dashboard/page.tsx`
- In the right sidebar: show 1-2 resources tagged with the current week's `week_id`
- "This week's companion: David Harvey, Lecture 3 — The chapter on money" with external link
- Surfaces resources at the moment they're most useful

---

## Part 6: Animation & Interaction Gaps

### Current Animation System — Summary

The animation system is well-built and consistent:
- 10 keyframe animations, 3 easing functions, 3 duration presets
- 28 components use animations
- 5 skeleton loading states
- CSS Grid collapsibles (GPU-accelerated)
- `prefers-reduced-motion` fully supported
- All timing uses CSS custom property tokens

### What's Working Well

- Slide-in panels (annotation panel, mobile drawer) are smooth
- Collapsible parts use CSS Grid 0fr→1fr — correct pattern
- Staggered children create pleasant cascade on lists
- Theme transitions smoothly animate all elements
- Toast notifications have proper enter/exit animations
- Button press feedback (scale 0.97) feels tactile
- Skeleton shimmer loading states exist for key pages

### Gaps Found

**6.1 — No skeleton loading for glossary page**
- Files with skeletons: dashboard, threads list, thread detail, reading TOC, chapter page
- Missing: glossary, schedule, resources, profile
- Priority: Add skeleton for glossary (it will be frequently loaded once populated)

**6.2 — No transition on thread type filter change**
- When clicking filter pills on the threads list, cards appear/disappear instantly
- Should: fade out filtered cards, fade in matching cards (150ms)
- Use `.animate-fade-in` on newly visible cards

**6.3 — No animation on "Add Term" / "Add Resource" form appearance**
- When the add form appears, it should slide down or fade in
- Use existing `.animate-fade-in` class

**6.4 — Sidebar collapse/expand needs tooltip animation**
- Collapsed sidebar icons should show tooltips on hover (`.sidebar-link-collapsed::after` CSS exists but needs verification that it's working)
- Tooltip should fade in (150ms) with a slight delay (200ms) to prevent flicker on fast mouse movement

**6.5 — No micro-animation on reading check-in button state change**
- When clicking Done/Partial/Behind, the button changes color but doesn't animate
- Add a brief scale pulse (1.0 → 1.05 → 1.0, 200ms) on selection to confirm the click registered

**6.6 — Chapter navigation cards (prev/next) lack hover animation**
- The bottom-of-chapter navigation cards should use `.card-hover` (translateY(-2px) + shadow on hover)
- Currently they may be static

**6.7 — No page-level enter animation on profile page**
- File: verify `src/app/(main)/profile/page.tsx`
- Should use `.animate-page-enter` or the template.tsx pattern for route transition

### Recommendations (all LOW priority — the animation system is solid)

- Add skeleton loaders for glossary, schedule, resources pages
- Add fade transitions on thread filter changes
- Add `.card-hover` to chapter navigation cards
- Add scale pulse on reading check-in state change
- Verify sidebar tooltips work in collapsed state
- All of these use existing animation classes — no new keyframes needed

---

## Part 7: Missing Features Checklist

### Features From CLAUDE.md — Status Audit

| # | Feature | Status | Files | Notes |
|---|---------|--------|-------|-------|
| 1 | Confusion flags (anonymous paragraph flags) | ⚠️ PARTIAL | `ConfusionFlagButton.tsx`, `confusion-flags.ts` | Component and utility exist, but **no `confusion_flags` database table**. Listed in CLAUDE.md "Must fix before launch." |
| 2 | Annotation → thread promotion | ✅ EXISTS | `AnnotationPanel.tsx`, `NewThreadForm.tsx` | Annotation panel has promotion flow, new thread form accepts quote context |
| 3 | GlossaryTooltip (term highlighting on reading page) | ✅ EXISTS | `GlossaryTooltip.tsx`, `ChapterReader.tsx` | Component built, detection logic in reader. Needs populated glossary to function. |
| 4 | Glossary version history | ✅ EXISTS | `GlossaryVersionHistory.tsx` | Wiki-style edit tracking |
| 5 | Rotating roles display | ✅ EXISTS | `RoleBadge.tsx`, dashboard | Roles shown on dashboard with weekly assignments |
| 6 | SelectionToolbar (text selection actions) | ✅ EXISTS | `SelectionToolbar.tsx` | Scale-in animation on text selection, offers annotate action |
| 7 | "Quote from reading" in thread composer | ✅ EXISTS | `NewThreadForm.tsx`, `QuoteFromReadingModal.tsx` | Modal for selecting passages to quote |
| 8 | ConceptMap | ⚠️ HIDDEN | `ConceptMap.tsx`, `concepts/page.tsx` | Route exists at `/concepts` but not in navigation. Either ship or remove. |
| 9 | SessionNotes | ✅ EXISTS | `SessionNotes.tsx`, schedule page | Collapsible notes on schedule week cards |
| 10 | MilestoneCard | ✅ EXISTS | `MilestoneCard.tsx`, dashboard | Reading milestones displayed |
| 11 | NavigationProgress (route transitions) | ✅ EXISTS | `NavigationProgress.tsx` | Red progress bar with glow on route change |
| 12 | Scroll progress bar (reading page) | ✅ EXISTS | `ChapterReader.tsx` | 2px purple bar, differentiates from red nav progress |
| 13 | Dark mode reading warmth | ✅ EXISTS | `globals.css` line 631 | `html[data-theme="dark"] .reading-text` warm color applied |
| 14 | Chapter-to-chapter navigation | ✅ EXISTS | Chapter page (bottom) | Card-style prev/next with chapter titles |
| 15 | Profile / My Journey page | ✅ EXISTS | `profile/page.tsx` | Shows activity stats, recent annotations, role history, reading journey |
| 16 | Group Thinking Overview | ✅ EXISTS | `GroupThinkingOverview.tsx` | Per-section annotation counts + themes on dashboard |
| 17 | Draft auto-save | ✅ EXISTS | `ChapterReader.tsx`, `NewThreadForm.tsx` | localStorage-based draft persistence |
| 18 | OnboardingHint | ✅ EXISTS | `OnboardingHint.tsx` | Dismissable hints for first-time users |
| 19 | Auth middleware | ⚠️ DISABLED | `middleware.ts`, `(main)/layout.tsx` | Code preserved with `// TODO: RE-ENABLE AUTH`. Must enable before launch. |

### Features NOT in Codebase — Potential Additions

| # | Feature | Priority | Rationale |
|---|---------|----------|-----------|
| 1 | `confusion_flags` database table | **CRITICAL** | Core pedagogy. Anonymous confusion is the "most valuable data." DB table blocks the feature. |
| 2 | Thread search | LOW | Not needed for 8 people in early weeks. Add when thread count > 20. |
| 3 | Reading keyboard shortcuts | MEDIUM | Power users (and accessibility) benefit from keyboard nav on reading pages. |
| 4 | "New since last visit" markers | LOW | Calm alternative to unread counts. localStorage timestamp comparison. |
| 5 | Term-of-the-week on dashboard | LOW | Keeps glossary visible. Simple query: most recently edited term. |
| 6 | Resource descriptions column | MEDIUM | Resources need context. `ALTER TABLE resources ADD COLUMN description TEXT`. |
| 7 | Pre-seeded glossary terms | HIGH | Chapter 1 terms are essential. Group shouldn't start from zero. |
| 8 | Pre-seeded resources | HIGH | Known resources exist. Platform should arrive with them loaded. |
| 9 | Skeleton loaders for all pages | LOW | Missing for glossary, schedule, resources, profile. Existing pattern makes these quick to add. |

---

## Part 8: Priority Ranking

### Tier 1 — Must Fix (Blocks Launch or Violates Core Principles)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | **Remove admin badge from threads** (3.1) | 15 min | CRITICAL — violates Freirean principle, Rule 21 |
| 2 | **Create `confusion_flags` database table** (7.1) | 1-2 hrs | CRITICAL — core pedagogy feature is blocked |
| 3 | **Re-enable auth middleware** (7.19) | 2-3 hrs | CRITICAL — anyone can access the site without login |

### Tier 2 — High Impact, Ship Before First Session

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 4 | **Pre-seed glossary with Ch1 terms** (4.1) | 1-2 hrs | HIGH — group needs vocabulary from day one |
| 5 | **Pre-seed essential resources** (5.2) | 1-2 hrs | HIGH — known resources should be there on arrival |
| 6 | **Enrich thread card previews** (3.2) | 2-3 hrs | HIGH — body preview + reply count make threads scannable |
| 7 | **Add `description` column to resources** (5.1) | 30 min | MEDIUM — schema change, enables richer resource cards |
| 8 | **Resources card grid layout** (5.3) | 2-3 hrs | MEDIUM — transforms empty-feeling page into useful grid |

### Tier 3 — Quality Polish, Ship in First 2 Weeks

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 9 | **Reduce dead space / widen layouts** (1.1, 1.4) | 2-3 hrs | MEDIUM — makes app feel more professional at desktop |
| 10 | **Threads two-column grid** (1.2, 3.6) | 2 hrs | MEDIUM — better space usage on threads list |
| 11 | **Group glossary by week** (4.2) | 2 hrs | MEDIUM — natural vocabulary timeline |
| 12 | **Glossary tooltip verification** (4.3) | 1-2 hrs | MEDIUM — ensures reading↔glossary bridge works |
| 13 | **Reading toolbar floating button label** (2.5) | 30 min | LOW — improves discoverability |
| 14 | **Focus mode label clarity** (2.3) | 15 min | LOW — "Focus 4" → "Focus Mode" |
| 15 | **Annotation paragraph indicators** (2.4) | 1-2 hrs | MEDIUM — makes annotation density visible |

### Tier 4 — Nice to Have, Build When Time Allows

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 16 | **Reading keyboard shortcuts** (2.2) | 2-3 hrs | MEDIUM — power users and accessibility |
| 17 | **Persistent mini-toolbar on reading page** (2.1) | 3-4 hrs | MEDIUM — surfaces controls without opening panel |
| 18 | **"New since last visit" markers** (3.4) | 2-3 hrs | LOW — calm unread alternative |
| 19 | **Skeleton loaders for remaining pages** (6.1) | 1-2 hrs | LOW — consistency, existing pattern |
| 20 | **Animation polish** (6.2-6.7) | 2-3 hrs | LOW — filter transitions, hover states, micro-interactions |
| 21 | **Term-of-the-week on dashboard** (4.5) | 1 hr | LOW — keeps glossary visible |
| 22 | **Resources "recommended this week"** (5.5) | 1 hr | LOW — surfaces timely resources |
| 23 | **Thread search** (3.5) | 2-3 hrs | LOW — not needed yet for group of 8 |
| 24 | **"Needs better definition" flag on glossary** (4.4) | 2-3 hrs | LOW — collaborative quality signal |
| 25 | **Concept map: ship or remove** (7.8) | 1-4 hrs | LOW — hidden route is tech debt |
| 26 | **Resources by-week view** (5.4) | 1-2 hrs | LOW — helpful but not essential |

---

## Total Estimated Effort

| Tier | Items | Estimated Hours |
|------|-------|-----------------|
| Tier 1 (Must Fix) | 3 | 3.5-5.5 hrs |
| Tier 2 (Before First Session) | 5 | 7-10.5 hrs |
| Tier 3 (First 2 Weeks) | 7 | 9-12.5 hrs |
| Tier 4 (When Time Allows) | 11 | 17-26 hrs |
| **Total** | **26** | **36.5-54.5 hrs** |

---

## Honest Assessment

The app has improved significantly since the last design review. The dashboard two-column layout, chapter navigation, thread type cards, profile page, and reading controls panel are all real improvements. The animation system is mature and consistent — that's unusual for a project at this stage.

The biggest gaps are content, not code. An empty glossary and empty resources page make the platform feel unfinished, but those are data problems solved by seeding. The admin badge on threads is the one genuine code violation of the project's own principles — it's a 15-minute fix and should be done first.

The reading page is the strongest part of the app. The annotation system, focus mode, scroll progress, and chapter navigation create a cohesive reading experience. The remaining reading page improvements (keyboard shortcuts, persistent toolbar, better annotation indicators) are refinements, not fixes.

The weakest part is space utilization on non-reading pages. The threads list, resources page, and glossary all feel sparse because they're constrained to narrow single columns on wide viewports. The card grid recommendations for threads and resources would transform these pages.

For launch readiness with a group of 8: fix the admin badge, create the confusion flags table, re-enable auth, seed the glossary and resources, and improve thread card previews. That's Tiers 1 and 2 — roughly 10-16 hours of work. Everything else can ship incrementally as the group starts reading.
