// Enums
export type UserRole = 'admin' | 'member';

export type WeeklyRoleType = 'summarizer' | 'discussion_starter' | 'connector' | 'passage_picker';

export type ThreadType = 'discussion' | 'reflection' | 'summary' | 'passage_pick' | 'connection' | 'general';

export type ResourceType = 'primary_text' | 'companion' | 'lecture' | 'article' | 'tool' | 'other';

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
  first_appearance_week: string | null; // UUID FK to reading_schedule.id
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
  week_id: string | null;
  created_by: string;
  created_at: string;
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

export interface ConfusionCount {
  id: string;
  chapter_id: string;
  paragraph_index: number;
  count: number;
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
