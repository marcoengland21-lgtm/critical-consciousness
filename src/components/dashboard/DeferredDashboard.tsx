'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ThreadTypeBadge from '@/components/threads/ThreadTypeBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import WeeklyActivitySummary from '@/components/dashboard/WeeklyActivitySummary'
import MilestoneCard from '@/components/dashboard/MilestoneCard'
import GroupThinkingOverview from '@/components/dashboard/GroupThinkingOverview'
import type { ThreadType } from '@/types/database'

interface DeferredData {
  recentThreads: any[]
  recentAnnotations: any[]
  milestoneData: any[]
  weekAnnotationCount: number
  weekThreadCount: number
  weekGlossaryCount: number
}

interface DeferredDashboardProps {
  weekNumber: number | null
  showActivity: boolean
}

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded animate-pulse ${className || ''}`} style={{ backgroundColor: 'var(--bg-card-alt)', ...style }} />
}

function DeferredSkeleton() {
  return (
    <div className="space-y-6">
      {/* Activity skeleton */}
      <div className="rounded-lg border p-5" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card-alt)' }}>
        <SkeletonBlock className="h-4 w-36 mb-2" style={{ backgroundColor: 'var(--bg-card)' }} />
        <SkeletonBlock className="h-4 w-full" style={{ backgroundColor: 'var(--bg-card)' }} />
      </div>

      {/* Group Thinking skeleton */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
          <SkeletonBlock className="h-5 w-48" />
        </div>
        <div className="p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)' }}>
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>

      {/* Recent Threads skeleton */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
          <SkeletonBlock className="h-5 w-40" />
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <SkeletonBlock className="h-3 w-16 mb-2" />
              <SkeletonBlock className="h-4 w-48 mb-1" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DeferredDashboard({ weekNumber, showActivity }: DeferredDashboardProps) {
  const [data, setData] = useState<DeferredData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(setData)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return null // Fail silently — the critical content is already visible
  }

  if (!data) {
    return <DeferredSkeleton />
  }

  const { recentThreads, recentAnnotations, milestoneData, weekAnnotationCount, weekThreadCount, weekGlossaryCount } = data

  // Find milestone for current week
  const milestone = weekNumber
    ? milestoneData.find((m: any) => m.week_number === weekNumber) || null
    : null

  // Build annotation data for GroupThinkingOverview
  const annotations = recentAnnotations.map((ann: any) => ({
    chapter_number: ann.chapter?.chapter_number || 0,
    chapter_title: ann.chapter?.title || 'Unknown',
    annotation_count: 1,
    body: ann.body,
  }))

  const threads = weekThreadCount ? [{ week_number: 1, thread_count: weekThreadCount }] : []

  return (
    <div className="space-y-6">
      {/* Milestone Card */}
      {milestone && <MilestoneCard milestone={milestone} />}

      {/* Weekly Activity */}
      {showActivity && (
        <WeeklyActivitySummary
          annotationCount={weekAnnotationCount}
          threadCount={weekThreadCount}
          glossaryCount={weekGlossaryCount}
        />
      )}

      {/* Group Thinking */}
      <GroupThinkingOverview annotations={annotations} threads={threads} />

      {/* Recent Threads */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
            Recent Discussions
          </h2>
          <Link href="/threads" className="text-xs font-medium" style={{ color: 'var(--accent-red)' }}>
            All Threads →
          </Link>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)' }}>
          {recentThreads.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {recentThreads.map((thread: any) => {
                const replyCount = thread.replies?.[0]?.count ?? 0
                return (
                  <Link
                    key={thread.id}
                    href={`/threads/${thread.id}`}
                    className="block px-5 py-3 transition-colors hover-bg-themed"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <ThreadTypeBadge type={thread.thread_type as ThreadType} />
                      {thread.pinned && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-inverse)' }}>Pinned</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {thread.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{thread.author?.display_name}</span>
                      <span>&middot;</span>
                      <TimeAgo date={thread.created_at} />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                The conversation starts here
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                What&apos;s on your mind after this week&apos;s reading?
              </p>
              <Link
                href="/threads/new"
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--accent-red)', color: 'var(--text-inverse)' }}
              >
                Share with the Group
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
