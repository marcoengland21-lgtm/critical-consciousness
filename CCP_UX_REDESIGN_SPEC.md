# UX Redesign Spec: Progressive Disclosure & Guided Experience

**Date:** 23 March 2026
**Core problem:** The platform shows everything at once. For the least tech-savvy member, this creates a wall of "what am I supposed to do?" instead of a guided experience.
**Design principle:** Show only what the user needs at each moment. Reveal complexity as they ask for it.
**Target user:** Someone who doesn't use apps much and needs obvious, simple interactions.

---

## 1. Reading Page — The Big One

### Current Problems

When someone opens a chapter, they see **7 layers of interface before the first word of Marx:**

1. Breadcrumb trail (`Reading › Capital, Volume I › Chapter 1, Section 1`)
2. 4 section tab pills across the top
3. Chapter metadata line (`Chapter 1, Section 1 · ~11 min read`)
4. Title + subtitle + divider
5. "1 other person is reading this chapter" banner
6. "Listen to this chapter" audio button
7. Then the text begins

Plus:
- A **10-icon vertical toolbar** on the left with no labels (Ch label, chevron, A-, A+, theme, annotations, chapter nav, edit, page number, close)
- A **floating audio speed widget** (`▶ 280 wpm +`) overlaying the reading text
- Annotation highlights on the text itself

The icons are the worst offender. For a non-technical person, 10 unlabeled icons stacked vertically is a guessing game. They serve power users well but they're hostile to newcomers.

### Redesign: Three States

#### State 1: Arrival (Default View)

**What stays visible:**
- Breadcrumb (navigational safety — "where am I?")
- Chapter title + subtitle (what you're reading)
- Reading time estimate (how long will this take)
- The text, with annotation highlights visible
- Annotation count indicators in left margin (subtle — these are social proof that others are engaging)

**What gets REMOVED from the default view:**
- **Section tab pills** → Move to bottom of page (alongside existing prev/next chapter nav) and inside the tools panel
- **"1 other person is reading" banner** → Remove entirely OR make it a subtle line under the reading time, not a full-width colored banner
- **"Listen to this chapter" button** → Move inside the tools panel
- **The entire left icon toolbar** → Replace with a single labeled button (see below)
- **Floating audio speed widget** → Only appears when audio is playing

**What gets ADDED:**
- One clearly labeled button in the bottom-right corner: **"Tools"** (with a small gear or book icon). This replaces the 10-icon strip. On hover/focus, it shows a tooltip: "Font size, audio, chapter navigation, and more."
- A subtle **scroll progress bar** at the top (already exists — keep it)

**The arrival hierarchy becomes:**
```
Breadcrumb (small, gray)
Title (large, pink, dominant)
Subtitle (italic, secondary)
~11 min read (small, muted)
─────────────────────────
[The text begins here, with annotation highlights]
```

That's it. Three things before the text: where you are, what you're reading, how long it'll take.

#### State 2: Reading (Scrolling)

**What appears:**
- The "Tools" button remains in the bottom-right, small and unobtrusive
- When the user scrolls down past the title, a **slim top bar** appears (fade in, 36px height): just the chapter title (truncated) and a small annotation toggle icon. This gives orientation ("what chapter am I in?") without clutter.
- The top bar auto-hides after 3 seconds of no scroll. Reappears on any scroll.

**What doesn't appear:**
- No icon toolbar
- No section tabs
- No audio player (unless audio is playing)

#### State 3: Engaging (Tools Panel Open)

When the user clicks "Tools," a **slide-in panel** opens from the right (reuse existing slide-in animation). Contents, organized with labels:

```
Reading Tools
─────────────────────

📖 Chapter Navigation
  ← Previous: [title]    → Next: [title]
  Jump to section: [1] [2] [3] [4]

🔤 Text Size
  A-  [current size]  A+

🎨 Appearance
  [Light] [Dark]

👁 Annotations
  [Show] [Hide]   4 annotations on this chapter

🎧 Audio
  Listen to this chapter · 19:46 · Read by Carl Manchester
  [▶ Play]   Speed: [1x]

📍 Your Position
  Chapter 1, Section 1 of 4
```

Every control has a **text label**. No unlabeled icons anywhere. The panel is the one place where complexity lives, and it's organized by task ("what do you want to do?") not by feature.

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/(main)/reading/[slug]/[chapter]/page.tsx` | Remove section tab pills from top. Add them to bottom nav area. Remove "reading this chapter" banner or restyle as subtle text. |
| `src/components/reading/ChapterReader.tsx` | Remove the left vertical toolbar entirely. Add single "Tools" button (bottom-right, labeled). Implement slim top bar that appears on scroll. Move audio player trigger inside tools panel. |
| `src/components/reading/ReadingToolbar.tsx` | Redesign as the slide-in tools panel with labeled sections (chapter nav, text size, appearance, annotations, audio). Remove the icon-only approach. |
| `src/app/globals.css` | Add styles for slim top bar (position: fixed, fade in/out on scroll), Tools button, panel layout with labeled sections. |

### Implementation Notes

- The "Tools" button should use `position: fixed; bottom: 24px; right: 24px;` with a clear label. Not just an icon.
- The slim top bar should use `IntersectionObserver` on the title element: when the title scrolls out of view, the bar appears. When the title is visible, the bar hides.
- Audio speed widget should ONLY render when audio `isPlaying === true`. Currently it renders always.
- Section tabs at the bottom: add them to the existing prev/next chapter navigation card area. "Other sections in this chapter: [1] [2] [3] [4]"
- Keep annotation highlights in all states — they're part of the reading experience, not chrome.
- The `prefers-reduced-motion` media query should disable the top bar animation.

---

## 2. Dashboard — Information Hierarchy

### Current Problems

The dashboard is better than the reading page, but it has a milder version of the same issue: too many cards of equal visual weight competing for attention on first load. From top to bottom:

1. Greeting + group name (large)
2. Session info card (overlapping the greeting — visually confusing)
3. Progress bar (Week 3 of 4, 75%)
4. "Currently reading" text
5. "This Week's Reading" card with Read Now CTA
6. Audio speed widget (floating, always visible)
7. "Your Progress" with Done/Partial/Behind buttons
8. "Next Session" card
9. "Discussion Prompts" card
10. "The group is thinking about..." section
11. Right sidebar: Your Roles, Annotate Together, Quick Links, Your Reflection

A new member landing here doesn't know what to do first. Everything has equal weight.

### Redesign

**Primary action should be unmissable:** "Read Now →" is the main thing to do. It should be the first thing that draws the eye — not buried below a greeting, session info, progress bar, AND a "currently reading" label.

**Suggested changes (not a full redesign — adjustments):**

1. **Merge the greeting area.** "Good evening, Marco" + the session info card + the progress bar should be ONE cohesive header block, not three overlapping elements. The session info shouldn't overlap the greeting text.

2. **"This Week's Reading" card should be the hero.** Make the "Read Now →" button more prominent. The card should visually dominate — it's the primary action. Currently it's the same visual weight as "Next Session" and "Discussion Prompts."

3. **"Your Progress" (Done/Partial/Behind) should be INSIDE the reading card**, not a separate section below it. It's contextually tied to the reading — "have you done this week's reading?" belongs with "here's this week's reading."

4. **The floating audio widget on the dashboard is wrong.** The `▶ 280 wpm` widget appears on the dashboard. Audio controls should only live on the reading page. This is likely a global component that isn't scoped to the reading route.

5. **Right sidebar Quick Links duplicate the main nav.** "Continue Reading," "Browse Glossary," "Resources" — these are already in the left sidebar. The Quick Links card can be removed or replaced with something contextual (like "Struggling with the value-form? Here are resources for this week's reading").

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/(main)/dashboard/page.tsx` | Merge greeting/session/progress into one header. Elevate reading card visual prominence. Move Done/Partial/Behind into the reading card. Remove or rethink Quick Links. |
| Audio speed widget (likely in layout or a global component) | Scope it to reading routes only. Should not appear on dashboard, threads, glossary, etc. |

---

## 3. New Thread Form — Too Many Choices Upfront

### Current Problem

The "Start a New Thread" form asks you to make 4 decisions before you can type:

1. Choose from 6 thread types (displayed as a 3×2 grid of cards)
2. Choose a related week (dropdown)
3. Write a title
4. Optionally insert a quote from reading
5. Write the body

For someone who just wants to share a thought, the 6-card type selector is intimidating. "Am I writing a Discussion or a Reflection? What's the difference between a Passage Pick and a Connection?" These categories serve organizational purposes (filtering, rotating roles) but they frontload cognitive load on the poster.

### Redesign

**Default to "Discussion" and collapse the type selector.**

1. "Discussion" should be pre-selected (it's the most common type and the broadest).
2. The 6-card grid should be **collapsed by default** behind a link: "Change thread type" that expands the grid if clicked.
3. Move "Related Week" below the body (it's metadata, not something you need to decide before writing).
4. The form hierarchy becomes:

```
Start a New Thread
You're discussing: Week 3 — The Form of Value

Title
[                                              ]

Body
[                                              ]
[                                              ]

📖 Quote from reading — insert a passage

── Optional ──────────────────────────
Thread type: Discussion  [change]
Related week: Week 3  [change]

[Post Thread]
```

Title and body first. Everything else is optional or pre-filled with sensible defaults.

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/components/threads/NewThreadForm.tsx` | Default thread type to "discussion." Collapse type selector behind "Change thread type" toggle. Move "Related Week" dropdown below body. Reorder form fields: title → body → quote → type/week. |

---

## 4. Threads List — "WEEK 3 PROMPTS" Sidebar

### Current Problem

The right sidebar has "WEEK 3 PROMPTS" in all-caps bold — this was flagged in the design review as violating the "no uppercase labels" decision. More importantly, the discussion prompts are useful but they compete with the thread list for attention. On first visit, it's unclear whether the prompts are threads, instructions, or decorative text.

### Redesign

1. **Remove uppercase from "WEEK 3 PROMPTS" and "QUICK LINKS" headings.** Use standard case: "This Week's Prompts" / "Quick Links."
2. **Add a brief label** above the prompts: "Questions for this week's session:" — makes it clear these are discussion starters, not instructions.
3. **Quick Links in the sidebar duplicate the nav.** Same issue as the dashboard. Either remove or replace with something contextual like "This week's resources" showing resources tagged with the current week.

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/(main)/threads/page.tsx` | Fix uppercase headings. Add contextual label above prompts. Reconsider Quick Links sidebar content. |

---

## 5. Glossary — Term Click Area

### Functional Issue

Clicking terms in the left pane doesn't reliably select them. Tested by clicking "Commodity" twice — right pane didn't respond. The URL param approach (`?term=Commodity`) works. This is likely a click target issue — the clickable area may be too narrow, or there's a JS event propagation problem.

### Fix

- File: `src/components/glossary/GlossaryList.tsx`
- Ensure the entire term row (including the week badge area and padding) is the click target, not just the term text.
- Add `cursor: pointer` and a subtle hover state to the entire row so it's obvious the row is interactive.
- Add a stronger visual selected state — currently the selected term's background is barely distinguishable from unselected. Use a left border accent (`3px solid var(--accent-purple)`) or a more prominent background.

---

## 6. Global Issue — Audio Speed Widget

The floating `▶ 280 wpm +` widget appears on every page (dashboard, threads, schedule, etc.). It should only render on reading pages (`/reading/[slug]/[chapter]`).

### Fix

- Identify which component renders this widget (likely in a layout or global provider).
- Conditionally render it only when the current route matches `/reading/`.
- Alternatively, only show it when audio is actively playing — if someone starts audio on the reading page and navigates away, the widget could persist as a mini-player. But it should never appear if audio hasn't been started.

---

## Priority Order

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Reading page: Remove left toolbar, add labeled "Tools" button** | 3-4 hrs | HIGH — transforms the core experience |
| 2 | **Reading page: Remove section tabs from top, move to bottom** | 1 hr | HIGH — removes the biggest visual noise on arrival |
| 3 | **Reading page: Hide audio player until requested via Tools panel** | 1-2 hrs | MEDIUM — removes one more layer of arrival chrome |
| 4 | **Scope audio widget to reading pages only** | 30 min | MEDIUM — fixes a bug that affects every page |
| 5 | **New thread form: Default type, collapse selector** | 1-2 hrs | MEDIUM — reduces cognitive load on posting |
| 6 | **Reading page: Add slim top bar on scroll** | 2-3 hrs | MEDIUM — provides orientation without clutter |
| 7 | **Dashboard: Merge greeting header, elevate Read Now** | 2-3 hrs | MEDIUM — clearer first-visit hierarchy |
| 8 | **Glossary: Fix click targets and selected state** | 1 hr | MEDIUM — functional fix |
| 9 | **Threads sidebar: Fix uppercase, remove redundant Quick Links** | 30 min | LOW — visual polish |
| 10 | **Dashboard: Move progress buttons into reading card** | 1 hr | LOW — tighter information grouping |
| 11 | **Reading page: Tools panel with labeled sections** | 2-3 hrs | Part of #1 — the replacement for the icon toolbar |

**Total estimate:** 13-20 hours

**The single most impactful change:** Items 1-3 together (remove toolbar + remove tabs + hide audio = ~5-7 hours). This transforms the reading page from "wall of interface" to "here's the text, here's one button if you need tools." Everything else is secondary.

---

## 7. Schedule Page — Actually Good, Minor Issues

### Current State

The schedule page is one of the best-designed pages on the platform. The timeline with green checkmarks on completed weeks and a yellow dot on the current week gives immediate orientation. The current week auto-expands showing session details, discussion prompts, and CTAs. Completed weeks are collapsed by default with an expand chevron.

### What Works

- Visual hierarchy is clear: completed weeks are compact, current week is expanded and prominent
- Discussion prompts are well-placed inside the expanded week (contextual, not a separate section)
- "Read and Annotate" / "View Discussions" CTAs are at the bottom of the expanded card — good placement
- Session location is shown clearly
- "Expand All" button in the top-right for people who want the full picture

### Minor Issues

1. **No guidance for a first-time visitor.** The page assumes you know what a "reading schedule" means in this context. A one-line intro like "Each week, the group reads one section together" would help — but the current intro is blank (just "4 weeks" count).
2. **"Session Notes" collapsible is always visible even when empty.** For weeks where no session notes have been written yet, the collapsible header sits there doing nothing. Hide the "Session Notes" section entirely when it has no content.
3. **Week numbers are prominent but the section titles are what matter.** "Week 4" is less meaningful than "The Fetishism of Commodities." Consider making the section title larger and the week number a small badge.

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/(main)/schedule/page.tsx` | Add a brief intro line under "Reading Schedule." Conditionally hide Session Notes when empty. Consider visual hierarchy swap (title > week number). |

---

## 8. Resources Page — Good Structure, Needs Guidance

### Current State

The resources page is well-organized: filter pills by type, card grid grouped under type headers with counts, each card showing type badge + title + description + source domain + "Open →" link.

### What Works

- Type grouping with headers (Primary Texts, Companion Texts, etc.) creates natural sections
- Card layout is scannable — title + description + source domain gives enough to decide whether to click
- Filter pills work as expected
- "Add Resource" button is clearly labeled

### Issues

1. **No guidance on where to start.** 14 resources all look equally important. For a brand new member, the question is "which of these do I actually need right now?" The page doesn't answer this.
2. **No "recommended for this week" highlighting.** Resources have a `week_id` field in the database, but none of the seeded resources are tagged to specific weeks. Even if they were, there's no visual distinction for "recommended this week" vs. general resources.
3. **Descriptions vary in helpfulness.** Some descriptions say who the resource is for ("start here if you're new" on Harvey's lectures — excellent). Others are neutral ("Downloadable PDF for offline reading"). The helpful ones should be the model — every description should tell you when/why to use this resource.

### Suggested Changes

1. **Add a "Start here" or "Recommended" section** at the top of the page — 2-3 resources that are most useful for beginners (Harvey's lectures, the East Bay DSA syllabus, the marxists.org full text). This could be a persistent "Getting Started" section above the type-filtered grid, or a special "Recommended" filter pill.
2. **Tag some resources with `week_id`** so the dashboard "recommended this week" feature (from the enhancement audit) has data to work with.

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/(main)/resources/page.tsx` | Add "Start here" section at top with 2-3 highlighted beginner resources. Consider a "Recommended" filter pill. |
| Supabase `resources` table | Update `week_id` on relevant resources (Harvey lectures → week 1, etc.). |

---

## 9. Reading TOC Page — Good, One Missed Opportunity

### Current State

"33 chapters across 8 parts" with a helpful intro line. Parts are collapsible (Part 1 expanded by default). Each chapter row shows the chapter number, title, annotation count ("4 notes"), and "Read →" link.

### What Works

- Collapsible parts prevent the 33-chapter list from being overwhelming
- Annotation counts give social proof ("other people are already engaging with this chapter")
- "Read →" is a clear CTA per row

### Issues

1. **No indication of "you are here."** The schedule page shows the current week, the dashboard shows the current reading — but the TOC has no marker for "this is the chapter you should be reading right now." For a new member, all 33 chapters look equally available. Add a "Current" badge or highlight on the chapter matching the current week's reading (Chapter 1 Section 3 = chapter_number 3).
2. **Part 1 is expanded, but if the group is on Week 4 (Section 4), Part 1 Section 4 might be below the fold.** Consider auto-expanding to show the current chapter, not just Part 1.

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/(main)/reading/page.tsx` | Add "Current" badge to the chapter matching the current week's reading. Auto-expand the part containing the current chapter. |

---

## 10. Profile Page — Dense But Acceptable

### Current State

Shows: avatar + name + role + member since + contribution count + stat breakdown (annotations, threads, replies, terms) + recent annotations list + right sidebar with threads, reading journey, glossary contributions, role history, resource count.

### Assessment

This page is for *returning users checking their own activity* — not a first-visit page. The density is acceptable here because the user is actively looking for information about themselves. It doesn't need the same progressive disclosure treatment.

### One Issue

The profile shows "admin" next to Marco's name. For the live platform with real users, this should probably be hidden — same Freirean principle as the thread admin badge. A facilitator's profile shouldn't look different from a member's profile. But this is a philosophy question, not a UX one.

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/app/(main)/profile/page.tsx` | Consider removing the "admin" role display for consistency with the Freirean "no hierarchy" principle. Low priority. |

---

## 11. Login/Register Pages — Not Checked This Session

These were reviewed in the earlier design comparison session. The split-panel layout (dark branding left, form right) was working well. The main concern from that review was the Freire quote feeling out of place for someone who doesn't know who Freire is — but that's a content decision, not a UX structural issue.

---

## 12. Reading Page Toolbar — Deeper Look (From Code Audit)

The code audit revealed the left toolbar is MORE complex than what's visible in screenshots. It's actually a **draggable dock** (`ReadingToolbar.tsx`) that:

- Can be repositioned by dragging (saves position to localStorage as `ccp-toolbar-position`)
- Contains ~12 interactive elements total, not just the 10 visible icons
- Includes a **glossary quick-access panel** (toggled with 'g' keyboard shortcut) — a searchable glossary that slides out from the toolbar
- The chapter navigation panel that opens from it is a **dialog positioned relative to the toolbar** — its position depends on where the toolbar was dragged to
- It listens for keyboard events: `←`/`→` for chapters, `f` for focused mode, `g` for glossary, `Escape` to close panels

**The problem runs deeper than "too many icons."** The toolbar is a mini-application bolted onto the reading page. It has its own state management, its own persistence layer, its own keyboard shortcuts, and its own positioning system. For a power user who has configured it, it's excellent. For a newcomer, it's a mysterious strip of symbols that also sometimes opens panels in unexpected places because someone dragged it.

**Recommendation (replaces my earlier "just add a Tools button" suggestion):**

The toolbar needs to be completely reconceived, not just hidden behind a button. Here's what I'd actually propose:

1. **Delete the draggable positioning feature.** It adds complexity for users ("why did my toolbar move?") with minimal benefit. Fix the tools panel to the right side.
2. **Replace the icon dock with a single entry point** that opens a well-organized panel. But the panel itself should be redesigned to NOT be a vertical strip of icons. It should be a proper panel with labeled sections (as described in Section 1, State 3).
3. **Keep the keyboard shortcuts** (`f` for focus, `←`/`→` for chapters) — these serve power users without cluttering the UI. But add a discoverable shortcut reference (e.g., `?` opens a shortcut help overlay).
4. **The glossary quick-access panel is valuable** but shouldn't require knowing about the `g` shortcut. Move it into the tools panel as a labeled section: "📖 Look up a term" with a search field.

### Files to Modify (updated)

| File | What Changes |
|------|-------------|
| `src/components/reading/ReadingToolbar.tsx` | Full redesign: remove draggable positioning, remove icon-only dock, create labeled slide-in panel with sections. Keep keyboard shortcuts but add discoverability. |
| `src/components/reading/ChapterReader.tsx` | Remove toolbar mounting logic. Add single "Tools" button. Add `IntersectionObserver` for slim top bar. |
| `src/components/reading/GlossaryQuickAccess.tsx` | Move into the tools panel as a labeled section instead of a separate panel triggered by keyboard shortcut. |

---

## 13. AccessibilityPanel — Hidden Power

The code audit found an **AccessibilityPanel** component that's accessible from both the sidebar and mobile drawer. It contains:

- Font size decrease/increase buttons with a slider (range 12–30px)
- High Contrast toggle
- Dyslexia Font toggle
- Reading Pacer toggle
- Reset to Defaults button

This is actually well-designed — it's behind a clear entry point (the accessibility icon in the sidebar) and has labeled controls. The issue is that **font size exists in TWO places**: the AccessibilityPanel and the ReadingToolbar. A user changing font size in one place won't know it also exists in the other.

**Recommendation:** Font size should live in ONE place. Since the AccessibilityPanel is the more thorough version (slider + buttons + min/max), it should be the canonical location. The ReadingToolbar should link to it or embed it, not duplicate it.

---

## 14. Confusion Heatmap — Good Progressive Disclosure, Needs Polish

The `ConfusionHeatmap.tsx` is a subtle 6px-wide vertical strip on the left edge of paragraphs. Color intensity changes based on how many people flagged the paragraph as confusing. The `ConfusionFlagButton.tsx` (a `?` icon) appears at 40% opacity normally, 100% on paragraph hover.

**This is actually good progressive disclosure.** It's invisible until you hover, then it's there. The heatmap is subtle enough to not distract but visible enough to convey information.

**One issue:** The `?` icon has no label or tooltip. For a non-technical user hovering over a paragraph and seeing a faint `?` appear, it's not obvious what it does. Add a tooltip: "I'm confused by this passage" on hover (200ms delay).

---

## 15. Audio Player — More Complex Than Expected

`AudioPlayer.tsx` includes:
- Play/pause button
- Skip back/forward 15 seconds
- Playback rate selector (0.75x–2x dropdown)
- Current time / duration display
- Spacebar shortcut for play/pause
- **Click paragraph to jump** — audio seeks to the matching paragraph
- **Auto-scroll** — keeps current paragraph visible while listening

The paragraph-jumping and auto-scroll features are genuinely impressive but completely undiscoverable. A user would never know they can click a paragraph to jump the audio there, or that the page auto-scrolls while listening.

**Recommendation:** When the audio player is active (playing), add a subtle visual cue to paragraphs: a small headphone icon or a left-border highlight on the currently-playing paragraph. And add a brief "tip" on first audio play: "Click any paragraph to jump the audio there."

---

## Updated Priority Order (Complete)

| # | Change | Effort | Impact | Page |
|---|--------|--------|--------|------|
| 1 | **Reading: Replace icon dock with labeled Tools panel** | 4-5 hrs | HIGH | Reading |
| 2 | **Reading: Remove section tabs from top, move to bottom** | 1 hr | HIGH | Reading |
| 3 | **Reading: Hide audio until requested / playing** | 1-2 hrs | HIGH | Reading |
| 4 | **Global: Scope audio widget to reading pages only** | 30 min | MEDIUM | All |
| 5 | **New thread form: Default type, collapse selector** | 1-2 hrs | MEDIUM | Threads |
| 6 | **Reading: Add slim top bar on scroll** | 2-3 hrs | MEDIUM | Reading |
| 7 | **Reading: Remove draggable toolbar positioning** | 1 hr | MEDIUM | Reading |
| 8 | **Dashboard: Merge greeting header, elevate Read Now** | 2-3 hrs | MEDIUM | Dashboard |
| 9 | **Glossary: Fix click targets and selected state** | 1 hr | MEDIUM | Glossary |
| 10 | **Reading TOC: Add "Current" badge on active chapter** | 1 hr | MEDIUM | Reading TOC |
| 11 | **Reading: Unify font size controls (one location)** | 1 hr | LOW | Reading + Sidebar |
| 12 | **Reading: Add confusion flag tooltip** | 30 min | LOW | Reading |
| 13 | **Reading: Add audio paragraph-jump discoverability** | 1 hr | LOW | Reading |
| 14 | **Threads sidebar: Fix uppercase, rethink Quick Links** | 30 min | LOW | Threads |
| 15 | **Dashboard: Move progress buttons into reading card** | 1 hr | LOW | Dashboard |
| 16 | **Dashboard: Remove/replace duplicate Quick Links** | 30 min | LOW | Dashboard |
| 17 | **Schedule: Hide empty Session Notes collapsible** | 30 min | LOW | Schedule |
| 18 | **Resources: Add "Start here" section for beginners** | 1-2 hrs | LOW | Resources |
| 19 | **Profile: Consider removing admin role display** | 15 min | LOW | Profile |

**Total estimate:** 20-28 hours

**The single highest-impact session of work:** Items 1-3 + 7 together (~7-9 hours). This replaces the draggable icon dock with a clean labeled panel, removes section tabs from the top, hides the audio player until requested, and removes the drag-to-reposition feature. The reading page goes from "wall of controls" to "here's the text, here's one button if you need anything."

---

## What NOT to Change

- **Annotation highlights** — keep visible by default. They're the social reading experience.
- **Footnote references** — inline `[1]` links are part of Marx's text, not platform chrome.
- **Chapter prev/next navigation at bottom** — this is well-placed and useful.
- **The reading typography itself** — Lora serif, 68ch max-width, 1.8 line-height is all correct.
- **Confusion flag buttons** — these appear contextually on paragraph hover, not always. Good progressive disclosure already.
- **GlossaryTooltip on reading page** — appears on term hover, not always. Good progressive disclosure already.
- **The sidebar navigation** — it's clean, labeled, and out of the way.
