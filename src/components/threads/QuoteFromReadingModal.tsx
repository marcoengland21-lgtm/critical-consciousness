'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Chapter {
  id: string
  chapter_number: number
  title: string
  content: string
  document_title?: string
  document_slug?: string
}

interface QuoteFromReadingModalProps {
  onQuoteSelected: (quote: string) => void
  onClose: () => void
}

export default function QuoteFromReadingModal({ onQuoteSelected, onClose }: QuoteFromReadingModalProps) {
  const [step, setStep] = useState<'chapters' | 'select'>('chapters')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChapters()
  }, [])

  async function fetchChapters() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch all chapters with their document info
      const { data, error } = await supabase
        .from('text_chapters')
        .select('id, chapter_number, title, content, document_id')
        .order('chapter_number', { ascending: true })

      if (error) throw error

      if (data) {
        // Fetch document titles
        const docIds = [...new Set(data.map((c: any) => c.document_id))]
        const { data: docs } = await supabase
          .from('text_documents')
          .select('id, title, slug')
          .in('id', docIds)

        const docMap = new Map(docs?.map((d: any) => [d.id, { title: d.title, slug: d.slug }]) || [])

        const chaptersWithDocs = data.map((ch: any) => ({
          id: ch.id,
          chapter_number: ch.chapter_number,
          title: ch.title,
          content: ch.content,
          document_title: docMap.get(ch.document_id)?.title || 'Unknown',
          document_slug: docMap.get(ch.document_id)?.slug || '',
        }))

        setChapters(chaptersWithDocs)
      }
    } catch (err) {
      console.error('Error fetching chapters:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleTextSelection() {
    const selection = window.getSelection()
    if (selection && contentRef.current?.contains(selection.anchorNode as Node)) {
      const text = selection.toString().trim()
      if (text) {
        setSelectedText(text)
      }
    }
  }

  function handleConfirmQuote() {
    if (!selectedText || !selectedChapter) return

    const quote = `> "${selectedText}" — *§${selectedChapter.chapter_number}, ${selectedChapter.document_title}*`
    onQuoteSelected(quote)
    onClose()
  }

  // Close on backdrop click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-2xl max-h-[80vh] z-50 rounded-lg shadow-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
        >
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {step === 'chapters' ? 'Select a Chapter' : 'Select Text'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover-bg-themed transition-colors text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'chapters' ? (
            <div className="space-y-3">
              {loading ? (
                <p style={{ color: 'var(--text-secondary)' }} className="text-center py-8">
                  Loading chapters...
                </p>
              ) : chapters.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }} className="text-center py-8">
                  No chapters found
                </p>
              ) : (
                chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChapter(ch)
                      setSelectedText('')
                      setStep('select')
                    }}
                    className="w-full text-left p-4 rounded-lg border transition-all hover:shadow-md"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div className="text-sm font-medium mb-1">§{ch.chapter_number}: {ch.title}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {ch.document_title}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : selectedChapter ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Selected chapter
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  §{selectedChapter.chapter_number}: {selectedChapter.title}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Highlight text to select a quote
                </p>
                <div
                  ref={contentRef}
                  onMouseUp={handleTextSelection}
                  className="p-4 rounded-lg border leading-relaxed select-text"
                  style={{
                    borderColor: 'var(--border-default)',
                    backgroundColor: 'var(--bg-card-alt)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    lineHeight: '1.8',
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                >
                  {selectedChapter.content}
                </div>
              </div>

              {selectedText && (
                <div
                  className="p-3 rounded-lg border-l-3"
                  style={{
                    backgroundColor: 'rgba(107, 76, 154, 0.08)',
                    borderLeft: '3px solid var(--accent-purple)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Selected
                  </p>
                  <p className="text-sm italic">&ldquo;{selectedText}&rdquo;</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between gap-3 flex-shrink-0"
          style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-card)' }}
        >
          <button
            onClick={() => {
              if (step === 'select') {
                setStep('chapters')
                setSelectedChapter(null)
                setSelectedText('')
              } else {
                onClose()
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            {step === 'select' ? 'Back' : 'Cancel'}
          </button>

          {step === 'select' && (
            <button
              onClick={handleConfirmQuote}
              disabled={!selectedText}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-red)',
                color: 'var(--text-inverse)',
              }}
            >
              Insert Quote
            </button>
          )}
        </div>
      </div>
    </>
  )
}
