'use client'

import type { SentimentType } from '@/types'

// ============================================================
// SENTIMENT BADGE (P5-10)
// Typographic sentiment indicator — no emojis, Sentient Interface
// ============================================================

interface SentimentBadgeProps {
  sentiment: SentimentType
  /** Compact mode — dot + abbreviation only */
  compact?: boolean
  className?: string
}

const SENTIMENT_CONFIG: Record<SentimentType, {
  label: string
  short: string
  color: string
  dot: string
  bg: string
  border: string
}> = {
  POSITIVE: {
    label: 'Positivo',
    short: '+',
    color: 'text-status-success',
    dot: 'bg-status-success',
    bg: 'bg-status-success/10',
    border: 'border-status-success/25',
  },
  NEUTRAL: {
    label: 'Neutral',
    short: '~',
    color: 'text-brand-cyan',
    dot: 'bg-brand-cyan',
    bg: 'bg-brand-cyan/10',
    border: 'border-brand-cyan/25',
  },
  FRUSTRATED: {
    label: 'Frustrado',
    short: '!',
    color: 'text-status-danger',
    dot: 'bg-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/25',
  },
  CONFUSED: {
    label: 'Confundido',
    short: '?',
    color: 'text-status-warning',
    dot: 'bg-status-warning',
    bg: 'bg-status-warning/10',
    border: 'border-status-warning/25',
  },
  ENTHUSIASTIC: {
    label: 'Entusiasta',
    short: '++',
    color: 'text-brand-purple',
    dot: 'bg-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/25',
  },
}

export function SentimentBadge({ sentiment, compact = false, className = '' }: SentimentBadgeProps) {
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${className}`}
        title={cfg.label}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className={`text-[11px] font-body font-bold ${cfg.color}`}>{cfg.short}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[12px] font-body font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export { SENTIMENT_CONFIG }
