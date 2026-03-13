'use client'

import { useState, useCallback } from 'react'
import { toggleConfusionFlag } from '@/lib/confusion-flags'

interface Props {
  chapterId: string
  paragraphIndex: number
  initialCount: number
  isUserFlagged: boolean
  hidden?: boolean
}

export default function ConfusionFlagButton({
  chapterId,
  paragraphIndex,
  initialCount,
  isUserFlagged,
  hidden,
}: Props) {
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isSet, setIsSet] = useState(isUserFlagged)

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      const result = await toggleConfusionFlag(chapterId, paragraphIndex)
      setCount(result.count)
      setIsSet(result.isSet)
    } catch (error) {
      console.error('Failed to toggle confusion flag:', error)
    } finally {
      setIsLoading(false)
    }
  }, [chapterId, paragraphIndex])

  if (hidden) return null

  // Calculate color intensity based on count
  // Low count: pale gold, High count: warm red
  let bgColor = 'var(--color-warm-cream)'
  let textColor = 'var(--color-warm-gray)'

  if (count > 0) {
    if (count <= 2) {
      bgColor = '#d4c9a8' // pale gold
    } else if (count <= 5) {
      bgColor = '#c9a86b' // warm gold
    } else {
      bgColor = '#b8863f' // deep warm gold
    }
    textColor = 'var(--color-dark-brown)'
  }

  // In dark mode, adjust colors
  const isDark = typeof document !== 'undefined' &&
                 document.documentElement.getAttribute('data-theme') === 'dark'
  if (isDark && count > 0) {
    if (count <= 2) {
      bgColor = '#5a4f3f'
    } else if (count <= 5) {
      bgColor = '#6b5a45'
    } else {
      bgColor = '#7a6850'
    }
    textColor = '#e8ddd0'
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all opacity-40 group-hover/para:opacity-100 hover:opacity-100 disabled:opacity-50"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      title={`${count} ${count === 1 ? 'person is' : 'people are'} confused here`}
      aria-label={`Toggle confusion flag for paragraph ${paragraphIndex}. ${count} ${count === 1 ? 'person is' : 'people are'} confused here.`}
    >
      {count > 0 ? '?' : '?'}
    </button>
  )
}
