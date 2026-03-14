# CLAUDE.md — Critical Consciousness Project Memory

Read this file at the start of every session. It is your memory of this project.

Last updated: 15 March 2026

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
| Fonts       | Lora (serif, reading), system-ui  | —        |
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
│   │   ├── layout.tsx           # Auth pages layout (minimal, no nav)
│   │   ├── login/page.tsx       # Login page
│   │   └── register/
│   │       ├── page.tsx         # Registration page (invite code required)
│   │       └── actions.ts       # Server actions for registration
│   └── (main)/
│       ├── layout.tsx           # Main layout — nav bar, user display, theme toggle
│       ├── dashboard/page.tsx   # Dashboard — welcome, this week, activity, roles
│       ├── reading/
│       │   ├── page.tsx         # Table of contents — all parts/chapters
│       │   └── [slug]/[chapter]/
│       │       ├── page.tsx     # Chapter reading page — text, footnotes, annotations
│       │       ├── loading.tsx  # Skeleton loader
│       │       └── error.tsx    # Error boundary
│       ├── threads/             # Thread list, new thread, thread detail
│       ├── glossary/page.tsx    # Glossary with search and add term
│       ├── schedule/page.tsx    # Reading schedule with weekly cards
│       ├── resources/page.tsx   # Resources with type filters and add form
│       └── concepts/page.tsx    # Concept map (hidden from nav, in-progress)
├── components/
│   ├── reading/                 # ChapterReader, AnnotationPanel, SelectionToolbar, etc.
│   ├── threads/                 # NewThreadForm, ThreadTypeBadge, ReplySection, etc.
│   ├── layout/                  # ThemeProvider, ThemeToggle, NavLink, MobileNav, etc.
│   ├── dashboard/               # ReadingCheckinButton, WeeklyActivitySummary, etc.
│   ├── schedule/                # SessionNotes
│   ├── glossary/                # GlossaryList, GlossaryVersionHistory
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
│   ├── confusion-flags.ts       # Confusion flag utilities
│   └── glossary-utils.ts        # Glossary search/matching
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
| `reading_checkins` | Weekly reading progress | `user_id`, `week_id`, `group_id`, `status` |
| `reading_milestones` | Group milestones | `week_number`, `title`, `description`, `reflection_prompt` |

### Enums

- `user_role`: admin | member
- `weekly_role_type`: summarizer | discussion_starter | connector | passage_picker
- `thread_type`: discussion | reflection | summary | passage_pick | connection | general
- `resource_type`: primary_text | companion | lecture | article | tool | other

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

- **UI text:** system-ui, -apple-system, sans-serif
- **Reading text:** 'Lora', Georgia, 'Times New Roman', serif (Google Fonts)
- `.reading-text`: font-size 1.125rem, line-height 1.8, max-width 68ch

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
- Collapsibles use `data-open` attribute, not React state, for CSS animation
- Blockquotes: left border `var(--accent-purple)`, subtle background, italic, indent

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

### Must fix before launch
1. **Re-enable auth middleware** — Uncomment redirect blocks in `middleware.ts`. Audit `createAdminClient()` usage. Test login/register flow end-to-end.
2. **Confusion flags table** — `confusion-flags.ts` and `ConfusionFlagButton.tsx` exist, but no `confusion_flags` table in `schema.sql`. Needs database table or feature update.

### Should fix
1. **`any` types in server components** — `doc: any`, `chapter: any` in reading pages, `thread: any` in dashboard. Should use interfaces from `database.ts`.
2. **ChapterReader.tsx is too large** — Consider breaking out text selection logic, annotation rendering, and footnote handling into separate hooks or sub-components.
3. **No tests** — No test files, no testing framework configured.
4. **Concepts page** — Route exists at `/concepts` but not in nav. Either finish and add or remove.

### Fixed (this session)
- ~~React #418 hydration mismatch~~ — Fixed with `suppressHydrationWarning` on TimeAgo component (commit 59ae23e)
- ~~Reading TOC "Read →" invisible on mobile~~ — Now `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` (commit 59ae23e)
- ~~Reading TOC missing aria-labels~~ — Added descriptive `aria-label` to all chapter links (commit 59ae23e)
- ~~"This Week" badge contrast~~ — Changed to `var(--text-inverse)` on purple backgrounds (commit 59ae23e)
- ~~Session time timezone~~ — Added `timeZone: 'Pacific/Auckland'` to all date formatting (commit 59ae23e)
- ~~Chapter page crash~~ — `cookies()` inside `unstable_cache()`, fixed with `createStaticClient()` (commit bff9776)

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
| Guest bypass for testing | Auth redirects commented out with `// TODO: RE-ENABLE AUTH`. Lets reviewers access all pages. Auth code is preserved — don't delete it. |

---

## Rules

These are hard-won. Follow them always.

1. **Nav order is ALWAYS:** Dashboard, Reading, Threads, Glossary, Schedule, Resources. On every page. No exceptions.
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
18. **Don't remove `// TODO: RE-ENABLE AUTH` code.** It's needed for launch. Just keep it commented until ready.
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
