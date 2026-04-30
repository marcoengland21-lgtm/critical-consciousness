# CLAUDE.md — Critical Consciousness Project Memory

Read this file at the start of every session. It is your memory of this project.

Last updated: 29 April 2026 (Brief 1 — Sprint A Session 1 ship — interim landing + signup-flow rewrite + welcome onboarding scroll + migrations 011/012; V1+V2 schema-side passed, V3–V6 application-side walks pending post-deploy. Verification record: supabase/migrations/BRIEF_1_VERIFICATION.md)

---

## Project Overview

**What this is:** A collaborative study platform for a Christchurch, NZ reading group working through Marx's *Capital*, Volume I. The group is ~8 people aged 14 to 80+. The platform lets them read the text together, annotate passages, discuss chapters in threads, track a weekly schedule, build a shared glossary, and collect resources.

**Who it's for:** Small study groups of 6-10, hybrid in-person + Zoom, with a non-technical facilitator (John).

**Core principles:**
- No likes, reactions, upvotes, engagement metrics, leaderboards, or gamification. Ever.
- No push notifications (v1). Calm technology — people check when they want to.
- Chronological sorting only — no algorithms.
- Anonymous confusion flags — people mark paragraphs they find confusing without their name attached.
- The platform should feel like a shared notebook, not social media.
- Dialogue between equals. No grades, no hierarchy of knowledge.

**Live site:** https://capitalstudygroup.netlify.app
**GitHub:** https://github.com/marcoengland21-lgtm/critical-consciousness
**Supabase project:** https://aufzylsnowiareuionna.supabase.co

---

## Project Philosophy

### Why This Exists

This platform exists because political education is either locked behind paywalls, delivered as passive content consumption, or happens on platforms designed for dopamine-driven engagement. None of those serve genuine learning. This platform is the alternative — purpose-built for one thing: helping small groups of people think critically about difficult texts together.

The founding insight is from Paulo Freire's *Pedagogy of the Oppressed*: genuine education is not a teacher depositing knowledge into passive students (the "banking model"). It's dialogue between equals where understanding develops collectively. The teacher has more knowledge but is also learning. The students aren't empty vessels — their questions, confusions, and experiences are the raw material of learning.

**Every feature should be tested against this:** does it encourage dialogue between equals, or does it create hierarchy between teacher and student?

### The Banking Model Problem

The biggest risk is accidentally reproducing the banking model in digital form. This happens when:

- The facilitator's content is visually privileged over members' contributions
- The interface makes it feel like there are "right answers" to find
- One person dominates discussion while others consume
- People read passively without articulating their own thinking
- The platform rewards performance (likes, metrics) over genuine engagement

Design decisions that resist this:

- Admin/facilitator posts look identical to member posts in threads. No special styling, no "teacher" badge.
- Discussion prompts are QUESTIONS, not instructions. "What do you think Marx means by..." not "Marx means..."
- Rotating roles distribute intellectual labor — everyone takes turns as Summarizer, Discussion Starter, Connector, Passage Picker. Nobody is permanently the expert.
- No likes or reactions. The only way to engage with someone's thinking is to reply with your own thinking.
- Anonymous confusion flags normalize struggle. Seeing that 5 other people are also confused says "you're not stupid, this is genuinely hard."

### The Annotation System Is The Core Pedagogy

Social annotation isn't just a feature — it's the pedagogical engine. Research shows 5-10% comprehension improvement when groups annotate socially versus reading alone (Miller et al., 2018; Novak et al., 2012). But the real value is qualitative:

- **Anchors discussion to specific text** rather than vague impressions. "I don't understand the value-form" becomes "I don't understand THIS sentence" — which is answerable.
- **Visible confusion is the most valuable data.** When 6 people flag the same paragraph, that's the session agenda writing itself.
- **Makes the group's collective reading visible.** You can see where attention concentrates, what excites people, what confuses them. The text becomes a shared experience rather than 8 individual readings.
- **Annotation-to-thread promotion** means rich conversations that start on the text can grow into full discussions without losing the connection to the passage that sparked them.

### Why No Likes/Reactions — The Research

Not an arbitrary preference. Hanus & Fox (2015) found that gamification elements (badges, leaderboards, points) actually REDUCED student motivation and satisfaction. Extrinsic rewards crowd out intrinsic motivation. Once people are performing for likes, they stop engaging for understanding.

In a group of 8, likes would immediately create an implicit hierarchy — whose reflections are "popular." The person who writes a confused, vulnerable post and gets 1 like while someone else's polished analysis gets 7 will never post vulnerably again. And the confused post was more valuable to the group's learning.

### Why Calm Technology — The Research

Gloria Mark's research: it takes 23 minutes and 15 seconds to regain deep focus after an interruption. Capital requires deep reading — the argument builds sentence by sentence. Real-time push notifications would destroy the reading experience.

The platform should be something you CHOOSE to check, not something that demands your attention. No unread counters creating anxiety. No "5 new messages" badges. People come to the site when they want to think. The site waits for them.

### The Weekly Rhythm

The before-during-after pattern structures each week:

**Before session:** Members read the assigned section. They annotate as they go — marking confusions, highlighting key passages, asking questions. The Passage Picker selects key passages. The Discussion Starter posts opening questions. The async discussion begins forming.

**During session:** The group meets (hybrid in-person + Zoom). John can see the annotation heatmap — where confusions concentrated. The session focuses on the hardest passages and the most generative disagreements.

**After session:** The Summarizer posts a recap. The Connector links the week's ideas to previous reading or current events. The glossary grows with newly understood terms. The cycle resets for next week.

This rhythm means the in-person session isn't starting cold — the online preparation means everyone arrives with formed (if incomplete) thoughts. And the post-session continuation means ideas that didn't get airtime in person still have space to develop.

### The Rotating Roles Are Pedagogical

These aren't administrative — they're pedagogical. Research (Schellens et al., 2005) shows role assignment produces significantly higher levels of knowledge construction and cognitive engagement.

Each role forces a different kind of engagement:

- **Summarizer** must synthesise — compresses discussion into key points, requiring understanding of the whole.
- **Discussion Starter** must generate questions — identifying what's genuinely puzzling rather than obvious.
- **Connector** must think across contexts — linking Marx to current events or previous chapters, building integrative understanding.
- **Passage Picker** must make editorial judgments — selecting what's most important or confusing, requiring careful reading.

With 6-10 members and 4 roles, everyone gets a role every 2-3 weeks. This distributes cognitive labor that would otherwise fall entirely on the facilitator.

### Reading Capital Specifically

Capital is one of the most difficult books most people will ever attempt:

- The East Bay DSA syllabus (the best freely available) allocates 5 WEEKS to Chapter 1 alone. The pace should be slow and the platform should never make people feel behind for struggling.
- Chapter 1, Sections 1-3 are the hardest in the entire book. The value-form discussion in Section 3 is notoriously dense. If the group survives Chapter 1, they'll likely finish the book.
- Marx's footnotes are part of the argument — some of the sharpest analysis lives there. They should be accessible, not hidden.
- Concepts build on each other across the entire book. The glossary isn't just a reference — it's a survival tool. By Chapter 15, readers need to remember definitions from Chapter 1. Cross-referencing between glossary and reading page (term highlighting with tooltip definitions) is genuinely important.
- Different companion resources serve different interpretive traditions: David Harvey (most accessible), Michael Heinrich (most rigorous on early chapters), Harry Cleaver (autonomist/working-class perspective). The platform should eventually support multiple perspectives rather than privileging one reading.

### Multi-Group Future

This platform is designed for one study group right now. But the architecture must support any group, anywhere, reading any text. A group in Auckland reading Capital. A group in London reading *Pedagogy of the Oppressed*. A group in Lagos reading Fanon. The `text_documents`/`text_chapters` schema is text-agnostic. The study group model (schedule, roles, annotation, glossary, threads) works for any difficult text read collectively.

The shared glossary feature (groups reading the same text can optionally import definitions from other groups) means collective intelligence compounds across the platform, not just within one group.

---

## Tech Stack

| Layer       | Technology                        | Version  |
|-------------|-----------------------------------|----------|
| Framework   | Next.js (App Router)              | 16.1.6   |
| React       | React                             | 19.2.4   |
| Database    | Supabase (PostgreSQL)             | —        |
| Auth        | Supabase Auth (email/password)    | —        |
| CSS         | Tailwind CSS v4                   | 4.2.1    |
| Hosting     | Netlify                           | —        |
| Fonts       | Lora (serif, reading), Inter (UI), system-ui | —        |
| Language    | TypeScript                        | 5.9.3    |

**Deployment:** Push to `main` on GitHub → Netlify auto-deploys. Build command: `next build`. Takes ~30-40 seconds.

**Tailwind v4 note:** Uses `@import "tailwindcss"` in CSS, not a `tailwind.config.js`. No config file exists. Customization via CSS custom properties in `globals.css`.

---

## Architecture

### File Structure

```
src/
├── app/
│   ├── globals.css              # Design tokens, dark mode, animations, all custom CSS
│   ├── layout.tsx               # Root layout (html, head, Lora font, ThemeInitializer)
│   ├── page.tsx                 # Root "/" — redirects to /dashboard
│   ├── (auth)/
│   │   ├── layout.tsx           # Auth pages layout — split panel (brand left, form right), two-line "Capital / Study Group" branding
│   │   ├── login/page.tsx       # Login page
│   │   └── register/
│   │       ├── page.tsx         # Registration page (invite code required)
│   │       └── actions.ts       # Server actions for registration
│   └── (main)/
│       ├── layout.tsx           # Main layout — DesktopSidebar + MobileTabBar, user display
│       ├── dashboard/
│       │   ├── page.tsx         # Dashboard — welcome, this week, activity, roles
│       │   ├── loading.tsx      # Skeleton loader
│       │   └── error.tsx        # Error boundary
│       ├── reading/
│       │   ├── page.tsx         # Table of contents — all parts/chapters
│       │   └── [slug]/[chapter]/
│       │       ├── page.tsx     # Chapter reading page — text, footnotes, annotations
│       │       ├── loading.tsx  # Skeleton loader
│       │       └── error.tsx    # Error boundary
│       ├── threads/             # Thread list, new thread, thread detail (each with error.tsx)
│       ├── glossary/
│       │   ├── page.tsx         # Glossary with search and add term
│       │   ├── loading.tsx      # Skeleton loader
│       │   └── error.tsx        # Error boundary
│       ├── schedule/
│       │   ├── page.tsx         # Reading schedule with weekly cards
│       │   ├── loading.tsx      # Skeleton loader
│       │   └── error.tsx        # Error boundary
│       ├── resources/
│       │   ├── page.tsx         # Resources with type filters and add form
│       │   ├── loading.tsx      # Skeleton loader
│       │   └── error.tsx        # Error boundary
│       ├── profile/
│       │   ├── page.tsx         # User profile page
│       │   ├── loading.tsx      # Skeleton loader
│       │   └── error.tsx        # Error boundary
│       └── concepts/page.tsx    # Concept map (hidden from nav, in-progress)
├── components/
│   ├── reading/                 # ChapterReader, ReadingToolbar, BackToTop, AnnotationPanel, SelectionToolbar, ConfusionFlagButton, GlossaryTooltip, etc.
│   ├── threads/                 # ThreadListClient, NewThreadForm, ThreadTypeBadge, ReplySection, ThreadActions, etc.
│   ├── layout/                  # DesktopSidebar, MobileTabBar, MobileMoreDrawer, SidebarNavLink, NavIcon, NavigationProgress, ThemeProvider, ThemeToggle, ThemeInitializer, LogoutButton
│   ├── dashboard/               # ReadingCheckinButton, WeeklyActivitySummary, etc.
│   ├── schedule/                # SessionNotes
│   ├── glossary/                # GlossaryList
│   ├── resources/               # ResourcesList
│   ├── concepts/                # ConceptMap
│   ├── roles/                   # RoleBadge
│   └── ui/                      # TimeAgo, MarkdownBody, Toast
├── lib/
│   ├── supabase/
│   │   ├── server.ts            # createClient, createStaticClient, getSessionUser
│   │   ├── client.ts            # Browser-side Supabase client
│   │   ├── admin.ts             # Service role client (bypasses RLS)
│   │   └── middleware.ts        # Session refresh middleware
│   ├── nav-config.ts             # Navigation items config (label, href, icon, mobileTab flag)
│   ├── chapter-utils.ts          # getChapterLabel, getPartNumber, partTitles — shared server/client
│   ├── author-colors.ts          # Shared AUTHOR_COLORS array + hashColor function
│   ├── scroll-persistence.ts     # localStorage scroll position save/restore per chapter
│   ├── confusion-flags.ts       # Anonymous confusion flag utilities (localStorage + RPC)
│   ├── glossary-utils.ts        # Glossary search/matching
│   ├── seed-glossary.sql        # Seed 15 Chapter 1 glossary terms
│   ├── seed-resources.sql       # Seed 14 essential resources
│   └── confusion-flags-schema.sql # confusion_counts table + RPC functions
├── hooks/
│   └── useScrollPersistence.ts  # Debounced scroll save/restore per chapter
├── types/
│   └── database.ts              # TypeScript interfaces for all database tables
└── middleware.ts                 # Next.js middleware entry point
```

### Auth System

- Registration requires an invite code (checked in `register/actions.ts`)
- Login uses Supabase Auth email/password
- **Auth enforcement is currently DISABLED** — `src/lib/supabase/middleware.ts` has redirect logic commented out with `// TODO: RE-ENABLE AUTH`
- `src/app/(main)/layout.tsx` also has a `// TODO: RE-ENABLE AUTH` comment
- When re-enabled: unauthenticated users redirect to `/login`, authenticated users on `/login` redirect to `/dashboard`
- Marco is currently the only user with admin role

### Supabase Client Architecture (CRITICAL)

| Client | File | When to Use |
|--------|------|-------------|
| `createClient()` | `server.ts` | Server components/actions needing user context. Uses cookies. **Cannot** be used inside `unstable_cache()` |
| `createStaticClient()` | `server.ts` | Inside `unstable_cache()` wrapped functions. Cookie-free, uses anon key. |
| `createAdminClient()` | `admin.ts` | Server-only, bypasses RLS. Use sparingly. |
| `createClient()` | `client.ts` | Client components (browser-side). |
| `getSessionUser()` | `server.ts` | Quick "who is logged in?" — local JWT read, no network call. For read-only checks only. |

**Key rule:** Never use `createClient()` (which calls `cookies()`) inside `unstable_cache()`. This was the cause of the chapter page crash (CRITICAL bug, fixed in commit bff9776). Use `createStaticClient()` instead.

### Annotation System

- Annotations use **position-based anchoring**: `position_start` and `position_end` are character offsets in the chapter's plain text content
- `quote_exact` stores the selected text, with `quote_prefix` and `quote_suffix` for disambiguation
- ChapterReader renders annotations as `<mark>` highlights with purple background
- Clicking a highlight shows the annotation + replies in a slide-in panel
- Realtime subscription in ChapterReader for live annotation updates

### Chapter Numbering (NON-OBVIOUS)

Marx's Capital Chapter 1 has 4 sections. In the database:
- `chapter_number` 1-4 = Chapter 1, Sections 1-4
- `chapter_number` 5-36 = Chapters 2-33 (formula: `marxChapter = chapterNumber - 3`)

Always use `getChapterLabel()` or `getChapterMapping()` to display the correct label. The reading TOC has a full `PART_MAP` grouping chapters into Marx's 8 Parts.

---

## Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles (auto-created on signup) | `id` (refs auth.users), `display_name`, `role` (admin/member) |
| `invite_codes` | Registration invite codes | `code`, `max_uses`, `use_count`, `active` |
| `reading_schedule` | Weekly reading assignments | `week_number`, `title`, `due_date`, `session_date`, `session_location` |
| `weekly_roles` | Role assignments per week | `week_id`, `user_id`, `role_type` |
| `discussion_prompts` | Discussion questions per week | `week_id`, `prompt_text`, `sort_order` |
| `threads` | Discussion threads | `title`, `body`, `author_id`, `week_id`, `thread_type`, `pinned` |
| `replies` | Thread replies (supports nesting) | `thread_id`, `parent_reply_id`, `body`, `author_id` |
| `glossary_entries` | Shared vocabulary (wiki-style) | `term`, `definition`, `related_terms[]`, `first_appearance_week` |
| `resources` | Shared learning resources | `title`, `url`, `resource_type`, `week_id` |
| `text_documents` | Primary texts (Capital Vol I) | `title`, `slug` |
| `text_chapters` | Chapters within documents | `document_id`, `chapter_number`, `title`, `content`, `sort_order`, `week_id` |
| `text_footnotes` | Marx and Engels footnotes | `chapter_id`, `footnote_number`, `content`, `author` (marx/engels) |
| `annotations` | Text annotations on chapters | `chapter_id`, `author_id`, `body`, `quote_exact`, `position_start`, `position_end` |
| `annotation_replies` | Replies to annotations | `annotation_id`, `author_id`, `body` |
| `confusion_counts` | Anonymous confusion flags (counts only) | `chapter_id`, `paragraph_index`, `count` — **no user_id** |
| `reading_checkins` | Weekly reading progress | `user_id`, `week_id`, `group_id`, `status` |
| `reading_milestones` | Group milestones | `week_number`, `title`, `description`, `reflection_prompt` |
| `thread_branches` | Thread branching (parent → child) | `parent_thread_id`, `parent_reply_id?`, `child_thread_id`, `branched_by`, `branched_at` — UNIQUE on child_thread_id, immutable history |
| `concept_edges` | Directed connections between glossary terms | `from_term_id`, `to_term_id`, `edge_type`, `note?`, `created_by` — wiki-style updates, creator-only deletes; production launches EMPTY |

### Enums

- `user_role`: admin | member
- `weekly_role_type`: summarizer | discussion_starter | connector | passage_picker
- `thread_type`: discussion | reflection | summary | passage_pick | connection | general
- `resource_type`: primary_text | companion | lecture | article | tool | other
- `resources.use_category`: start_here | for_going_deeper | when_stuck | for_today | tools_references | NULL (text column with CHECK constraint, optional purpose-driven grouping)
- `concept_edges.edge_type`: builds_on | leads_to | contrasts | appears_with (text, default 'builds_on'; only builds_on is exposed in v1 UI)

### RLS Policies

- **Read-only public:** threads, replies, annotations, annotation_replies — SELECT for all
- **Authenticated read:** profiles, reading_schedule, glossary, resources, text content — SELECT requires auth
- **User-scoped writes:** Users can only INSERT with their own `auth.uid()`, UPDATE/DELETE own rows
- **Admin-only writes:** Schedule, prompts, roles, text content — only `is_admin()` can modify
- **Wiki-style:** glossary_entries — any authenticated user can UPDATE any entry

### Realtime

Enabled on: `threads`, `replies`, `annotations`, `annotation_replies`

**Always clean up realtime subscriptions on component unmount.**

### Triggers

- `on_auth_user_created` — Auto-creates a `profiles` row on signup
- `update_*_updated_at` — Auto-updates `updated_at` on threads, replies, glossary, annotations, annotation_replies

---

## Design System

### Color Tokens (defined in `globals.css`)

All colors are CSS custom properties. **Never use raw hex values.** Always use `var(--token-name)`.

**Light mode:**
- `--bg-page`: #faf9fc — `--bg-card`: #ffffff — `--bg-nav`: #1a1625
- `--text-primary`: #1a1625 — `--text-secondary`: #5a5368 — `--text-inverse`: #faf9fc
- `--accent-red`: #a31545 (primary CTA, "revolutionary red")
- `--accent-purple`: #5c3d8f (secondary accent, "scholarly purple")
- `--accent-green`: #4a6741 (success)

**Dark mode** (`html[data-theme="dark"]`): All tokens swap. Accents get brighter (e.g., `--accent-red`: #e84a7a).

### Typography

- **UI text:** 'Inter', system-ui, -apple-system, sans-serif (Google Fonts)
- **Reading text:** 'Lora', Georgia, 'Times New Roman', serif (Google Fonts)
- `.reading-text`: font-size 1.125rem, line-height 1.8, max-width 68ch, padding 1.5rem
- Labels use `text-xs font-bold tracking-wide` — no `uppercase` for arbitrary labels (removed to reduce visual noise). EXCEPTION: structured editorial eyebrows (the new `.text-eyebrow` utility, 10px Inter at 0.15em tracking, used for `01 / PART ONE`, `§3 / SECTION THREE`, `WEEK 4 OF 32`-style numbered/structural labels) DO use uppercase. The distinction: arbitrary uppercase = noise; structured editorial eyebrows are a design pattern, not random caps.

### Animation System

Shared timing variables:
- `--ease-out-expo`: cubic-bezier(0.22, 1, 0.36, 1) — primary easing
- `--duration-fast`: 150ms — `--duration-normal`: 250ms — `--duration-slow`: 400ms

Key classes:
- `.animate-fade-in` — fade + translateY(8px→0)
- `.animate-slide-in-right` / `.animate-slide-out-right` — annotation panel
- `.animate-scale-in` — popovers, modals
- `.stagger-children` — parent class, staggers child fade-ins (50ms intervals)
- `.collapsible-content[data-open]` — CSS grid 0fr→1fr for smooth collapse
- `.btn-transition` — button hover/active with scale(0.97) on press
- `.skeleton-shimmer` — loading skeleton pulse

### Component Patterns

- Inline styles for theme-aware colors: `style={{ color: 'var(--text-primary)' }}`
- Tailwind for layout/spacing: `className="flex items-center gap-3 px-4 py-2"`
- Semantic CSS utility classes exist: `.text-primary`, `.bg-card`, `.border-themed`, etc.
- `.btn-primary` — red CTA button with hover/active states, `var(--accent-red)` background
- `.btn-secondary` — outlined secondary button with `var(--bg-button-secondary)` background
- `.card-elevated` — card with subtle box-shadow for visual weight
- `.card-hover` — card with hover transform/shadow transition
- Collapsibles use `data-open` attribute, not React state, for CSS animation
- Blockquotes: left border `var(--accent-purple)`, subtle background, italic, indent
- Thread type badges: per-type tinted backgrounds via `--badge-bg-{type}` CSS variables
- Nav sidebar: primary (Dashboard, Reading, Threads) / secondary (Glossary, Schedule, Resources) groups with divider

---

## Design Philosophy

### The Metaphor

Community library, not government office. Both are functional public spaces. One makes you want to stay.

### Who The Users Are

Working people, aged 14-80+. Some are politically sharp, some are just beginning to question things. Some are confident online, some are nervous about posting. The person who matters most to design for is the one who's most hesitant — the one who reads everyone else's annotations and thinks "they're all smarter than me." If the platform makes that person feel safe enough to type "I don't understand this paragraph at all" — the design is working.

### The Reading Page Is Sacred

The reading page is where people encounter Marx's actual words. It should feel like a book, not a website. Comfortable typography, constrained width, generous margins, warm highlight colors for annotations. When annotations are hidden (focused mode), it should feel like holding a physical book. When annotations are visible, it should feel like reading a book where a friend has pencilled notes in the margins — intimate, not cluttered.

### Warmth Is Structural, Not Decorative

Warmth doesn't come from slapping earth tones on a generic layout. It comes from: generous whitespace (calm, not cramped), considered typography (someone chose this font for a reason), smooth animations (the interface cares about your experience), thoughtful empty states (the platform speaks to you like a person, not a system), and the absence of anxiety-producing elements (no unread counts, no metrics, no urgency signals).

---

## Code Conventions

- TypeScript everywhere. Proper interfaces for all data shapes in `src/types/database.ts`. No `any` types (some remain — tech debt).
- Components are reusable and shared. ONE nav component. ONE thread card. ONE annotation component. Don't duplicate.
- Comments explain non-obvious decisions so Mars learns from the codebase.
- Error boundaries around major page sections.
- No dead imports, no commented-out code blocks, no unused variables.
- `.env` and `.env*.local` are in `.gitignore`. Keys never in source code — always `process.env`.

---

## Known Issues

### Should fix
1. **ChapterReader.tsx is still ~800 lines** — Pure text helpers and the per-paragraph render component were extracted to `chapter-text-utils.tsx` and `MemoizedParagraph.tsx` (commit 17 of pre-launch pass). What remains: state, effects, selection handlers, layout — all entangled. Plan §14 wanted further extraction (`useTextSelection` hook, `AnnotationLayer` / `FootnoteHandler` sub-components). Deferred — risky to split selection logic before tests exist, and the file works.
2. **No tests** — No test files, no testing framework configured.
3. **Concept map not in main nav** — The `/concepts` page is fully built (force-directed canvas, selection panel, mobile fallback) and reachable via the 'View concept map →' link in the glossary header. Per plan §3.4 it's intentionally accessed from Glossary rather than as a peer sidebar item, since the map is a view of the glossary's relational data. Reconsider after launch if discoverability is low.
4. **Run SQL seeds & migrations** — Required to be run via Supabase SQL editor:
   - `confusion-flags-schema.sql` (one-time, may already be done)
   - `thread-branches-schema.sql` (per §4.2 — required for branching feature)
   - `concept-edges-schema.sql` (per §11.2 — required for concept map)
   - `resources-use-category-schema.sql` (per §7.1 — required for purpose-driven resource grouping)
   Optional / dev only: `seed-glossary.sql`, `seed-resources.sql`, `seed-concept-edges.sql` (commented out, dev only).

### Fixed (build ticket session)
- ~~Auth middleware disabled~~ — Re-enabled. Unauthenticated users redirect to `/login`. All `// TODO: RE-ENABLE AUTH` comments removed.
- ~~Confusion flags table missing~~ — Created `confusion_counts` table (genuinely anonymous, counts only). Old per-user approach replaced with RPC functions + localStorage.
- ~~Admin badges in threads~~ — Removed from `threads/[id]/page.tsx` and `ReplySection.tsx` (violated Rule 21: dialogue between equals)
- ~~Focused mode resets on navigation~~ — Now persisted in localStorage (same pattern as fontSize)
- ~~Reading bubble requires tap to access controls~~ — Replaced with persistent bottom toolbar (ReadingToolbar.tsx)
- ~~ChapterSidebar takes horizontal space~~ — Deleted. Chapter nav moved to ReadingToolbar panel.
- ~~ReadingControls inline above text~~ — Deleted. Controls moved to ReadingToolbar.

### Fixed (earlier sessions)
- ~~React #418 hydration mismatch~~ — Fixed with `suppressHydrationWarning` on TimeAgo component (commit 59ae23e)
- ~~Reading TOC "Read →" invisible on mobile~~ — Now `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` (commit 59ae23e)
- ~~Reading TOC missing aria-labels~~ — Added descriptive `aria-label` to all chapter links (commit 59ae23e)
- ~~"This Week" badge contrast~~ — Changed to `var(--text-inverse)` on purple backgrounds (commit 59ae23e)
- ~~Session time timezone~~ — Added `timeZone: 'Pacific/Auckland'` to all date formatting (commit 59ae23e)
- ~~Chapter page crash~~ — `cookies()` inside `unstable_cache()`, fixed with `createStaticClient()` (commit bff9776)

### Fixed (design comparison session)
- ~~ChapterSidebar overlays reading text~~ — Changed `marginLeft` to `left` on fixed-position aside
- ~~Sidebar width not responsive on resize~~ — Replaced JS-based `--sidebar-width` with CSS media query
- ~~React hydration mismatch in ThemeProvider~~ — Changed `useState` initializer to always return `false`
- ~~Dashboard "This Week" monolith card~~ — Split into 3 focused cards: Reading Assignment, Next Session, Discussion Prompts
- ~~Thread type badges all look the same~~ — Per-type tinted backgrounds via CSS custom properties
- ~~ReadingCheckinButton all same color when selected~~ — Semantic colors: Done=green, Partial=purple, Behind=gray
- ~~Uppercase overuse in labels~~ — Removed `uppercase` from all section labels across components
- ~~Flat chapter navigation~~ — Replaced with card-style prev/next blocks showing chapter titles
- ~~No reading progress indicator~~ — Added 2px purple scroll progress bar on reading pages
- ~~Login/register buttons inconsistent~~ — Now use `btn-primary` class for consistent hover/active states
- ~~Mobile brand name single line~~ — Two-line layout ("Capital" / "Study Group") matching desktop
- ~~Edit textarea missing Cmd+Enter~~ — Added to ReplySection edit textarea
- ~~AnnotationPanel reply textarea fixed height~~ — Added auto-resize on input

### Fixed (pre-launch consolidation pass — 26 April 2026)
- ~~Pink/red doing too much work~~ — Page titles (Reading, Threads, Glossary, Schedule, Resources) migrated from pink Inter-bold to Lora-italic primary text + small caps eyebrow. Pink is now reserved for primary CTAs, chapter titles, current-week badge, destructive actions (§2.1).
- ~~Lora used only for reading body~~ — Pulled into display: page titles (.text-display-lg), week titles (.text-display-md), dashboard headlines, threads-list titles. New display scale tokens + utilities in globals.css (§2.2 + §12).
- ~~Editorial eyebrow style not standardised~~ — Existed ad-hoc in 3 places ('QUICK LINKS', chapter subhead, 'Part N'). Unified onto `.text-eyebrow` utility (Inter, 10px, 0.15em tracking, secondary text). Numbered structural eyebrows like '01 / Part ONE' / '§3 / Section THREE' / 'Week 4 of 32' now everywhere they belong (§2.3).
- ~~Card-on-card-on-card~~ — Card-base containers replaced with hairline structure on Dashboard, Threads list, Glossary right pane, Resources sections. New `--border-subtle` token (§13).
- ~~'Tools' meant two things~~ — Sidebar 'Tools' group label removed; reading-page Tools button renamed 'Workspace'. Sidebar accessibility panel migrated into the Reading Workspace as the 'View settings' section (§3.1, §3.2).
- ~~Profile in nav alongside other destinations~~ — Profile removed from sidebar nav; accessed via the user avatar block at the sidebar bottom (full-row click target with chevron). Mobile tab bar still has Profile (§3.1).
- ~~Reading TOC 'This Week' badge fired on every chapter~~ — Bug from a null-vs-null match (`chapter.week_id === currentWeekId` matched when both were null). Fixed by guarding on `currentWeekId !== null`. Past chapters now get a muted ✓ checkmark instead. Sections within Ch 1 gained §N eyebrows; Part headings gained '01 / Part ONE'-style numbered eyebrows (§6).
- ~~Discussion prompts rendered as numbered <ol>~~ — Prompts are invitations to think, not a checklist. Now hanging-indent paragraphs with a Lora italic '?' glyph (§8.1).
- ~~Action-button container had red border around primary red CTA~~ — Replaced with soft amber-tinted background + hairline borders so the primary CTA's red doesn't compete with a red border around it (§8.2).
- ~~Threads list was 2-col card grid with 2px green/purple borders~~ — Now single-column hairline-divided rows with Lora italic titles. Pinned/active state shown via 3px left accent stripe + small inline eyebrow tag instead of full border. Filter pills compressed to small text-button row (§4.6).
- ~~Thread detail had 'N Replies' header creating a hard separator~~ — Removed (§4.7).
- ~~Threads couldn't branch~~ — Full branching feature shipped: `thread_branches` table with RLS, inline 🌱 Branch button on every reply + the OP, BranchThreadForm with parent quote pre-population, '← Branched from [parent]' breadcrumb on child threads, '🌱 branched into [child]' indicators on parents (replies + OP), 'Conversation graph' sidebar block with parent + branches list, branch counts on the threads list cards (§4.2 — §4.7).
- ~~Dashboard had 8 stacked card-base containers, group-attention heatmap buried~~ — Restructured per §5: simple Lora italic greeting line (no card), big-stat row of 4 hairline-divided tiles at the top (Current Week / Annotations / Threads / Next Session), GroupThinkingOverview promoted to top of main column, Your Roles hides when empty, removed Next Session card (system status strip covers it), removed Weekly Activity Summary (folded into big-stat row), removed All Roles This Week widget.
- ~~No ambient context line~~ — New SystemStatusStrip on every authenticated page: 'CAPITAL STUDY GROUP · WEEK 4 OF 32 · CHAPTER 1, §4 · NEXT SESSION TUE 7PM'. Degrades gracefully when schedule isn't set up (§2.6).
- ~~Concept map was driven by `related_terms[]`, used non-existent schema columns, no animation~~ — Complete rewrite. New `concept_edges` table (directed, with edge_type / note / audit). New ConceptConnections UI on the glossary term detail (per §11.6). Full force-directed map at /concepts with editorial visual treatment per §11.8 (dotted directed edges, glowing halos, hairline corner brackets, eyebrow corner labels, animated rAF simulation). Selection panel slides in from right. Empty state when fewer than 3 terms or zero edges. Mobile fallback list view at <768px per §11.11. Per-chapter slice in the Reading Workspace per §11.5.
- ~~Resources grouped by file type~~ — Now grouped by purpose ('Start here' / 'For going deeper' / 'When you're stuck' / 'For thinking about today' / 'Tools & references') per §7.1. Type filter still works as refinement. Lighter card design — hairline + type label + Lora italic title + footer (§7.2).
- ~~Chapter title had no part-number eyebrow~~ — Added '01 / CHAPTER 1, §1 · ~11 MIN READ' eyebrow above the pink Lora-bold title (§9.1).
- ~~Glossary right pane wrapped in card-base box~~ — Dropped, structure now organised by hairlines: Definition → Concept Connections → Related Terms → History & Discussion (§10.2).
- ~~Passage-pick threads buried the source quote in the body markdown~~ — Lifted out into a structured element above the body: eyebrow + Lora italic quote + attribution + 'Open in chapter →' link (§4.7).
- ~~ChapterReader.tsx 1125 lines~~ — Pure text helpers (snapOutsideFootnoteMarker, buildSegments, buildMergedSegments, renderTextWithFootnotes) extracted to `chapter-text-utils.tsx`. MemoizedParagraph extracted to its own file. ChapterReader now ~800 lines, role clearer (§14, partial — see Should-fix #1).

### Fixed (overnight session — 16 March 2026)
- ~~`any` types in server components~~ — Replaced ~36 `any` types across 9 files with proper TypeScript interfaces matching Supabase query shapes
- ~~Duplicated AUTHOR_COLORS in 3 files~~ — Extracted to `src/lib/author-colors.ts` shared utility
- ~~ReadingCheckinButton hardcoded #ffffff~~ — Changed to `var(--text-inverse)`
- ~~DesktopSidebar hardcoded rgba colors~~ — Added `--nav-accent` / `--nav-accent-subtle` CSS tokens, replaced 6 hardcoded values
- ~~Profile page duplicate getChapterLabel~~ — Deleted local copy, imports from `@/lib/chapter-utils`
- ~~TimeAgo missing timeZone~~ — Added `timeZone: 'Pacific/Auckland'` to fallback and tooltip
- ~~Auth form focus ring colors~~ — Added `--tw-ring-color: var(--accent-purple)` to login/register inputs
- ~~Missing loading skeletons~~ — Added for glossary, schedule, resources, profile, threads/new
- ~~Missing error boundaries~~ — Added for dashboard, glossary, schedule, resources, threads, threads/[id], profile
- ~~No Cmd+Enter on auth forms~~ — Added `onKeyDown` handler with `requestSubmit()` to login and register forms
- ~~No reading time estimate~~ — Chapter pages now show "~X min read" (200 wpm for academic text)
- ~~No scroll position persistence~~ — New `useScrollPersistence` hook saves/restores position per chapter via localStorage
- ~~No print styles~~ — Added `@media print` block: hides chrome, 12pt reading text, dotted underlines for annotations, proper margins
- ~~Unused pg devDependency~~ — Removed from package.json

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Character offsets for annotation anchoring | Text is static. Offsets are simpler than XPath or DOM-based anchoring. If text ever changes, migrate to `dom-anchor-text-quote` for fuzzy matching. |
| `createStaticClient()` for cached queries | `createClient()` calls `cookies()` which crashes inside `unstable_cache()`. Cookie-free client with anon key respects RLS without touching cookies. |
| `getSessionUser()` uses `getSession()` not `getUser()` | `getSession()` reads JWT from cookie locally (instant). `getUser()` makes a network call to Supabase auth server. Only use `getUser()` for write operations. |
| `suppressHydrationWarning` on TimeAgo | Server/client will always produce different relative timestamps. This is the standard React pattern for time-dependent components. |
| "Read →" visible on mobile, hover on desktop | Touch devices have no hover state. Users aged 14-80+ need clear clickability cues. `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`. |
| Explicit `timeZone: 'Pacific/Auckland'` | Netlify server may render in UTC. The reading group is in Christchurch. Always be explicit. |
| Tailwind v4 with CSS custom properties | No `tailwind.config.js`. All theming via CSS vars in `globals.css`. Enables dark mode without JS class toggling. |
| Auth re-enabled | Middleware redirects unauthenticated users to `/login`. Auth was disabled during development for reviewer access. Now live. |
| `--sidebar-width` via CSS media query | Replaced JS-based approach (ThemeInitializer blocking script) with CSS `@media (min-width: 48rem)`. Auto-responds to viewport changes — single source of truth, no resize bugs. |
| ThemeProvider hydration fix | `useState(false)` unconditionally, `useEffect` syncs with DOM after mount. ThemeInitializer prevents visual flash, so the state mismatch for one render cycle is invisible. |
| ChapterSidebar uses `left` not `marginLeft` | Fixed-position elements need explicit `left` for reliable positioning. `marginLeft` on fixed elements doesn't reliably offset from the viewport edge. |
| Scroll progress bar is purple, not red | Differentiates from the red NavigationProgress (route transition) bar. Purple = reading progress, red = page navigation. Both are passive, non-anxiety-producing feedback. |
| "Behind" reading status uses muted gray | The platform never shames people for struggling. Behind uses `var(--text-secondary)` (gray), NOT red. Semantic colors: Done=green, Partial=purple. |
| Confusion flags use counts-only table | `confusion_counts` stores (chapter_id, paragraph_index, count) — no user_id. Client-side localStorage tracks what this browser flagged. RPC functions for atomic increment/decrement. Genuinely anonymous by design (Rule 24). |
| ReadingToolbar replaces ReadingBubble | Persistent bottom toolbar always visible vs. floating bubble that required a tap. All controls accessible without interaction: font size, theme, focus mode, chapter nav. Minimizable with chevron. |
| Threads use Discord-style compact layout | Replies show avatar + colored name + body in a single compact row. Hover-reveal actions. Max 2 nesting levels. Sticky reply input at bottom. Realtime subscription for live updates. |
| Glossary uses two-pane dictionary layout | Left: searchable term list with alphabetical/week grouping. Right: full definition with cross-linked terms, related terms, inline edit. URL param support (`?term=`) for deep linking from reading page. |
| Resources grouped by type with section headers | When showing "All" resources, groups under type headers (Primary Texts, Companion Texts, etc.) with counts. When filtered, flat grid. |
| ThreadListClient is a client component | Server component fetches all data and transforms it, then passes to ThreadListClient for interactive rendering with realtime subscription, client-side sorting/filtering. Hybrid SSR+CSR pattern. |
| Chapter navigation via keyboard shortcuts | `←`/`→` for prev/next chapter, `f` for focus mode toggle, `Escape` to close panels. Only active when not typing in an input. |
| Author avatar colors shared from `src/lib/author-colors.ts` | Was duplicated in 3 files. Centralized so palette changes require editing one file. |
| 200 wpm for reading time estimates | Standard reading speed is 250 wpm for general text. Capital is dense academic prose — 200 wpm is more realistic. Rounded to nearest minute, minimum 1. |
| Scroll persistence uses localStorage with 500ms debounce | Scroll events fire very often. 500ms debounce balances responsiveness with write frequency. Saves on unmount too for safety. `requestAnimationFrame` for restore to wait for layout. |
| Print styles convert highlights to dotted underlines | Annotation highlights would print as colored blocks which wastes ink and obscures text. Dotted underlines preserve the annotation information in print without visual noise. |
| Threads branching is client-side, two-step (insert thread, insert branch) | Supabase doesn't support client-side transactions. If step 2 fails after step 1 the orphan thread still exists — user can delete or leave it. Better than trying to write a Supabase RPC just for atomicity given the rare failure case. |
| `thread_branches` is immutable history (no UPDATE / DELETE policies) | Branches record what happened. If a parent thread is deleted, the cascade removes the row — branched children become reachable only via direct URL. We don't surface 'branched from a deleted thread' yet — open question if it ever matters. |
| `concept_edges` separates directed edges from `glossary_entries.related_terms[]` | The legacy related_terms[] is undirected and lossy. concept_edges is directed (from → to), supports an edge_type, a note, and audit. related_terms[] is kept for backward-compat (drives the 'Related Terms' pill row) but is not the source of truth for the concept map. |
| Concept map production database launches EMPTY | The map is GROUP-BUILT (per plan §11.7). The empty state of the map is itself a teaching artifact: 'this is where we are, this is what we've connected so far'. Pre-seeding production with curated edges defeats that. A `seed-concept-edges.sql` exists for dev only, fully commented out, with a 'TEST DATA ONLY — do not run in production' header. |
| Concept map renders force-directed canvas only on >=768px | A force-directed graph at 375px is a UX dead end (too small to see, hard to pan, impossible to read labels). Mobile gets a list view sorted by connectedness, with each term's 'builds on' edges shown as text. Same data, different surface (per plan §11.11). |
| `accessibility-panel` migrated from sidebar to Reading Workspace | Settings still apply globally via AccessibilityProvider at the app root — what changes is WHERE you configure them. Trade-off: someone wanting high contrast on the dashboard has to go to a chapter page first. Worth it to consolidate the two-Tools confusion. |
| Big-stat tiles use Lora italic, not bold sans | Editorial pull-quote rhythm rather than KPI dashboard widget. Per plan §2.5 — big number in Lora italic at ~2.5rem, eyebrow caption below. Reads as 'thoughtful editorial space' not 'branded SaaS metrics'. |
| Page titles are Lora italic in primary text color, NOT pink | Pink reserved for active states / primary CTAs / chapter titles / current-week badge / destructive actions. When pink shows up in roughly the same position on every page, it's wallpaper. Pulling it back to a few specific roles makes it carry meaning where it appears. |
| ChapterReader extracted helpers to `chapter-text-utils.tsx` + MemoizedParagraph to its own file | Pure file-split refactor, no behavior change. Plan §14 wanted further extraction (useTextSelection hook, AnnotationLayer / FootnoteHandler / ChapterContent sub-components). Deferred — selection logic is too tangled to safely split pre-launch without tests. Documented in Should-fix #1. |
| Private journal table is RLS-only, no realtime, no admin read path | Journal entries are pedagogically valuable only if the privacy actually holds. Even Mars-as-admin should never read another user's entries via the UI. RLS is the guarantee; service_role queries can technically bypass but are never used for journal reads in app code. No realtime subscription on the table — broadcasting entries even within an RLS-filtered channel adds unnecessary surface area. |
| Journal editor written from scratch using test-news as a visual reference | The test-news writer-studio editor is built on TipTap with 17+ extensions, deeply integrated with journalism-specific affordances (slash commands, block menus, image dialogs, research panels, grade-level scoring). Lifting it would have meant dragging in megabytes of TipTap and stripping most of it. The journal needs bold/italic/blockquote/list/link — a small markdown textarea handles that with no dependency cost. The visual feel (clean writing surface, autosave indicator, word count) is borrowed; the implementation is bespoke. localStorage backup pattern is lifted in spirit from test-news /hooks/useLocalStorage.ts. |
| Journal autosave writes a localStorage backup on every keystroke and clears it after a successful Supabase save | Connection failures shouldn't lose someone's writing. The local backup is a defence-in-depth — if the Supabase save fails (or the page crashes mid-edit), the next page load reads the backup and restores the in-progress draft, with a small notice telling the user. Cleared after successful save so we don't leak old drafts forever. |
| Testing-mode override via URL parameter, not UI panel | Lightest possible: no UI to maintain, no toggle to forget, no admin panel to gate. Admin-only via role check; non-admin requests silently ignore the parameter. Doesn't persist across navigation, so accidentally sticky overrides are impossible. Server-side helper (rather than a client hook) so the override is applied before render — no flash of the un-overridden state. |
| Optional title on journal entries, identified by date when blank | Required title makes entries feel like documents to be polished. No-title-only is too austere — sometimes naming the thought IS the thinking. Optional respects both modes. |
| Glossary terms fetched server-side, not client-side | `glossary_entries` table has RLS requiring authentication. Client-side fetch via browser Supabase client fails silently when auth session isn't synced across browsers. Server-side fetch via `unstable_cache` + `createStaticClient` is reliable. |
| L1 multi-tenancy: `is_group_member()` SECURITY DEFINER STABLE helper for RLS, not inline subqueries | RLS policies on every group-scoped table could have written `EXISTS (SELECT 1 FROM group_memberships WHERE user_id = auth.uid() AND group_id = X)` directly inline. Two reasons against. (a) `group_memberships` itself has RLS — its SELECT policy filters to the user's own rows. An inline subquery from another table's policy re-triggers that policy on every evaluation. Postgres handles the recursion but generates extra plan complexity, and any future attempt to harden membership visibility (e.g. hide other members' join dates) would silently break the RLS of every unrelated table that did the inline lookup. SECURITY DEFINER bypasses RLS on `group_memberships` specifically during the membership check — clean, no entanglement, the helper's contract is sealed off from how membership rows are otherwise visible. (b) Single source of truth across ~12 group-scoped tables × 4 verbs ≈ 48 policies all expressing the same logic. STABLE lets the planner cache per-input within a query so the helper-call cost is one evaluation per `(user, group)` pair instead of 48. Future change to membership semantics — banned users, paused memberships, expiry — touches one function instead of 48 inline subqueries scattered across migration files. |
| L1: denormalized `group_id` on inherited tables with BEFORE INSERT/UPDATE parity triggers, not parent-join RLS | `replies`, `annotation_replies`, `glossary_versions`, `glossary_comments`, `concept_edges`, `thread_branches` are all children of group-owned parents. Natural-shape RLS would be `is_group_member((SELECT group_id FROM threads WHERE id = replies.thread_id))` — a parent-join lookup per policy evaluation, on every read AND every write. Multiply across 7 child tables × N rows per page × K policies per verb and the cost compounds without ever surfacing in any individual query plan that looks problematic. The denormalized column collapses RLS to `is_group_member(child.group_id)` — same shape as the parent table, same `(group_id, ...)` index, same per-eval cost. Drift protection comes from BEFORE INSERT/UPDATE triggers (`enforce_child_group_id_*`) that assert `child.group_id = parent.group_id` at row time and reject mismatches; the denormalization can't drift from the join-equivalent because the trigger forbids it. Trade-off accepted: 7 trigger functions to maintain in exchange for uniform policy shape across every group-scoped table. A future contributor reading `replies` policies sees the same `is_group_member(group_id)` they saw on `threads`, doesn't have to mentally model the join, and can't accidentally write a child-table policy that's looser than its parent. |
| L1: DROP + CREATE on `increment_confusion` / `decrement_confusion` RPC signatures, not additive overload | Postgres function overloading lets us add a 3-arg signature alongside the existing 2-arg, leaving both callable. We chose against. (a) Atomic deploy semantics. With both signatures live, any client missed in the L1 read-query audit silently keeps calling the 2-arg version, writing confusion counts without `group_id` (or to whatever default the old function pinned). That is exactly the leak L1 exists to close. With drop-then-create, the old signature doesn't exist; missed callers fail loud with `function increment_confusion(uuid, integer) does not exist`. The deploy window between "migration ran" and "all client code shipped" becomes "all confusion writes fail" instead of "some confusion writes silently write to the wrong group." Loud failure is the correct failure mode here — confusion data is the most pedagogically valuable signal in the system, and a leak that quietly mislabels it is worse than a brief outage. (b) Audit completeness as a forcing function. The only way to prove "every caller has been updated" is for the old signature to no longer be callable. As long as the 2-arg version exists, you can't prove no caller is still on it — you're trusting your grep. Drop-and-create is the schema's assertion that the audit is complete and we accept loud breakage on any miss. The migration's V3 verification (the `pg_proc` check that the 2-arg signature does NOT exist) is the receipt for that assertion. |
| L1 process: pre-flight grep applies to every table referenced in DDL, not just the obvious ones | The L1 forward migration referenced `confusion_flags` (legacy table from migration 001) which didn't exist in the live DB — caught at first run when migration errored with "relation does not exist." Fixed mid-flight by wrapping the policy block in a `DO ... IF EXISTS` conditional, but the discovery was avoidable. The pattern that worked for `group_members`, `DEFAULT_GROUP_ID`, slug references should have been applied to every table touched by DDL, including ones we assumed were stable. Future migrations: grep the live `information_schema.tables` for every table referenced before writing the migration, not just the ones that feel central to the change. |
| L1 process: every migration runs on main with explicit risk acknowledgment (Supabase branching is paid-tier only) | The earlier framing of this note was "branch first, no exceptions, data risk is irrelevant." Then 006 (Schedule modes) hit the wall: Supabase branching is gated to paid plans on this project, and we're on Free. The original rule presupposes branching is available; without it, the rule becomes "stop and flag at every migration" which isn't workable as a working pattern. Honest restate: every migration on this project runs on main, and we accept that rollback failure on real data means data loss with no second chance. The cost is currently bounded because the only at-risk data is dev/test work for a single developer pre-launch. The cost grows real once Watermelon has members with annotations, threads, glossary entries, and confusion flags they care about. Re-evaluation triggers when that happens — either upgrade the Supabase plan to unlock branching, or stand up a parallel Supabase project as a manual staging environment. Until then: every migration is an explicit risk-accepted move; the rollback file gets written and tested by running rollback-then-forward on the same main DB before declaring the migration done; no flag-and-pause needed at each migration since the constraint is structural. The L1 lesson that DID survive: rollback-then-forward as a paired test on every migration before the migration is "done" — running forward without ever testing rollback is the precondition that bit L1, and avoiding it is independent of whether the test happens on a branch or on main. |
| L1 process: tool-limitation iteration must change shape, not repeat the same shape | When the Supabase SQL editor was hiding intermediate results behind later errors during V4, the first three workarounds were variations of the same pattern (highlight-and-run, split into reads-only-vs-writes-only with multiple blocks per file, highlight-and-run again). The fix that actually worked was splitting into single-block files where each file contained exactly the one query whose result we wanted to see. When iterating against a tool limitation, the first step is to name the limitation specifically; the next step's shape has to be a different shape, not a different angle on the same shape. |
| L1 process: runbooks make dependencies explicit | The V4 wiring SQL silently no-op'd when run before user_alpha and user_beta existed in `auth.users` — the `INSERT ... SELECT FROM auth.users WHERE email = 'X'` returned 0 source rows and reported success with 0 rows inserted. No error, no warning. Caught by the confirmation SELECT at the bottom returning 0 rows where 2 were expected, but only after wasted iteration. Future runbook patterns: explicit dependency-check step before any operation that depends on prior state ("confirm user_alpha and user_beta visible in Auth → Users before running this file"), not just inline comments saying "run this after." Dependencies as steps, not as prose. |
| L1 process: "wanting to move on" at the end of a session is a real bias to flag | Mid-session I tried to declare V4 verified based on one direction proven (beta cross-group reads = 0, beta cross-group write rejected) plus a structural symmetry argument for the other direction (the RLS policies are uniform, so alpha→Watermelon is mathematically equivalent to beta→test-group). The reasoning was sound but the verification doc's standard is evidence-based, not argument-based — and the schema-vs-application gap that prompted L1 was exactly the kind of failure where structural reasoning said "should be fine" while reality said otherwise. Mars pushed back, the cost of running alpha direction directly was small, the cost of accepting symmetry instead of testing both directions as precedent was real. The pattern: at the end of a session when the structural argument starts looking more compelling than it should, that's the moment to flag the bias rather than rationalize through it. |
| Schedule modes recurring v1: process — paired-test discipline has TWO failure modes, not one | The L1 process note above frames the rule as "rollback-then-forward as paired test before declaring done — running forward without ever testing rollback is the precondition that bit L1." Schedule modes (recurring v1) surfaced the inverse failure: 007's paired-test loop ended after running rollback without re-applying the forward, leaving advance_chapter and set_group_started_at missing from production. Caught only during V5 verification when the schedule page surfaced "Could not find the function public.advance_chapter in the schema cache" mid-test. The schemas (006 columns) and 010's set_group_session_timing were unaffected; just 007's two RPCs were silently dropped. Both directions are real failure modes. The discipline rule extended: paired test ENDS with the migration in the intended end-state (forward applied), not in either of the intermediate states. The receipt for "paired test done" is a `pg_proc` / `information_schema` query confirming the post-state matches the V1 schema check, run AFTER the loop. Without that final confirmation, the loop can have completed any subset of its intended steps. The 007 incident is the inverse-mode case study; future migrations end with a post-state confirmation read regardless of how the rollback test went. |
| Schedule modes recurring v1: separate domain commits ship cleaner than one atomic ship for cross-domain pieces | The original framing was "ship sub-batch 5 atomically when all 8 sites are done." Mid-piece, the work split into two coherent domains: (a) session timing (010 — orthogonal to chapter content), and (b) chapter-anchored content (008 + 009 + threads/glossary/reading widgets). Shipped as two atomic commits — `e78cbee` for 010 (10 files) and `e4895f3` for 008+009+app code (20 files). The half-state pattern V5 caught in L1 was about partial UI state across surfaces of the same feature; splitting orthogonal domains doesn't reproduce that because they're different features. Two-commit shipping reduced WIP exposure (the 010 work didn't have to wait through 4 sub-sub-batches of unrelated chapter work) and made each commit's diff coherent. The framing for future cross-domain pieces: orthogonal domains can ship as separate atomic commits if the half-state risk is genuinely zero across the seam; same-feature surfaces stay atomic. Apply the test honestly — "do these surfaces depend on each other's state to render correctly?" If yes, atomic. If no, split. |
| Schedule modes recurring v1: text_chapters.week_id is a dead column platform-wide | Discovered during item 9 audit (28 April 2026): `text_chapters.week_id` is NULL for every chapter row, despite the FK existing in the schema since the original setup. The `text_chapters` table was never seeded with week assignments. CLAUDE.md's "Fixed bugs" list already documented one consequence: the Reading TOC "This Week" badge fired on every chapter via null-vs-null match. Item 9 surfaced the broader scope — any code path that joins `text_chapters` to `reading_schedule` via `week_id` returns empty everywhere. Three sites were broken pre-recurring: `/reading` TOC (fixed earlier with null-guard), `ConceptsNotesModal`, `ChapterConceptSlice`. The recurring v1 piece swept the latter two onto direct `chapter_id` filtering (sub-batch 5 surface-during-build expansion) so they fix-and-modernize in one move. Note for future bounded / specific schedule modes: when those land, they'll need to either populate `text_chapters.week_id` themselves OR redesign around not needing it (e.g., `reading_schedule` rows reference `text_chapters` via a separate join table). The dead column is the kind of thing that quietly bites when assumptions about "the schema does X" don't survive contact with the actual data. |
| Schedule modes recurring v1: small judgment calls vs structural surfaces | Working pattern through this piece: Mars set "ship with your judgment, surface only if structural" mid-piece to compress turn-taking. Five surface-during-build expansions ended up landing under that rule (banner-reflects-selected-chapter, sweep ConceptsNotesModal + ChapterConceptSlice, reading-page completed-chapter swap, drop dead `chapter.week` field, ChapterConceptSlice updated despite being orphaned). Three of those Mars confirmed via brief surface; two went forward as small judgment calls. The post-hoc test for "was that a structural surface?" is whether leaving the change OUT would have created a half-state across surfaces of the same feature. All five passed that test. Surfacing structural changes mid-piece is real cost; not surfacing small mechanical follow-throughs of the locked design is real value. The pattern: if the change is downstream of a locked decision (e.g., chapter-anchored data → chapter-anchored display copy), it's mechanical follow-through; if the change is itself a new locked decision (e.g., schema option A vs B vs C), it's a structural surface. |
| Brief 1: single atomic `registerUser` server action over two-step client orchestration | The pre-Brief 1 signup path was: client calls `validateInviteCode` server action → client calls `supabase.auth.signUp` → done (no membership insert). L1 anticipated Brief 1 closing the membership gap; the brief itself wrongly assumed the gap was already closed. Real shape after investigation: the gap was open AND the two-step flow had a real orphan-auth-user race (signUp succeeds, membership insert fails → user has account + profile but no membership, next page render trips `getCurrentGroupOrThrow`'s explicit error). Solution: collapse to one server action `registerUser(invite_code, display_name, email, password)` that does validate → admin.createUser (service role, email_confirm=true) → membership insert (service role) → use_count increment → signInWithPassword (cookie-aware client to set session cookies for the response). Failure of any step 3+ rolls back via `admin.deleteUser` (auth.users → profiles cascade-deletes). Single round-trip from client. Session 2's developer-flag check becomes a one-line addition inside one function instead of threading through validateInviteCode + a separate membership action + the client orchestration. |
| Brief 1: use_count increment runs AFTER auth user creation succeeds, not before | The legacy `validateInviteCode` incremented `invite_codes.use_count` BEFORE `auth.signUp`, meaning a failed signup post-validation burned a use against a user that never existed. WATERMELON26 has `max_uses=NULL` (reusable) so the race was harmless for v1, but the same shape applied to any future finite-use code. Brief 1's `registerUser` flow moves the increment to after `admin.createUser` succeeds — the right shape for finite-use codes when they ship. Documented in migration 012 header as "tech debt resolved" rather than "tech debt to address later." |
| Brief 1: inline-in-page-components for the templating shape (sub-batch 2 architectural decision) | Two surfaces consume similar recurring-mode templating shapes: (1) interim landing meta-row needs dual counter + chapter label + next-session sentence with honest empty-state degradation; (2) onboarding scroll section 2 needs the weekday-plural for "Meet on Tuesdays" vs "Meet weekly". SystemStatusStrip (parallel-session-shipped) already inlines the dual-counter computation. Three current/upcoming places, all inline. Working pattern: inline-per-surface is fine at TWO surfaces; the extraction trigger is THREE. Architectural note captured in `src/lib/session-timing-format.ts` header comment so future-Cowork looking for "where do session/timing helpers live" hits the trigger condition where they'd look. The note names the existing inlines + the trigger candidates (Session 3's group-scoped schedule view, R2's moderation views, post-launch). When the trigger fires, the right move is to extend `session-timing-format.ts` with `computeDualCounter` / `formatSessionWeekdayPlural` exports and migrate all three inlines simultaneously. |
| Brief 1: defensive `has_completed_onboarding` routing default | The `loginUser` server action looks up the user's flag post-signin and routes accordingly: `true` → `/dashboard`, anything else → `/welcome`. The "anything else" defaults catch null-flag rows (shouldn't exist post-migration 011's NOT NULL constraint) and missing-profile rows (shouldn't exist post-`on_auth_user_created` trigger), but if either ever surfaces — schema drift, partial migration state, edge-case auth.user without trigger fire — the user lands on `/welcome` rather than crashing. Worst case: they see onboarding once more. Better than failing the signin altogether. The defensive default also collapses the post-signup case: signup always routes to `/welcome` regardless of flag, since the new account hasn't seen onboarding. |
| Brief 1: profile lookup post-signin uses service role, not user-cookie client | After `signInWithPassword` succeeds in `loginUser`, the next step is reading `profiles.has_completed_onboarding` to decide where to route. Using the user-cookie client for this read is brittle — the just-set session cookies are written to the response but not necessarily readable by another query through the same cookie client within the same server-action invocation (cookies are response-bound, not in-flight-readable). Service role bypasses this entirely; the user_id we just got from `signInWithPassword`'s response data is the right filter. RLS isn't the right tool for "let a user read their own onboarding flag" since the auth.uid() context isn't established yet. |
| Brief 1: onboarding scroll uses inline `<style>` block, not globals.css | The welcome scroll's animation styles (welcome-scroll, welcome-section, welcome-visual, scroll-snap, prefers-reduced-motion override) apply only on `/welcome`. Single-consumer styles. Globals.css addition would be speculative — these animations don't exist anywhere else on the platform (the rest of the platform is calm-by-design, no scroll-driven anything). Inline `<style>` block in the client component keeps the styles co-located with the consumer. If a second scroll surface ever appears (unlikely), promote to globals.css then. |
| Brief 1: middleware deliberately skips `/`, auth-redirect lives in the page | The middleware skips `/` by design so the unauth landing render is fully cacheable (no edge function call required). For Brief 1, the landing became dynamic (Watermelon's `groups` row drives the meta-row) but stayed unauth-cacheable via `unstable_cache` with 60s revalidate. Auth-redirect for logged-in users hitting `/` lives server-side in the page component — `getSessionUser()` plus `redirect('/dashboard')`. Behavior change vs pre-Brief 1: previously logged-in users saw the static landing then had to click Sign In to bounce; now they bounce server-side. Cleaner flow, no double-hop. |
| Brief 1 process: Chrome MCP + Supabase dashboard verification quirks | Captured during sub-batch 1 paired tests (migrations 011 + 012). Three patterns to know: (1) The Cowork redaction layer occasionally blocks Supabase dashboard renders if the tab gets backgrounded — Mars keeping the dashboard tab foregrounded was the unblocker; without that, body text returns redacted and Monaco never appears in the DOM. (2) Supabase fires a "Query has destructive operations" confirmation dialog before DROP, DELETE, etc. The Run button click only opens the dialog; an additional click on "Run this query" inside is required. Forward migrations (INSERT, ALTER ADD) don't trigger it. Caught me on the 011 rollback — first DROP attempt looked like it ran but the dialog was sitting open, and the V1 check showed the column "still existed" because the rollback never actually executed. (3) Supabase's result grid virtualizes columns horizontally — DOM-scraping `[role="gridcell"]` only returns currently-rendered (in-viewport) cells. Wide queries (>~6 columns at default panel width) need either column reordering, narrower projections, or programmatic scroll before scraping. The 7th-column-missing surfaced this; would have rationalized past it without testing with a narrow query first. |
| Brief 1 process: when sub-batch 2 has nothing concrete to ship, the architectural decision capture IS the deliverable | "Templating helpers inline-in-page-components" sub-batch initially read as "build helpers". The inline-in-page-components decision means there are no helpers to extract — the consumer pages (sub-batches 4 and 7) inline their own. That left sub-batch 2 ostensibly empty. But Mars's instruction included "capture TODO note about future-refactor trigger condition." The note IS the deliverable. Future-Cowork looking for "where do session/timing helpers live" hits the trigger condition without re-deriving the choice. Working pattern: when an inline decision is the right shape, the architectural-decision-capture is real shippable work; treat it as the sub-batch's primary output rather than as deferred bookkeeping. |

---

## Rules

These are hard-won. Follow them always.

1. **Nav order is ALWAYS:** Dashboard, Reading, Threads, Members, Glossary, Journal, Schedule, Resources. Profile is NOT in the sidebar nav — it's accessed via the user avatar block at the sidebar bottom (the row with the user's initial + name + chevron). Mobile tab bar still has Profile (mobile users need a tap target). On every page. No exceptions. (Members sits between Threads and Glossary — pairs with Threads as group-context "who/what we said"; Glossary onward becomes reference material.)
2. **No likes, reactions, upvotes, engagement metrics, or gamification.** Ever.
3. **Confusion flags are ANONYMOUS.** No names attached, ever.
4. **Animations on everything** that opens/closes/appears/disappears. Nothing should snap. 150-250ms, ease-out.
5. **The reading page is the core feature.** It gets priority attention for quality and performance.
6. **Blockquote styling matters** — people quote Capital constantly. Left border, subtle background, indent.
7. **Test at 375px (mobile) and 1440px (desktop) minimum.**
8. **Clean up Supabase Realtime subscriptions on component unmount.** Always.
9. **`.env` is in `.gitignore`.** Keys never in source code.
10. **Commit messages describe WHAT changed**, not just "fix bug."
11. **Never use `createClient()` inside `unstable_cache()`.** Use `createStaticClient()`.
12. **Never hardcode hex colors.** Always use `var(--token-name)`.
13. **Use `getSessionUser()` for read-only auth checks.** Use `supabase.auth.getUser()` only for write operations.
14. **All date formatting must include `timeZone: 'Pacific/Auckland'`.** The server may run in UTC.
15. **After modifying any page layout, verify nav order** matches the standard.
16. **Thread types are visual cards, not a plain dropdown.** 6 types, each with emoji and description.
17. **The admin interface must be usable by a non-technical person.** If it's confusing, it's not done.
18. **Auth is now enabled.** Middleware redirects unauthenticated users to `/login`. All `// TODO: RE-ENABLE AUTH` comments have been removed.
19. **Chapter numbering is non-obvious.** Ch1 has 4 sections (chapter_number 1-4), Ch2 starts at 5. Always use `getChapterLabel()`.
20. **Collapsibles use CSS grid**, not JS height calculation. Set `data-open="true"` on `.collapsible-content`.
21. **Facilitator posts in threads must NOT be visually distinguished from member posts.** No "teacher" badge, no special styling. Freirean principle: dialogue between equals.
22. **Discussion prompts are always phrased as questions**, never as instructions or statements.
23. **If chapter text ever needs correcting, annotation offsets must be migrated.** Never silently change chapter content without a migration plan.
24. **Confusion flags are genuinely anonymous at the database level.** Not just "hidden" — store counts only, not user IDs. No way, even for admins, to see who flagged what.
25. **Empty states are invitations, not error states.** Every empty state should feel welcoming, not like something is broken.
26. **The reading page in focused mode should feel like a physical book.** No chrome, no distractions, just text and comfortable typography.
27. **Design for the most hesitant member.** When in doubt, ask: "would the most hesitant person in the group feel safe using this?" If not, redesign it.
28. **Annotation highlights should feel like warm marker pen**, not clinical highlighting. Semi-transparent warm tones that don't fight with the text color.
29. **Weekly activity summary should tell a story**, not list metrics. "The group annotated 14 passages this week, with the most discussion around the value-form" — not "14 annotations, 3 threads, 2 glossary entries."
30. **Thread previews show enough body text to decide whether to click** — 2-3 lines minimum. A title alone doesn't convey whether a reflection is worth reading.
31. **Blockquote styling must look good because it's one of the most-seen elements.** People quote Capital constantly. Left border, subtle background, slight indent — tested in both light and dark mode.
32. **Author avatar colors are shared from `src/lib/author-colors.ts`.** Never duplicate the AUTHOR_COLORS array or hashColor function in individual components.
33. **Always push and merge when asked to commit.** When the user asks to push, also merge the working branch into `main` and push `main` to origin. Don't ask — just do both.

---

## Dev Workflow

```bash
cd /Users/marco/CCP
npm run dev              # Next.js dev server on port 3000
npm run build            # Verify build passes before pushing
git push origin main     # Triggers Netlify auto-deploy
```

**Environment:** `.env.local` in project root with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

**Netlify dashboard:** https://app.netlify.com/projects/capitalstudygroup
**Supabase dashboard:** https://supabase.com/dashboard/project/aufzylsnowiareuionna
