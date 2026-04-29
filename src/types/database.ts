// Enums
export type UserRole = 'admin' | 'member';

export type WeeklyRoleType = 'summarizer' | 'discussion_starter' | 'connector' | 'passage_picker';

export type ThreadType = 'discussion' | 'reflection' | 'summary' | 'passage_pick' | 'connection' | 'general';

export type ResourceType = 'primary_text' | 'companion' | 'lecture' | 'article' | 'tool' | 'other';

/**
 * Resource grouping by purpose, not file type. Per IMPROVEMENTS_PLAN §7.1.
 * Nullable — when null, the UI falls back to type-based grouping.
 */
export type ResourceUseCategory =
  | 'start_here'
  | 'for_going_deeper'
  | 'when_stuck'
  | 'for_today'
  | 'tools_references';

/**
 * Concept edge type — directional relationship between glossary terms.
 * Per IMPROVEMENTS_PLAN §11.2. v1 only uses 'builds_on'; the other types are
 * forward-looking (the schema accommodates them so the data model isn't
 * churned later).
 */
export type ConceptEdgeType =
  | 'builds_on'
  | 'leads_to'
  | 'contrasts'
  | 'appears_with';

// Database Row Types (matching Supabase conventions with snake_case)

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  created_by: string;
  max_uses: number | null;
  use_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface ReadingSchedule {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  chapter_ref: string | null;
  page_start: number | null;
  page_end: number | null;
  due_date: string;
  session_date: string | null;
  session_location: string | null;
  zoom_link: string | null;
  created_by: string;
  created_at: string;
}

export interface WeeklyRole {
  id: string;
  week_id: string;
  user_id: string;
  role_type: WeeklyRoleType;
  created_at: string;
}

export interface DiscussionPrompt {
  id: string;
  week_id: string;
  prompt_text: string;
  created_by: string;
  created_at: string;
  sort_order: number;
}

export interface Thread {
  id: string;
  title: string;
  body: string;
  author_id: string;
  week_id: string | null;
  thread_type: ThreadType;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reply {
  id: string;
  thread_id: string;
  parent_reply_id: string | null;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  /** Legacy / future bounded mode. NULL for entries created in
   *  recurring v1 — those use first_appearance_chapter instead. */
  first_appearance_week: string | null; // UUID FK to reading_schedule.id
  /** 009 (recurring v1): chapter the term was first introduced in.
   *  Populated for entries created via the recurring-v1 GlossaryList
   *  form; NULL for legacy entries. */
  first_appearance_chapter: string | null; // UUID FK to text_chapters.id
  related_terms: string[] | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  resource_type: ResourceType;
  /** Optional purpose-driven grouping per §7.1. Falls back to resource_type when null. */
  use_category: ResourceUseCategory | null;
  week_id: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Thread branch — links a child thread back to the parent thread (and
 * optionally a specific parent reply). Per IMPROVEMENTS_PLAN §4.2.
 * A thread is branched from at most one parent (UNIQUE on child_thread_id).
 */
export interface ThreadBranch {
  id: string;
  parent_thread_id: string;
  parent_reply_id: string | null;
  child_thread_id: string;
  branched_by: string;
  branched_at: string;
}

/**
 * Concept edge — directed connection between two glossary terms.
 * Per IMPROVEMENTS_PLAN §11.2.
 */
export interface ConceptEdge {
  id: string;
  from_term_id: string;
  to_term_id: string;
  edge_type: ConceptEdgeType;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TextDocument {
  id: string;
  title: string;
  slug: string;
  created_at: string;
}

export interface TextChapter {
  id: string;
  document_id: string;
  chapter_number: number;
  title: string;
  content: string;
  sort_order: number;
  week_id: string | null;
  created_at: string;
}

export interface TextFootnote {
  id: string;
  chapter_id: string;
  footnote_number: number;
  content: string;
  author: 'marx' | 'engels';
  created_at: string;
}

export interface Annotation {
  id: string;
  chapter_id: string;
  author_id: string;
  body: string;
  quote_exact: string;
  position_start: number;
  position_end: number;
  quote_prefix: string | null;
  quote_suffix: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationReply {
  id: string;
  annotation_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface GlossaryComment {
  id: string;
  entry_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface GlossaryVersion {
  id: string;
  entry_id: string;
  definition: string;
  updated_by: string;
  created_at: string;
}

export interface ConfusionCount {
  id: string;
  chapter_id: string;
  paragraph_index: number;
  count: number;
}

/**
 * Private journal entry. Per-user RLS guarantees only the author sees these.
 *
 * body_json is the canonical Tiptap document (per chunk 2.5 schema migration).
 * body_text is the plain-text extraction used for full-text search and
 * list-view previews.
 *
 * chapter_id is reserved for chunk 3 (per-chapter notes); UI doesn't expose it yet.
 */
export interface PrivateNote {
  id: string;
  user_id: string;
  chapter_id: string | null;
  title: string | null;
  body_json: object;
  body_text: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

// Extended Types with Joined Data

export interface ThreadWithAuthor extends Thread {
  author: Profile;
}

export interface ReplyWithAuthor extends Reply {
  author: Profile;
}

export interface AnnotationWithAuthor extends Annotation {
  author: Profile;
}

export interface WeeklyRoleWithUser extends WeeklyRole {
  user: Profile;
}

export interface ReadingScheduleWithRoles extends ReadingSchedule {
  roles: WeeklyRoleWithUser[];
  prompts: DiscussionPrompt[];
}
