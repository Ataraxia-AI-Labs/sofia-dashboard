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
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  NEUTRAL: {
    label: 'Neutral',
    short: '~',
    color: 'text-text-muted',
    dot: 'bg-text-muted',
    bg: 'bg-surface-3',
    border: 'border-border',
  },
  FRUSTRATED: {
    label: 'Frustrado',
    short: '!',
    color: 'text-red-400',
    dot: 'bg-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
  },
  CONFUSED: {
    label: 'Confundido',
    short: '?',
    color: 'text-orange-400',
    dot: 'bg-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
  },
  ENTHUSIASTIC: {
    label: 'Entusiasta',
    short: '++',
    color: 'text-purple-400',
    dot: 'bg-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
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
        <span className={`text-[9px] font-mono font-bold ${cfg.color}`}>{cfg.short}</span>
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export { SENTIMENT_CONFIG }
