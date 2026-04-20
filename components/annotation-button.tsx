'use client'

import { useState, useCallback } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare, X, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createAnnotation, deleteAnnotation } from '@/lib/api/annotations'

// ============================================================
// ANNOTATION BUTTON (P4-06)
// Thumbs up/down on AI responses with optional notes
// ============================================================

export interface AnnotationButtonProps {
  orgId: string
  interactionId: string
  /** Current rating if already annotated */
  currentRating?: 'thumbs_up' | 'thumbs_down' | null
  /** Current notes if already annotated */
  currentNotes?: string
  /** Callback when annotation changes */
  onAnnotationChange?: (rating: 'thumbs_up' | 'thumbs_down' | null, notes?: string) => void
  /** Size variant */
  size?: 'sm' | 'md'
  /** Whether to show the notes feature */
  showNotes?: boolean
  /** Extra CSS classes on the container */
  className?: string
}

export function AnnotationButton({
  orgId,
  interactionId,
  currentRating = null,
  currentNotes = '',
  onAnnotationChange,
  size = 'sm',
  showNotes = true,
  className = '',
}: AnnotationButtonProps) {
  const t = useTranslations('annotations')
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(currentRating)
  const [notes, setNotes] = useState(currentNotes)
  const [showNotesInput, setShowNotesInput] = useState(false)
  const [saving, setSaving] = useState(false)

  const iconSize = size === 'sm' ? 10 : 14
  const btnPadding = size === 'sm' ? 'p-1' : 'p-1.5'

  const handleRate = useCallback(async (newRating: 'thumbs_up' | 'thumbs_down') => {
    if (saving) return
    setSaving(true)

    try {
      if (rating === newRating) {
        // Toggle off -- remove annotation
        await deleteAnnotation(orgId, interactionId)
        setRating(null)
        setNotes('')
        setShowNotesInput(false)
        onAnnotationChange?.(null)
      } else {
        // Set or change rating
        await createAnnotation(orgId, interactionId, newRating, notes || undefined)
        setRating(newRating)
        onAnnotationChange?.(newRating, notes || undefined)
      }
    } catch {
      // Silently fail -- annotation is non-critical
    }

    setSaving(false)
  }, [orgId, interactionId, rating, notes, saving, onAnnotationChange])

  const handleSaveNotes = useCallback(async () => {
    if (!rating || saving) return
    setSaving(true)

    try {
      await createAnnotation(orgId, interactionId, rating, notes || undefined)
      onAnnotationChange?.(rating, notes || undefined)
      setShowNotesInput(false)
    } catch {
      // Silently fail
    }

    setSaving(false)
  }, [orgId, interactionId, rating, notes, saving, onAnnotationChange])

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center gap-0.5">
        {/* Thumbs Up */}
        <button
          onClick={() => handleRate('thumbs_up')}
          disabled={saving}
          className={`${btnPadding} rounded-md transition-all ${
            rating === 'thumbs_up'
              ? 'bg-status-success/15 text-status-success'
              : 'text-text-muted hover:text-status-success hover:bg-status-success/10'
          } disabled:opacity-40`}
          title={t('goodResponse')}
          aria-label={t('goodResponse')}
        >
          {saving && rating !== 'thumbs_up' ? null : (
            <ThumbsUp size={iconSize} className={rating === 'thumbs_up' ? 'fill-current' : ''} />
          )}
        </button>

        {/* Thumbs Down */}
        <button
          onClick={() => handleRate('thumbs_down')}
          disabled={saving}
          className={`${btnPadding} rounded-md transition-all ${
            rating === 'thumbs_down'
              ? 'bg-status-danger/15 text-status-danger'
              : 'text-text-muted hover:text-status-danger hover:bg-status-danger/10'
          } disabled:opacity-40`}
          title={t('badResponse')}
          aria-label={t('badResponse')}
        >
          {saving && rating !== 'thumbs_down' ? null : (
            <ThumbsDown size={iconSize} className={rating === 'thumbs_down' ? 'fill-current' : ''} />
          )}
        </button>

        {/* Notes toggle -- only when rated and showNotes enabled */}
        {showNotes && rating && (
          <button
            onClick={() => setShowNotesInput(!showNotesInput)}
            className={`${btnPadding} rounded-md transition-all ${
              showNotesInput || notes
                ? 'bg-brand-purple/10 text-brand-purple'
                : 'text-text-muted hover:text-brand-purple hover:bg-brand-purple/10'
            }`}
            title={t('addNotes')}
            aria-label={t('addNotes')}
          >
            <MessageSquare size={iconSize} />
          </button>
        )}

        {/* Loading indicator */}
        {saving && (
          <Loader2 size={iconSize} className="text-text-dim animate-spin ml-0.5" />
        )}
      </div>

      {/* Expandable notes textarea */}
      {showNotesInput && (
        <div className="mt-2 animate-fade-in">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={2}
            className="w-full min-w-[200px] bg-surface-3 border border-border rounded-md px-2.5 py-1.5 text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40 resize-none transition-colors"
          />
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <button
              onClick={() => { setShowNotesInput(false) }}
              className="px-2 py-1 rounded-md text-[12px] font-body font-semibold text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={10} className="inline mr-0.5" />
              {t('cancel')}
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="px-2.5 py-1 rounded-md text-[12px] font-body font-semibold bg-brand-purple/10 text-brand-purple hover:bg-brand-purple/20 border border-brand-purple/20 transition-colors disabled:opacity-50"
            >
              {t('saveNotes')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
