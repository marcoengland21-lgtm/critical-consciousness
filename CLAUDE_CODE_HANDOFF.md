# Critical Consciousness Project — Claude Code Handoff

This document contains everything you need to open this codebase and start working. Read it completely before touching any code.

---

## 1. Project Overview

**What this is:** A collaborative study platform for a Christchurch, NZ reading group working through Marx's *Capital, Volume I*. The group is ~8 people aged 14 to 80+. The platform lets them read the text together, annotate passages, discuss chapters in threads, track a weekly schedule, build a shared glossary, and collect resources.

**Core philosophy:** This is a Freirean political education tool. The design principles are:
- No likes, reactions, or upvotes (no performative engagement)
- No notifications for v1 (calm technology)
- Chronological sorting only (no algorithms)
- Anonymous confusion flags (people can mark paragraphs they find confusing without their name attached)
- The platform should feel like a shared notebook, not social media

**Live site:** https://capitalstudygroup.netlify.app
**GitHub:** https://github.com/marcoengland21-lgtm/critical-consciousness
**Supabase project:** https://aufzylsnowiareuionna.supabase.co (project ID: `aufzylsnowiareuionna`)

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| React | React | 19.2.4 |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth (email/password) | — |
| CSS | Tailwind CSS v4 | 4.2.1 |
| Hosting | Netlify | — |
| Fonts | Lora (serif, for reading text), system-ui (UI) | Google Fonts |
| Language | TypeScript | 5.9.3 |

**Key architectural decisions:**
- Tailwind v4 uses `@import "tailwindcss"` in CSS, not a `tailwind.config.js` file. No config file exists. Customization is done via CSS custom properties in `globals.css`.
- All styling uses CSS custom properties (design tokens) for theming. Components use inline `style={{ color: 'var(--text-primary)' }}` rather than Tailwind classes for colors. This enables the dark mode system.
- The app uses the Next.js App Router with route groups: `(main)` for authenticated pages and `(auth)` for login/register.

---

## 3. Codebase Map

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
│       ├── dashboard/
│       │   ├── page.tsx         # Dashboard — welcome, this week's reading, activity, roles
│       │   └── loading.tsx      # Skeleton loader
│       ├── reading/
│       │   ├── page.tsx         # Table of contents — all parts/chapters from text_documents
│       │   ├── loading.tsx      # Skeleton loader
│       │   └── [slug]/[chapter]/
│       │       ├── page.tsx     # Chapter reading page — text, footnotes, annotations
│       │       ├── loading.tsx  # Skeleton loader
│       │       └── error.tsx    # Error boundary
│       ├── threads/
│       │   ├── page.tsx         # Thread list with type filters
│       │   ├── loading.tsx      # Skeleton loader
│       │   ├── new/page.tsx     # New thread form
│       │   └── [id]/
│       │       ├── page.tsx     # Thread detail with replies
│       │       └── loading.tsx  # Skeleton loader
│       ├── glossary/page.tsx    # Glossary with search and add term
│       ├── schedule/page.tsx    # Reading schedule with weekly cards
│       ├── resources/page.tsx   # Resources with type filters and add form
│       └── concepts/page.tsx    # Concept map (hidden from nav, in-progress)
├── components/
│   ├── reading/
│   │   ├── ChapterReader.tsx    # THE core component — text rendering, selection, annotations
│   │   ├── AnnotationPanel.tsx  # Slide-in panel for creating/viewing annotations
│   │   ├── AnnotationPopover.tsx # Popover shown when clicking an annotation highlight
│   │   ├── SelectionToolbar.tsx # Toolbar shown on text selection (Annotate / Start Thread)
│   │   ├── FootnoteInline.tsx   # Inline footnote markers with expand/collapse
│   │   ├── GlossaryTooltip.tsx  # Tooltip for glossary terms in reading text
│   │   ├── ConfusionFlagButton.tsx # Anonymous confusion flag toggle per paragraph
│   │   ├── OnboardingHint.tsx   # First-time user hint for text selection
│   │   ├── ReadingControls.tsx  # Font size controls
│   │   ├── CollapsiblePart.tsx  # Collapsible parts in the TOC
│   │   └── BackToTop.tsx        # Scroll-to-top button
│   ├── threads/
│   │   ├── NewThreadForm.tsx    # Thread creation form (client component)
│   │   ├── ThreadTypeBadge.tsx  # Type badge (Discussion, Reflection, etc.)
│   │   ├── ThreadActions.tsx    # Edit/Delete buttons for thread authors
│   │   ├── ReplySection.tsx     # Reply list and reply form
│   │   └── QuoteFromReadingModal.tsx # Modal to select text from reading for thread quote
│   ├── layout/
│   │   ├── ThemeProvider.tsx    # React context for dark/light mode
│   │   ├── ThemeToggle.tsx      # Moon/sun toggle button
│   │   ├── ThemeInitializer.tsx # Script tag to set theme before hydration (no flash)
│   │   ├── NavLink.tsx          # Nav link with active state
│   │   ├── MobileNav.tsx        # Hamburger menu for mobile
│   │   ├── LogoutButton.tsx     # Logout button
│   │   └── NavigationProgress.tsx # Top loading bar on navigation
│   ├── dashboard/
│   │   ├── ReadingCheckinButton.tsx  # Done/Partial/Behind progress buttons
│   │   ├── WeeklyActivitySummary.tsx # This Week's Activity section
│   │   ├── GroupThinkingOverview.tsx  # "Themes Being Explored" section
│   │   └── MilestoneCard.tsx    # Milestone celebration card
│   ├── schedule/
│   │   └── SessionNotes.tsx     # Collapsible session notes with auto-save
│   ├── glossary/
│   │   ├── GlossaryList.tsx     # Glossary list with search, add, edit
│   │   └── GlossaryVersionHistory.tsx # Version history for glossary edits
│   ├── resources/
│   │   └── ResourcesList.tsx    # Resources list with filters and add form
│   ├── concepts/
│   │   └── ConceptMap.tsx       # Visual concept map (in-progress)
│   ├── roles/
│   │   └── RoleBadge.tsx        # Weekly role badge component
│   └── ui/
│       ├── TimeAgo.tsx          # Relative time display ("8h ago")
│       ├── MarkdownBody.tsx     # Simple markdown renderer (bold, italic, blockquotes)
│       └── Toast.tsx            # Toast notification component
├── lib/
│   ├── supabase/
│   │   ├── server.ts            # Server-side Supabase clients (createClient, createStaticClient, getSessionUser)
│   │   ├── client.ts            # Browser-side Supabase client
│   │   ├── admin.ts             # Service role client (bypasses RLS — use sparingly)
│   │   └── middleware.ts        # Session refresh middleware
│   ├── confusion-flags.ts       # Confusion flag utilities
│   └── glossary-utils.ts        # Glossary search/matching utilities
├── types/
│   └── database.ts              # TypeScript interfaces for all database tables
└── middleware.ts                 # Next.js middleware entry point
```

**Other root files:**
- `supabase/schema.sql` — Complete database schema with tables, triggers, RLS policies, indexes
- `supabase/migrations/` — Migration files
- `scripts/` — Data import scripts (capital chapter text, footnotes, schedule data)
- `netlify.toml` — Netlify config
- `capital_ch1_*.txt` — Raw chapter text files used for initial data import

---

## 4. Database Schema

**Supabase project ID:** `aufzylsnowiareuionna`

### Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `profiles` | User profiles (auto-created on signup) | `id` (refs auth.users), `display_name`, `role` (admin/member) |
| `invite_codes` | Registration invite codes | `code`, `max_uses`, `use_count`, `active` |
| `reading_schedule` | Weekly reading assignments | `week_number`, `title`, `due_date`, `session_date`, `session_location` |
| `weekly_roles` | Role assignments per week | `week_id`, `user_id`, `role_type` (summarizer/discussion_starter/connector/passage_picker) |
| `discussion_prompts` | Discussion questions per week | `week_id`, `prompt_text`, `sort_order` |
| `threads` | Discussion threads | `title`, `body`, `author_id`, `week_id`, `thread_type` (6 types), `pinned` |
| `replies` | Thread replies (supports nesting via `parent_reply_id`) | `thread_id`, `parent_reply_id`, `body`, `author_id` |
| `glossary_entries` | Shared vocabulary | `term`, `definition`, `related_terms[]`, `first_appearance_week` |
| `resources` | Shared learning resources | `title`, `url`, `resource_type` (6 types), `week_id` |
| `text_documents` | Primary texts (currently just Capital Vol I) | `title`, `slug` |
| `text_chapters` | Chapters/sections within documents | `document_id`, `chapter_number`, `title`, `content`, `sort_order`, `week_id` |
| `text_footnotes` | Marx and Engels footnotes | `chapter_id`, `footnote_number`, `content`, `author` (marx/engels) |
| `annotations` | Text annotations on chapters | `chapter_id`, `author_id`, `body`, `quote_exact`, `position_start`, `position_end` |
| `annotation_replies` | Replies to annotations | `annotation_id`, `author_id`, `body` |

### Critical: Chapter numbering

Marx's *Capital* Chapter 1 has 4 sections. In the database:
- `chapter_number` 1-4 = Chapter 1, Sections 1-4
- `chapter_number` 5-36 = Chapters 2-33 (formula: `marxChapter = chapterNumber - 3`)

The `getChapterLabel()` function in `src/app/(main)/reading/[slug]/[chapter]/page.tsx` handles this mapping. The reading TOC in `src/app/(main)/reading/page.tsx` has a full `PART_MAP` that groups chapters into Marx's 8 Parts.

### Enums

```sql
user_role: 'admin' | 'member'
weekly_role_type: 'summarizer' | 'discussion_starter' | 'connector' | 'passage_picker'
thread_type: 'discussion' | 'reflection' | 'summary' | 'passage_pick' | 'connection' | 'general'
resource_type: 'primary_text' | 'companion' | 'lecture' | 'article' | 'tool' | 'other'
```

### RLS Policies

RLS is enabled on all tables. Key patterns:
- **Read-only public:** `threads`, `replies`, `annotations`, `annotation_replies` — `SELECT` allowed for all (no auth check)
- **Authenticated read:** `profiles`, `reading_schedule`, `glossary_entries`, `resources`, `text_documents`, `text_chapters` — `SELECT` requires `auth.role() = 'authenticated'`
- **User-scoped writes:** Users can only INSERT with their own `auth.uid()`, UPDATE/DELETE their own rows
- **Admin-only writes:** Schedule, prompts, roles, text content — only `is_admin()` can modify
- **Wiki-style:** `glossary_entries` — any authenticated user can UPDATE any entry

### Realtime

Enabled on: `threads`, `replies`, `annotations`, `annotation_replies`

The `ChapterReader` component subscribes to realtime annotation changes.

### Triggers

- `on_auth_user_created` — Auto-creates a `profiles` row when a user signs up
- `update_*_updated_at` — Auto-updates `updated_at` on threads, replies, glossary_entries, annotations, annotation_replies

---

## 5. Design System

### Color tokens (defined in `src/app/globals.css`)

All colors are CSS custom properties. **Never use raw hex values.** Always use `var(--token-name)`.

**Light mode:**
- `--bg-page: #faf9fc` (page background)
- `--bg-card: #ffffff` (cards)
- `--bg-nav: #1a1625` (dark nav bar)
- `--text-primary: #1a1625` (body text)
- `--text-secondary: #5a5368` (muted text)
- `--text-inverse: #faf9fc` (text on dark backgrounds)
- `--accent-red: #a31545` (primary CTA, links — "revolutionary red")
- `--accent-purple: #5c3d8f` (secondary accent — "scholarly purple")
- `--accent-green: #4a6741` (success)

**Dark mode** (activated by `html[data-theme="dark"]`):
- All tokens swap to dark variants (e.g., `--bg-page: #0f0d17`)
- Accents get brighter (e.g., `--accent-red: #e84a7a`)

### Animation system

Defined in `globals.css` with shared timing variables:
- `--ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1)` — primary easing
- `--duration-fast: 150ms`, `--duration-normal: 250ms`, `--duration-slow: 400ms`

Key animation classes:
- `.animate-fade-in` — fade in + translate up (page content)
- `.animate-slide-in-right` / `.animate-slide-out-right` — annotation panel
- `.animate-scale-in` — popovers, modals
- `.stagger-children` — parent class that staggers child fade-ins (50ms intervals)
- `.collapsible-content[data-open]` — CSS grid `0fr → 1fr` technique for smooth collapse
- `.btn-transition` — button hover/active states with `scale(0.97)` on press
- `.skeleton-shimmer` — loading skeleton pulse

### Typography

- **UI text:** `system-ui, -apple-system, sans-serif`
- **Reading text:** `'Lora', Georgia, 'Times New Roman', serif` — loaded from Google Fonts
- **Reading text class:** `.reading-text` sets font-family, 1.125rem size, 1.8 line-height, max-width 68ch
- **Line heights:** `--line-height-relaxed: 1.75`, `--line-height-loose: 2`

### Component patterns

- Inline styles for theme-aware colors: `style={{ color: 'var(--text-primary)' }}`
- Tailwind for layout/spacing: `className="flex items-center gap-3 px-4 py-2"`
- Custom utility classes: `.btn-transition`, `.hover-bg-themed`, `.card-hover`
- Collapsibles use `data-open` attribute, not React state for the CSS animation

---

## 6. Supabase Client Architecture

There are **four** Supabase client patterns. Understanding when to use each is critical:

### `createClient()` — `src/lib/supabase/server.ts`
**Use for:** Server components and server actions that need user context.
**How it works:** Creates a server client with cookie-based auth. Calls `cookies()` from `next/headers`.
**Cannot be used inside** `unstable_cache()` — this causes a build/runtime error.

### `createStaticClient()` — `src/lib/supabase/server.ts`
**Use for:** Data fetching inside `unstable_cache()` wrapped functions.
**How it works:** Creates a plain `@supabase/supabase-js` client with no cookie access. Uses the anon key, so RLS still applies, but there's no user session — queries run as anonymous.
**Created during this session** to fix the chapter page crash.

### `createAdminClient()` — `src/lib/supabase/admin.ts`
**Use for:** Server-only operations that need to bypass RLS (e.g., bulk data imports).
**How it works:** Uses `SUPABASE_SERVICE_ROLE_KEY`. Bypasses all RLS policies.
**Warning:** There's a TODO to audit and reduce usage of this. Currently some server components use it that probably shouldn't.

### `createClient()` — `src/lib/supabase/client.ts`
**Use for:** Client components (browser-side).
**How it works:** Creates a browser client using `createBrowserClient` from `@supabase/ssr`.

### `getSessionUser()` — `src/lib/supabase/server.ts`
**Use for:** Quick "who is logged in?" checks in server components.
**How it works:** Reads JWT from cookie locally — no network call to Supabase auth server. Returns `session.user` or `null`. Used in the main layout to get the display name.
**Important:** This does NOT verify the token with Supabase. For write operations (posting threads, annotations), use `supabase.auth.getUser()` instead.

---

## 7. Auth System

**Current state: Auth enforcement is DISABLED for reviewer access.**

- Registration requires an invite code (checked in `src/app/(auth)/register/actions.ts`)
- Login uses Supabase Auth email/password
- The middleware (`src/lib/supabase/middleware.ts`) has auth redirect logic **commented out** — search for `TODO: RE-ENABLE AUTH`
- The main layout (`src/app/(main)/layout.tsx`) also has a TODO about this
- When re-enabled: unauthenticated users should be redirected to `/login`, authenticated users on `/login` should redirect to `/dashboard`

**User roles:**
- `admin` — Can manage schedule, prompts, roles, text content. Can delete any thread/glossary entry.
- `member` — Can create threads/replies/annotations/glossary entries/resources. Can edit/delete own content.

Marco is currently the only user and has `admin` role.

---

## 8. What's Built and Working

Everything listed below has been browser-tested and confirmed working:

1. **Full reading experience** — Table of contents with 8 Parts, collapsible sections, chapter pages with serif typography, progressive rendering (first 25 paragraphs, then 50 at a time), footnotes with Marx/Engels attribution, annotation highlights, text selection toolbar
2. **Social annotation** — Select text → popover → create annotation with body text + optional confusion flag. Annotations appear as purple highlights in the text. Click highlight to see annotation + replies. Realtime subscription for live updates.
3. **Discussion threads** — 6 thread types with visual card selection, type filter tabs on list page, thread detail with reply section, Edit/Delete for own threads, "Quote from reading" functionality
4. **Dashboard** — Personalized welcome, This Week's Reading with discussion prompts, progress check-in (Done/Partial/Behind), annotation activity by section, themes being explored, recent discussions, Quick Links sidebar, "Annotate Together" CTA linking to current chapter
5. **Schedule** — Weekly cards with Completed/Current badges, session dates/locations, discussion prompts, collapsible Session Notes with auto-save textarea, "View Week N Threads" and "GET A HEAD START" cross-feature prompts
6. **Glossary** — Search with trigram matching, inline add/edit forms, wiki-style (anyone can edit any entry), version history component exists
7. **Resources** — 6 type filters, inline add form with title/URL/description/type/week
8. **Dark mode** — Full CSS custom property system, smooth transitions, localStorage persistence, cross-tab sync, no flash on load (ThemeInitializer runs before hydration)
9. **Responsive design** — Mobile hamburger nav, responsive layouts
10. **Accessibility** — Skip-to-content link, ARIA labels, focus-visible outlines, min 44px touch targets, `prefers-reduced-motion` support
11. **Animation system** — fade-in, slide-in, scale-in, stagger, collapsible grid, button press, skeleton shimmer

---

## 9. What's Broken or Needs Fixing

### Must fix before launch

1. **Re-enable auth middleware** — Uncomment the redirect blocks in `src/lib/supabase/middleware.ts`. Test that login/register flow works end-to-end. Audit uses of `createAdminClient()`.

2. **React hydration mismatch** — Dashboard shows React error #418. Likely caused by `TimeAgo.tsx` rendering different relative timestamps on server vs client. Fix by deferring time calculations to `useEffect` or using `suppressHydrationWarning`.

3. **Reading TOC accessibility** — Chapter links need `aria-label` attributes. The "Read →" CTA is hidden with `opacity-0` and never visible on touch devices. Consider making it always visible on mobile.

4. **"This Week" badge contrast** — In the reading TOC, the badge text color should be `var(--text-inverse)` not `var(--text-primary)`.

### Should fix

5. **Session time timezone** — Dashboard shows session time that may be wrong timezone. Format explicitly with `Pacific/Auckland`.

6. **Confusion flags table** — There's a `confusion-flags.ts` utility and `ConfusionFlagButton.tsx` component, but no `confusion_flags` table in `schema.sql`. This needs to be added to the database or the feature needs updating.

7. **Concepts page** — Route exists at `/concepts` with a `ConceptMap` component but isn't in the navigation. Either finish and add to nav, or remove.

---

## 10. What Needs Building

These features don't exist yet but are part of the vision:

1. **Admin panel** — No admin UI exists. Schedule, prompts, roles, and text content are managed via Supabase dashboard or scripts. Build an admin section for Mars to manage the reading group without touching the database directly.

2. **Notification system** — Not planned for v1, but worth considering for v2 (new replies to your threads, new annotations on passages you annotated).

3. **Reading progress tracking** — The check-in buttons (Done/Partial/Behind) exist but could be expanded to track which chapters a user has actually read.

4. **Export/sharing** — No way to export annotations, session notes, or threads.

5. **Mobile polish** — The site is responsive but hasn't been deeply tested on actual mobile devices.

6. **Search** — No global search across threads, annotations, glossary, or reading text.

7. **User settings** — No profile editing, password change, or notification preferences.

---

## 11. Dev Workflow

### Local development
```bash
cd /Users/marco/CCP    # Mac path
npm run dev             # Starts Next.js dev server
```

### Environment variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://aufzylsnowiareuionna.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

### Deployment
- Push to `main` branch on GitHub
- Netlify auto-deploys from GitHub
- Build command: `next build`
- Deploy typically takes ~30-40 seconds
- Netlify dashboard: https://app.netlify.com/projects/capitalstudygroup

### Database
- Supabase dashboard: https://supabase.com/dashboard/project/aufzylsnowiareuionna
- Schema file: `supabase/schema.sql`
- Migrations: `supabase/migrations/`
- Data scripts: `scripts/` directory (used for initial chapter text import)

---

## 12. Code Quality Notes

**What's good:**
- Consistent use of CSS custom properties for theming
- TypeScript interfaces for all database types in `database.ts`
- Parallel data fetching with `Promise.all()` in server components
- `unstable_cache()` for static content (chapter text) with 24h revalidation
- `getSessionUser()` uses local JWT read (no network call) for fast page loads
- RLS policies are comprehensive and well-structured
- Loading skeletons for all major routes
- Error boundary on chapter route

**What needs attention:**
- Heavy use of inline styles (`style={{ color: 'var(--text-primary)' }}`) instead of utility classes. Consider creating more semantic CSS classes like `.text-primary` (some exist in globals.css but aren't consistently used).
- Some `any` types in server components (e.g., `doc: any`, `chapter: any` in reading page). These should be typed properly using the interfaces in `database.ts`.
- The `ChapterReader.tsx` is a large, complex client component. Consider breaking out the text selection logic, annotation rendering, and footnote handling into separate hooks or sub-components.
- No tests exist. No linting configuration beyond Next.js defaults.
- The `scripts/` directory has various data import scripts that could be cleaned up.

---

## 13. Important Patterns to Follow

1. **Always use CSS custom properties for colors.** Never hardcode hex values. Use `var(--accent-red)`, `var(--text-primary)`, etc.

2. **Use `createStaticClient()` inside `unstable_cache()`.** Never use `createClient()` (which calls `cookies()`) inside cached functions. This was the cause of the chapter page crash.

3. **Use `getSessionUser()` for read-only auth checks** in server components. Use `supabase.auth.getUser()` only for write operations.

4. **Thread types are visual cards**, not a plain dropdown. The 6 types each have an emoji icon and description. See `NewThreadForm.tsx`.

5. **The chapter numbering is non-obvious.** Chapter 1 has 4 sections (chapter_number 1-4), then Chapter 2 starts at chapter_number 5. Always use `getChapterLabel()` or `getChapterMapping()` to display the correct label.

6. **Collapsibles use CSS grid**, not JS height calculation. Set `data-open="true"` on the `.collapsible-content` element. The CSS handles the smooth transition via `grid-template-rows: 0fr → 1fr`.

7. **Annotations use position-based anchoring.** `position_start` and `position_end` are character offsets in the chapter's plain text content. `quote_exact` stores the selected text, with `quote_prefix` and `quote_suffix` for disambiguation.
