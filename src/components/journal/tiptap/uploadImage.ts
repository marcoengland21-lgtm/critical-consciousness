/**
 * Image upload to the private_note_images Supabase Storage bucket.
 * Per chunk 2.5 §4 + the storage RLS in private-note-images-storage.sql.
 *
 * Object naming convention: <user_id>/<note_id>/<timestamp>-<filename>
 * The first path segment encodes ownership so the storage RLS policies
 * can match the authenticated user against the path.
 *
 * Returns a SIGNED URL for the uploaded image (the bucket is private —
 * not public — so we can't just return the public URL). Signed URLs are
 * valid for 24 hours; the journal entry stores the signed URL in its
 * Tiptap JSON. When the URL expires, the editor will fail to load the
 * image — at that point the user can re-open the entry to trigger a
 * re-fetch which can refresh the signed URL.
 *
 * Trade-off note: storing signed URLs in body_json means images break
 * after expiry. The alternative is storing the storage path and resolving
 * on render, which is more reliable but requires a custom Tiptap image
 * extension. v1 takes the simpler signed-URL approach; if expiry becomes
 * a real issue we'll move to path-based storage.
 */

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'private_note_images'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 // 24h

export async function uploadJournalImage(params: {
  file: File
  userId: string
  noteId: string | null
}): Promise<string> {
  const { file, userId, noteId } = params

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be smaller than 5MB.')
  }

  const supabase = createClient()
  const ts = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80)
  // Store under <user_id>/<note_id|'unsaved'>/<timestamp>-<safeName>.
  // 'unsaved' bucket-folder is for entries that haven't yet been persisted
  // (the editor uploads happen before the first autosave creates a row id).
  const path = `${userId}/${noteId || 'unsaved'}/${ts}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (signedError || !signedData?.signedUrl) {
    throw new Error(`Couldn't sign uploaded image URL: ${signedError?.message || 'unknown'}`)
  }

  return signedData.signedUrl
}
