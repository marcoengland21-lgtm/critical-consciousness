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

  // Intensity class — colors defined in CSS for dark mode support
  let intensityClass = 'confusion-none'
  if (count > 0 && count <= 2) intensityClass = 'confusion-low'
  else if (count > 2 && count <= 5) intensityClass = 'confusion-mid'
  else if (count > 5) intensityClass = 'confusion-high'

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all opacity-40 group-hover/para:opacity-100 hover:opacity-100 disabled:opacity-50 ${intensityClass}`}
      title={`${count} ${count === 1 ? 'person is' : 'people are'} confused here`}
      aria-label={`Toggle confusion flag for paragraph ${paragraphIndex}. ${count} ${count === 1 ? 'person is' : 'people are'} confused here.`}
    >
      ?
    </button>
  )
}
