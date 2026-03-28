'use client'

import { Flame, Sun, Snowflake, Skull } from 'lucide-react'
import type { LeadClassification } from '@/types'

// ============================================================
// LEAD SCORE BADGE (P4-02)
// Compact badge showing score + classification with icon & color
// ============================================================

interface LeadScoreBadgeProps {
  score: number
  classification: LeadClassification
  /** Show numeric score next to badge */
  showScore?: boolean
  /** Compact mode — icon only */
  compact?: boolean
  className?: string
}

const CLASSIFICATION_CONFIG: Record<LeadClassification, {
  icon: typeof Flame
  label: string
  color: string
  bg: string
  border: string
}> = {
  HOT: {
    icon: Flame,
    label: 'HOT',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
  },
  WARM: {
    icon: Sun,
    label: 'WARM',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
  },
  COLD: {
    icon: Snowflake,
    label: 'COLD',
    color: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/25',
  },
  DEAD: {
    icon: Skull,
    label: 'DEAD',
    color: 'text-text-dim',
    bg: 'bg-surface-3',
    border: 'border-border',
  },
}

/** Derive classification from a numeric score */
export function classifyScore(score: number): LeadClassification {
  if (score >= 75) return 'HOT'
  if (score >= 50) return 'WARM'
  if (score >= 25) return 'COLD'
  return 'DEAD'
}

export function LeadScoreBadge({
  score,
  classification,
  showScore = true,
  compact = false,
  className = '',
}: LeadScoreBadgeProps) {
  const cfg = CLASSIFICATION_CONFIG[classification]
  const Icon = cfg.icon

  if (compact) {
    return (
      <div
        className={`w-7 h-7 rounded-md ${cfg.bg} border ${cfg.border} flex items-center justify-center ${className}`}
        title={`${cfg.label} — Score: ${score}`}
      >
        <Icon size={14} className={cfg.color} />
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border} ${className}`}
    >
      <Icon size={10} className={cfg.color} />
      {showScore && (
        <span className={`text-[10px] font-bold font-mono ${cfg.color}`}>{score}</span>
      )}
      <span className={`text-[10px] font-mono font-semibold ${cfg.color}`}>{cfg.label}</span>
    </div>
  )
}

export { CLASSIFICATION_CONFIG }
