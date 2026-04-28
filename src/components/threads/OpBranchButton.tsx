'use client'

import { useState } from 'react'
import BranchThreadForm from './BranchThreadForm'

interface OpBranchButtonProps {
  parentThreadId: string
  parentThreadTitle: string
  parentAuthor: string
  parentBody: string
  /** Active group context (L1) — passed through to BranchThreadForm. */
  groupId: string
}

/**
 * Branch button + inline form for the thread OP. Per IMPROVEMENTS_PLAN §4.3.
 * Mounted on the thread detail page so users can branch directly from the
 * top-level post (not just from a specific reply). When clicked, opens a
 * BranchThreadForm with parentReplyId = null.
 */
export default function OpBranchButton({
  parentThreadId,
  parentThreadTitle,
  parentAuthor,
  parentBody,
  groupId,
}: OpBranchButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-medium px-3 py-1.5 rounded border transition-colors"
        style={{
          borderColor: 'var(--border-default)',
          color: 'var(--text-secondary)',
        }}
        title="Spawn a new thread from this post, with a recorded link back to here"
      >
        🌱 Branch
      </button>
      {open && (
        <BranchThreadForm
          parentThreadId={parentThreadId}
          parentThreadTitle={parentThreadTitle}
          parentReplyId={null}
          parentExcerpt={{ author: parentAuthor, body: parentBody }}
          onCancel={() => setOpen(false)}
          groupId={groupId}
        />
      )}
    </div>
  )
}
