# Capital Study Group vs PMN Pulse — Design Comparison & Bug Report

**Date:** 15 March 2026
**Reviewer:** Claude (Cowork mode with Chrome extension)
**Sites tested:**
- Capital Study Group (CSG): https://capitalstudygroup.netlify.app
- PMN Pulse: https://warm-zuccutto-ba2636.netlify.app
**Viewport:** Desktop ~1560×900, Mobile 375×812

---

## Part 1: Critical Bugs

### BUG 1 — CRITICAL: Chapter Navigation Sidebar Overlays Reading Text

**Severity:** Critical — blocks the core feature
**Pages affected:** Every chapter page (`/reading/capital-vol-1/[n]`)
**Both desktop and mobile**

The "CHAPTERS" collapsible sidebar (containing Part 1–8 with chapter links) renders directly on top of the reading text content. "Ch 1, §1", "Ch 1, §3", "Ch 2", "► Part 2", "► Part 3" etc. all overlay Marx's prose. The section tab pills (the 4 buttons for sections 1–4) are also partially obscured.

**Root cause (likely):** The chapter navigation element is positioned absolutely or fixed but has no `left` offset accounting for the main sidebar width, or it's using `z-index` that places it above the reading text container. The element appears to be a left-edge overlay meant to sit in its own column, but it's landing inside the text column's space.

**Impact:** The reading page is the core feature of the entire platform. It is currently unusable for any chapter that has this sidebar visible. Users cannot read the text without the chapter nav overlapping it.

**Fix priority:** This must be fixed before anything else.

---

### BUG 2 — HIGH: Sidebar Nav Doesn't Collapse on Mobile

**Severity:** High — breaks mobile usability
**Pages affected:** All pages at ≤375px width

The left sidebar navigation remains fully visible at mobile width (375px). It takes up approximately 220px of the 375px viewport, leaving only ~155px for content. The main content area is pushed to the right and partially off-screen.

The CSS includes `.mobile-tab-bar` styles (a fixed bottom nav pattern), which suggests the intention was to hide the sidebar and show a bottom tab bar on mobile. But this isn't happening — the sidebar persists.

**Note:** PMN Pulse has the same issue at 375px — its sidebar also doesn't collapse. Both sites share this bug, suggesting the responsive breakpoint handling in the sidebar component isn't implemented yet.

**Fix priority:** High — must be resolved for any mobile user to use the site.

---

### BUG 3 — MEDIUM: React #418 Hydration Mismatch (Still Firing)

**Severity:** Medium — console error on every page load
**Pages affected:** All pages (observed on Dashboard, Reading)

The React #418 hydration error (text content mismatch between server and client) fires on every page navigation. This was previously identified and supposedly fixed with `suppressHydrationWarning` on the TimeAgo component (commit 59ae23e), but it's still throwing in production.

**Possible causes:**
- The `suppressHydrationWarning` may not be on the correct parent element
- There may be a second component (not TimeAgo) also producing server/client mismatches — possibly the new sidebar or theme-related components
- The production build may not include the fix (check if the latest deploy includes commit 59ae23e)

**Impact:** No visual breakage for users, but 5 error stack traces in the console per page load is not clean. It may mask other genuine errors during debugging.

---

### BUG 4 — LOW: Login Page "Capital / Study Group" Name Split

**Severity:** Low — cosmetic
**Page:** `/login`

The login page's left panel displays the name as:
```
Capital
Study Group
```

With "Capital" in bold white and "Study Group" in lighter weight below it. This is consistent with the sidebar nav treatment. Whether this is a bug or intentional depends on whether you want "Capital Study Group" to always read as one phrase. On the login page specifically, the line break makes "Capital" look like it could be the product name on its own, with "Study Group" as a subtitle.

---

## Part 2: Side-by-Side Design Comparison

### Overview

PMN Pulse is a newsroom analytics dashboard. Capital Study Group is a collaborative reading platform. They serve entirely different purposes, so the comparison isn't about features — it's about the **level of craft** in layout, typography, spacing, and interaction design.

**The honest summary:** PMN Pulse operates at a professional product quality level. CSG operates at a solid early-stage project level. The gap isn't about taste — CSG's color choices and reading page typography show strong taste. The gap is about **density of considered decisions per square inch of screen.**

---

### Category 1: Navigation

**PMN Pulse:**
- Sidebar with 4 grouped sections (main nav, FIND STORIES, WRITING TOOLS, GROWTH), each with a labeled header in small gray caps
- Icons on every nav item (consistent monoline style)
- Active state: filled/highlighted background with accent color text
- User profile at bottom with avatar, name, role, and logout button
- Top bar: page title with icon, global search (⌘K shortcut), sync button, AI button
- The sidebar feels like a well-organized toolbox — you know where to find things even on first visit

**Capital Study Group:**
- Sidebar with flat list of 6 items (Dashboard, Reading, Threads, Glossary, Schedule, Resources)
- Icons on every item (good)
- Active state: accent-colored text with subtle left highlight
- "Capital / Study Group" wordmark at top
- Theme toggle (moon icon) at bottom left, Guest + Sign In at bottom
- No search, no top bar beyond the content area

**Gap analysis:** CSG's nav is functional but flat. PMN Pulse's grouped sections create information architecture — the labels (FIND STORIES, WRITING TOOLS, GROWTH) tell you what category of tool you're entering. CSG has 6 items so grouping isn't strictly necessary, but even a subtle divider between "content pages" (Dashboard, Reading, Threads) and "reference pages" (Glossary, Schedule, Resources) would add structure.

The bigger gap is the **top bar**. PMN Pulse has a persistent page title with icon, search, and utility buttons. CSG has nothing between the sidebar and the content — the page title just appears in the content area. A minimal top bar (even just the page name) would give the layout a stronger spine.

**CSG score: 6/10 | PMN Pulse score: 9/10**

---

### Category 2: Layout & Spacing

**PMN Pulse:**
- Three-column layout on dashboard (sidebar | main content | right panel)
- Consistent 24px gap between cards
- Content area has generous padding (32px+)
- Cards have clear visual boundaries with subtle borders and 12px border radius
- The live ticker bar, stats row, and tab bar create distinct horizontal "zones" that give the dashboard rhythm
- No wasted space — every area has purpose

**Capital Study Group:**
- Two-column layout (sidebar | main content)
- Cards have borders but minimal shadow distinction from background
- Content area padding is adequate but not generous
- The dashboard is a vertical stack: welcome header → This Week's Reading card → Activity → (more below fold)
- A lot of vertical scrolling to see all dashboard content
- The "This Week's Reading" card is very tall — it contains the week label, title, page range, description, session info, discussion prompts (3 questions), AND progress buttons all in one card

**Gap analysis:** PMN Pulse's three-column dashboard is a major structural advantage — the right panel (AI Insights, Devices, Content Pipeline) provides contextual information without competing with the main content. CSG's single-column content area means everything stacks vertically, making the dashboard feel like a long scroll rather than a dashboard.

The biggest issue is card density. PMN Pulse's "Performance by Category" table, stat cards, and article list each have clear visual weight and breathing room. CSG's "This Week's Reading" card tries to contain too much (description, session details, prompts, and progress all in one card), creating a wall of text that lacks hierarchy.

**CSG score: 5/10 | PMN Pulse score: 9/10**

---

### Category 3: Typography

**PMN Pulse:**
- Clean sans-serif throughout (Inter or similar)
- Page titles: large, bold, with icon prefix — "Dashboard", "Articles", "Leaderboard"
- Numbers are the hero: "247.9k", "42.5K", "#7" — large, high-contrast, immediately scannable
- Label text in muted gray with consistent sizing
- Category names get color-coded dots
- Overall: typography serves data legibility above all

**Capital Study Group:**
- Inter for UI, Lora serif for reading text (good differentiation)
- Page titles in accent red, bold — "Welcome to Capital Study Group", "Discussion Threads"
- Body text is well-sized and readable
- The reading page typography is excellent: Lora at 1.125rem, 1.8 line-height, 68ch max-width
- Section labels use ALL-CAPS tracking extensively ("WEEK 2", "YOUR PROGRESS", "DISCUSSION PROMPTS")

**Gap analysis:** CSG's reading typography is genuinely strong — potentially better than anything PMN Pulse has to offer, because PMN Pulse doesn't have a reading-focused page. For the reading page, CSG is operating at the right level.

The gap is in **UI typography**. PMN Pulse uses type weight and size to create instant visual hierarchy — you know what's most important on any screen in under a second. CSG's dashboard typography is more uniform: the welcome heading is large and red, but beneath it, the card content is all roughly the same size and weight. Discussion prompts, session info, and progress buttons all compete visually.

The ALL-CAPS section labels (noted in the earlier design review) remain overused. PMN Pulse uses small gray caps sparingly for section grouping (FIND STORIES, WRITING TOOLS) — CSG uses them for everything.

**CSG score: 7/10 | PMN Pulse score: 8.5/10**

---

### Category 4: Cards & Containers

**PMN Pulse:**
- Cards have subtle borders + very faint background fill on dark theme
- Each card has a clear header (icon + title) and well-structured content
- The stat cards at the top use a grid of 4 equal-width cards — clean alignment
- Cards feel like surfaces — they have visual weight and seem to "sit" on the background
- Different card types for different content (stat card, table card, list card, insight card)

**Capital Study Group:**
- Cards have thin borders on white backgrounds (#ffffff on #faf9fc — ~1% contrast difference)
- "This Week's Reading" card has a dark header bar (good) but the body is a monolith
- The "This Week's Activity" section and thread cards are basic bordered rectangles
- Thread filter pills (All Types, Discussion, Reflection...) are clean but generic
- Cards don't feel like distinct surfaces — they feel like outlines drawn around content

**Gap analysis:** This is where the biggest craft gap shows. PMN Pulse's cards feel like physical objects with depth. CSG's cards feel like wireframe placeholders. The `card-elevated` class exists in globals.css now (added recently), which should help, but the cards still read as flat.

Specific improvements needed: each card type (weekly reading, activity summary, thread preview, schedule week) should have its own visual character. The weekly reading card needs internal structure — break it into visually distinct zones (reading assignment, session info, discussion prompts, progress) rather than one continuous text flow.

**CSG score: 4/10 | PMN Pulse score: 9/10**

---

### Category 5: Color System

**PMN Pulse:**
- Dark mode primary with rich accent palette: green (#4ade80), purple (#a78bfa), pink (#f472b6), orange (#fb923c), cyan (#22d3ee)
- Each content category has its own color (Pacific News = purple, Sports = pink, etc.)
- Color is used as a data encoding mechanism, not decoration
- The green accent serves as the primary action/success color
- Color creates visual variety without feeling chaotic

**Capital Study Group:**
- Two-accent system: revolutionary red (#a31545) + scholarly purple (#5c3d8f)
- This is a meaningful, considered palette — the colors carry ideological weight
- Dark mode properly adapts (accents brighten for legibility)
- Green (#4a6741) for success states
- The problem isn't the palette — it's that **most of the screen is gray/white/neutral**

**Gap analysis:** CSG's two-accent palette is actually a strength from a branding perspective. Red for action, purple for knowledge — that's a genuine design concept. But it's underutilized. The dashboard is overwhelmingly neutral. The only strong color hits are the page title (red) and the occasional purple badge.

PMN Pulse feels colorful because it uses color functionally throughout — every data category, every metric, every badge has a deliberate color. CSG could do the same: thread types could each have a color, annotation types could have colors, weekly progress could use color to indicate status. The palette exists but it's hiding.

**CSG score: 7/10 | PMN Pulse score: 9/10**

---

### Category 6: Buttons & Interactive Elements

**PMN Pulse:**
- Primary buttons: filled with accent color, rounded, clear hierarchy
- Tab pills: filled active state with subtle background, icons in tabs
- Stat badges: colored with +/- indicators, clear status encoding
- "viral" and "growing" badges on articles use bright colors with dark text
- Interactive elements telegraph their purpose immediately

**Capital Study Group:**
- "New Thread" button: filled red, prominent — good
- "Sign In" button on login: filled red — good
- Progress buttons (Done/Partial/Behind): outlined, same size, no color differentiation
- Thread type filter pills: outlined, active state fills
- "Read →" on TOC: now visible on mobile (fix confirmed)
- Buttons have the `btn-transition` with scale(0.97) active state — nice tactile feel

**Gap analysis:** CSG's buttons work but lack personality. The Done/Partial/Behind buttons are three identical outlined buttons in a row — they should use color to encode status (green for Done, amber for Partial, red for Behind). PMN Pulse's badges and indicators always use color as information, not just decoration.

The `btn-primary` and `btn-secondary` classes in globals.css are a good foundation. The next step is applying them consistently and adding contextual color to buttons that represent states or categories.

**CSG score: 5.5/10 | PMN Pulse score: 8.5/10**

---

### Category 7: Mobile Responsiveness

**PMN Pulse:**
- Sidebar persists at 375px (same bug as CSG)
- When sidebar is visible, main content is pushed and partially visible
- Content within the main area appears to resize correctly
- No bottom tab bar visible

**Capital Study Group:**
- Sidebar persists at 375px (broken — should hide)
- `.mobile-tab-bar` CSS exists but isn't activating
- Chapter sidebar overlay bug is present on mobile too
- Reading text runs nearly edge-to-edge (noted in previous review — padding increased to 1.25rem but still tight)

**Gap analysis:** Both sites share the mobile sidebar bug, so this is a wash on that front. But CSG has the additional chapter overlay bug on mobile, making the reading page completely unusable on phones. Since mobile is where a significant portion of the reading group (especially younger members) will access the platform, fixing mobile is critical.

**CSG score: 3/10 | PMN Pulse score: 4/10** (both broken on mobile)

---

### Category 8: Empty States

**PMN Pulse:**
- Not tested (all pages had data)
- The Leaderboard and Articles pages have rich content, so empty states weren't visible

**Capital Study Group:**
- Empty states are a genuine strength: "As we work through Capital together, we'll build a shared vocabulary here. Stumbled on a term? Add it." (Glossary)
- The invitational tone is excellent — warm, human, Freirean
- Resources and Threads pages also have welcoming empty states
- This is one area where CSG's design philosophy shines through

**Gap analysis:** CSG wins here on tone and philosophy. Every empty state is an invitation, not an error. This reflects the platform's core design principle: warmth is structural. PMN Pulse likely has good empty states too, but they weren't visible in testing.

**CSG score: 8.5/10 | PMN Pulse score: N/A (not tested)**

---

### Category 9: Animations & Transitions

**PMN Pulse:**
- Page transitions feel smooth
- Cards and content appear to load with subtle fade-ins
- The live ticker updates feel real-time
- Sparkline charts animate on load
- Overall: polished but restrained — animations serve function

**Capital Study Group:**
- `animate-fade-in` with stagger-children works well on page content
- Collapsible sections (Schedule, Reading TOC) use CSS grid 0fr→1fr — genuinely smooth
- `btn-transition` with scale(0.97) on active — good tactile feedback
- Card hover lifts (translateY -2px) are subtle and appropriate
- Theme toggle transition: partially working (body transitions, but child elements may flash)
- No page exit animations (content just swaps)
- The `@keyframes pageEnter` was recently added — a step in the right direction

**Gap analysis:** CSG's animation infrastructure is actually good. The ease-out-expo curve, stagger timing, and collapsible technique are well-engineered. The gap is in **coverage** — animations exist on some elements but not others, and there's no exit animation creating a sense of abruptness when navigating.

**CSG score: 7/10 | PMN Pulse score: 8/10**

---

### Category 10: Overall Feel

**PMN Pulse:**
- Feels like a professional SaaS product
- Information-dense but not cluttered — every pixel is working
- The dark theme with colorful accents creates visual energy
- You feel like you're using a powerful tool
- Consistent quality across every page that's finished

**Capital Study Group:**
- Feels like a thoughtful early-stage project with strong foundations
- The reading page feels significantly more polished than the dashboard
- There's a gap between the design *intent* (warm, scholarly, institutional) and the design *execution* (flat cards, sparse color, generic spacing)
- The login page redesign (split layout with Freire quote) shows the right direction
- The sidebar nav is a good structural choice but needs refinement

**Gap analysis:** The fundamental difference: PMN Pulse has consistent craft across all surfaces. CSG has peaks (reading page, empty states, color system concept) and valleys (dashboard layout, card design, mobile). The path forward isn't to make CSG look like PMN Pulse — it's to bring the valley pages up to the peak quality that already exists on the reading page.

**CSG score: 5.5/10 | PMN Pulse score: 9/10**

---

### Comparison Summary Table

| Category | CSG | PMN Pulse | Gap | Priority |
|----------|-----|-----------|-----|----------|
| Navigation | 6 | 9 | -3 | Medium |
| Layout & Spacing | 5 | 9 | -4 | High |
| Typography | 7 | 8.5 | -1.5 | Low |
| Cards & Containers | 4 | 9 | -5 | **Critical** |
| Color System | 7 | 9 | -2 | Medium |
| Buttons & Interactive | 5.5 | 8.5 | -3 | Medium |
| Mobile | 3 | 4 | -1 | **Critical** (both broken) |
| Empty States | 8.5 | N/A | +∞ | — (strength) |
| Animations | 7 | 8 | -1 | Low |
| Overall Feel | 5.5 | 9 | -3.5 | High |
| **Average** | **5.85** | **8.4** | **-2.55** | |

---

## Part 3: Title and Branding Evaluation

### Current State

The name "Capital Study Group" works functionally — it says what the platform is. But it has some tension:

**The good:**
- It's descriptive and honest
- "Capital" immediately signals the text being studied
- "Study Group" signals community, not individual consumption
- The shortened "Capital / Study Group" split in the sidebar and login creates a visual hierarchy

**The concerns:**
- "Capital Study Group" could be mistaken for a financial/investment group out of context
- The name is generic — it describes *any* group reading Capital, not *this* group
- "Christchurch Capital Reading Group" appears as a subtitle on the dashboard but isn't the primary brand
- The previous name "Critical Consciousness" was more distinctive and carried the Freirean philosophy in the name itself

### Name Treatment in the UI

The split treatment ("Capital" bold, "Study Group" lighter weight below) works well in the sidebar. It creates a logo-like wordmark without needing an actual logo. The purple accent line beneath on the login page is a nice touch.

However, the dashboard says "Welcome to Capital Study Group" as one phrase, while the sidebar says "Capital / Study Group" as two lines. This inconsistency might feel intentional (the sidebar is compact) but it reads as two different brands.

### Recommendations

1. **If keeping "Capital Study Group"** — commit to the two-line split ("Capital" / "Study Group") as the brand mark everywhere. Make the dashboard welcome say "Welcome to Capital" with "Study Group" as the subtitle, matching the sidebar. Consider a small typographic logo treatment: "Capital" in Lora serif (connecting to the reading experience) with "Study Group" in Inter (connecting to the UI).

2. **If considering alternatives** — "Critical Consciousness" was more distinctive. But if the platform will eventually host multiple texts and groups, "Capital Study Group" is more accurate for *this* group. Consider making the platform name different from the group name: e.g., the platform is "Critical Consciousness" but this group within it is "Christchurch Capital Reading Group."

3. **The Freire quote on the login page is a strong branding element.** "Reading the world precedes reading the word" immediately signals what kind of space this is. Consider rotating quotes weekly from Capital or from Freire to keep the login page feeling alive.

---

## Part 4: Quality of Life & Feature Gap Analysis

These are informed by what PMN Pulse does well and what CSG currently lacks.

### 4a. Global Search (High Impact)

PMN Pulse has a persistent ⌘K search in the top bar. For a text-heavy platform like CSG, search is arguably more important — users need to find specific passages, glossary terms, thread discussions, and annotations. A global search that indexes chapter text, glossary entries, thread titles, and annotation content would be transformative.

### 4b. Page Title Bar / Breadcrumb Consistency

PMN Pulse has a consistent top bar on every page: icon + page title. CSG's page titles live inside the content area and vary in treatment. A consistent top bar (even just a thin strip showing the page name and breadcrumb) would give the layout a stronger structural backbone. The reading page already has breadcrumbs ("Reading › Capital, Volume I › Chapter 1, Section 1") — extend this pattern to all pages.

### 4c. Dashboard Information Architecture

PMN Pulse's dashboard uses three columns to show different types of information simultaneously: main metrics, contextual insights, and pipeline. CSG's dashboard is a single vertical scroll. Consider restructuring the dashboard with:
- **Left/main column:** This Week's Reading (condensed — just title, page range, and "Read" CTA), followed by This Week's Activity
- **Right sidebar column:** Discussion Prompts, Your Roles, Quick Links
- Break the massive "This Week's Reading" card into smaller, scannable cards

### 4d. Progress Visualization

PMN Pulse uses sparklines, progress bars, and percentage badges to show trends. CSG has "Week 2 of 4" with a thin progress line — this is a start but could be richer. Consider:
- A reading progress bar that shows percentage through the full book (not just weeks completed)
- Visual indicators on the Reading TOC showing which chapters you've read, annotated, or have unread annotations in
- An "annotations this week" count on the dashboard that tells a story ("The group has been focused on paragraphs 3-7 this week")

### 4e. User Profile / "My Journey" Page

PMN Pulse has a Settings page with profile, goals, and preferences. CSG has no user-facing profile. For a platform that emphasizes individual growth through collective learning, a "My Journey" page showing your annotations, threads, confusion flags, and reading progress over time would reinforce the Freirean principle that each person's relationship to the text matters.

### 4f. Keyboard Shortcuts

PMN Pulse has ⌘K for search. CSG could benefit from keyboard navigation for the reading page specifically: arrow keys or J/K for next/previous paragraph, N for next chapter, P for previous, F for focus mode, A for annotation mode. Power users (and anyone reading long sections) would benefit.

### 4g. Thread Type Descriptions (Reiterated from Design Review)

Still needed: one-line descriptions below each thread type emoji card. New users won't know the difference between "Discussion" and "Reflection" without context.

### 4h. Chapter-to-Chapter Navigation (Reiterated)

Still the single highest-impact UX improvement. At the bottom of each chapter: "← Previous: [title]" | "Next: [title] →". Every e-reader has this. It's table stakes.

---

## Part 5: Reading Page Deep-Dive

The reading page is CSG's crown jewel and the feature that has no equivalent in PMN Pulse (PMN Pulse is analytics, not reading). This section evaluates the reading page against best-in-class digital reading experiences.

### 5a. Chapter Sidebar (The Broken One)

**Current state:** Broken — overlays on reading text (Bug 1 above).

**Intent:** A collapsible chapter navigation sidebar showing all 33 chapters organized by Part, allowing quick jumps between chapters while reading.

**When it works, the concept is strong.** A persistent but collapsible chapter nav is exactly what a 33-chapter book needs. The issues to fix beyond the overlay bug:
- The sidebar should default to collapsed on the reading page (the text is the priority)
- A small toggle button (book icon or "Contents" label) should allow expanding it
- When expanded, the current chapter should be visually highlighted
- On mobile, this should be a slide-out drawer, not an inline sidebar

### 5b. Section Tabs

The 4 section tabs at the top of Chapter 1 (the pill buttons for each section) are a good navigation pattern. They allow jumping between sections within a chapter without leaving the page. But:
- The tab text is truncated with "..." which loses important information
- On mobile, the tabs stack vertically and take up significant space before the text begins
- Consider a scrollable horizontal strip on mobile, or a dropdown

### 5c. Text Presentation

**This is excellent.** Lora at 1.125rem, 1.8 line-height, 68ch max-width — this is professional book typography. The recent addition of `padding-left: 1.25rem; padding-right: 1.25rem` for reading text helps on mobile but could be 1.5rem for more breathing room.

The dark mode reading treatment (`color: #e8e0d4` — warm off-white) is a thoughtful choice. Pure white text on dark backgrounds causes eye strain; the warm tint is easier on the eyes for sustained reading. This shows real care.

### 5d. Annotations

The annotation highlights in translucent purple work well — they look like marker pen rather than clinical highlighting, which matches the "shared notebook" metaphor. The slide-in annotation panel is a good interaction pattern (click a highlight → panel slides in from right).

**Missing:** No way to see all annotations for a chapter at a glance. An "annotation density" indicator in the margin (like heat markers showing where annotations cluster) would help the facilitator prepare for sessions.

### 5e. Focus Mode & Font Controls

The font size controls (A- / 18 / A+) and Focus mode toggle are strong differentiating features. Focus mode hides annotations and distractions — this is exactly what you'd want for deep reading of dense prose.

### 5f. Progress Indicator

"Chapter 1, Section 1 of 33 · Part 1" appears at the top right — this is a recent addition and a good one. But it's small and easy to miss. Consider making this more prominent, or adding a thin progress bar at the top of the page that fills as you scroll through the chapter.

### 5g. Footnotes

Footnote numbers (superscript [1], [2]) are visible in the text. This is important for Capital specifically, where Marx's and Engels' footnotes carry substantive analysis. The implementation appears to work (footnotes are visible in the text). Need to verify that clicking a footnote number shows the footnote content.

### 5h. The Filter Search Bar

"Filter annotations by keyword..." sits between the chapter heading and the text body. As noted in the previous design review, this occupies premium real estate for what's likely a power-user feature. Consider:
- Moving it into a toolbar that appears when Focus mode is OFF
- Or placing it inside the annotation panel rather than above the text
- Or revealing it only when there are 5+ annotations (when filtering becomes useful)

### 5i. What the Reading Page Needs Most

1. **Fix the chapter sidebar overlay** (Bug 1 — blocks everything)
2. **Chapter-to-chapter navigation at the bottom** (most impactful UX improvement)
3. **Scroll progress indicator** (thin bar at top showing position in chapter)
4. **Annotation density markers in the margin** (where is the group's attention?)
5. **Move annotation filter out of the primary reading flow**

---

## Overall Priorities

### Must Fix (Blocks Usage)

| # | Issue | Effort |
|---|-------|--------|
| 1 | Chapter sidebar overlay on reading text | Medium — CSS positioning fix |
| 2 | Sidebar doesn't collapse on mobile | Medium — responsive breakpoint + mobile tab bar activation |

### High Impact Design Improvements

| # | Issue | Effort |
|---|-------|--------|
| 3 | Dashboard card restructure (break up "This Week's Reading" monolith, add right sidebar column) | High |
| 4 | Card visual weight (apply `card-elevated`, increase bg contrast from page) | Low |
| 5 | Chapter-to-chapter navigation at bottom of reading page | Low-Medium |
| 6 | Progress buttons color-coded (Done=green, Partial=amber, Behind=red) | Low |
| 7 | Thread type descriptions below emoji cards | Low |

### Medium Priority Polish

| # | Issue | Effort |
|---|-------|--------|
| 8 | Consistent top bar / breadcrumb across all pages | Medium |
| 9 | ALL-CAPS label overuse — reduce to only section groupings | Low |
| 10 | Reading page mobile padding increase (1.25rem → 1.5rem) | Low |
| 11 | Page transition animations (exit + enter) | Medium |
| 12 | Theme toggle transition smoothing | Low |

### Feature Additions (Post-Launch OK)

| # | Feature | Effort |
|---|---------|--------|
| 13 | Global search (⌘K) | High |
| 14 | User profile / "My Journey" page | High |
| 15 | Reading progress visualization (book-wide) | Medium |
| 16 | Annotation density markers in margin | Medium |
| 17 | Keyboard shortcuts for reading page | Medium |

---

## The Core Insight

CSG's design problem isn't taste — it's distribution of craft. The reading page shows what this platform can be when real design attention is applied. The dashboard and structural pages haven't received that same attention yet. PMN Pulse maintains consistent quality across every surface. The goal for CSG is to bring the non-reading pages up to the standard the reading page already sets.

The two critical bugs (chapter sidebar overlay and mobile sidebar not collapsing) must be fixed first. Everything else is polish on top of a solid foundation. The color system, the typography choices, the animation infrastructure, and the empty states are all genuinely good — they just need to be applied more thoroughly.

---

*This report compares design craft, not features. PMN Pulse is a newsroom analytics tool; CSG is a collaborative reading platform. The goal is not to make CSG look like PMN Pulse — it's to bring the same level of considered design decisions to every surface of CSG.*
