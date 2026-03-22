'use client'

import type { SentimentType } from '@/types'

// ============================================================
// SENTIMENT BADGE (P5-10)
// Emoji + color badge for voice call sentiments
// ============================================================

interface SentimentBadgeProps {
  sentiment: SentimentType
  /** Compact mode — emoji only */
  compact?: boolean
  className?: string
}

const SENTIMENT_CONFIG: Record<SentimentType, {
  emoji: string
  label: string
  color: string
  bg: string
  border: string
}> = {
  POSITIVE: {
    emoji: '\u{1F60A}',
    label: 'Positivo',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  NEUTRAL: {
    emoji: '\u{1F610}',
    label: 'Neutral',
    color: 'text-text-muted',
    bg: 'bg-surface-3',
    border: 'border-border',
  },
  FRUSTRATED: {
    emoji: '\u{1F624}',
    label: 'Frustrado',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
  },
  CONFUSED: {
    emoji: '\u{1F615}',
    label: 'Confundido',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
  },
  ENTHUSIASTIC: {
    emoji: '\u{1F929}',
    label: 'Entusiasta',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
  },
}

export function SentimentBadge({ sentiment, compact = false, className = '' }: SentimentBadgeProps) {
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.NEUTRAL

  if (compact) {
    return (
      <span
        className={`text-sm ${className}`}
        title={cfg.label}
        role="img"
        aria-label={cfg.label}
      >
        {cfg.emoji}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
    >
      <span role="img" aria-label={cfg.label}>{cfg.emoji}</span>
      {cfg.label}
    </span>
  )
}

export { SENTIMENT_CONFIG }
