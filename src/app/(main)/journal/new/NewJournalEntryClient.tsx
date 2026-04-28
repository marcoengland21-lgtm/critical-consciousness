'use client'

import JournalEditor from '@/components/journal/JournalEditor'

/**
 * Client wrapper for /journal/new — owns the URL-replace dance so that
 * once autosave creates a row, a refresh hits /journal/[id] instead of
 * creating a duplicate empty entry.
 */
export default function NewJournalEntryClient({
  userId,
  groupId,
  chapterId,
}: {
  userId: string
  groupId: string
  chapterId: string | null
}) {
  return (
    <JournalEditor
      initialId={null}
      initialTitle=""
      initialBodyJson={{ type: 'doc', content: [] }}
      initialChapterId={chapterId}
      userId={userId}
      groupId={groupId}
      showTitle
      bodyPlaceholder="Start writing…"
      minHeight={500}
      onCreatedRedirect={(id) => {
        // Replace URL with the entry id so a refresh doesn't make a new row.
        window.history.replaceState(null, '', `/journal/${id}`)
      }}
    />
  )
}
