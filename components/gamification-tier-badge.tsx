'use client'

import type { GamificationTier } from '@/types'

// ============================================================
// GAMIFICATION TIER BADGE (P5-06)
// Premium badge with gradient, progress bar to next tier
// ============================================================

interface GamificationTierBadgeProps {
  tier: GamificationTier
  totalPoints?: number
  pointsToNext?: number
  nextTier?: GamificationTier | null
  compact?: boolean
  className?: string
}

const TIER_CONFIG: Record<GamificationTier, {
  emoji: string
  label: string
  gradient: string
  textColor: string
  bg: string
  border: string
  glowColor: string
  progressColor: string
}> = {
  BRONZE: {
    emoji: '\uD83E\uDD49',
    label: 'Bronze',
    gradient: 'from-brand-gold via-status-warning to-brand-gold',
    textColor: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    border: 'border-brand-gold/30',
    glowColor: 'shadow-brand-gold/15',
    progressColor: 'from-brand-gold to-status-warning',
  },
  SILVER: {
    emoji: '\uD83E\uDD48',
    label: 'Silver',
    gradient: 'from-text-muted via-text-dim to-text-muted',
    textColor: 'text-text-dim',
    bg: 'bg-text-muted/10',
    border: 'border-text-muted/30',
    glowColor: 'shadow-text-muted/15',
    progressColor: 'from-text-muted to-text-dim',
  },
  GOLD: {
    emoji: '\uD83C\uDFC6',
    label: 'Gold',
    gradient: 'from-status-warning via-brand-gold to-status-warning',
    textColor: 'text-status-warning',
    bg: 'bg-status-warning/10',
    border: 'border-status-warning/30',
    glowColor: 'shadow-status-warning/15',
    progressColor: 'from-status-warning to-brand-gold',
  },
  PLATINUM: {
    emoji: '\uD83D\uDC8E',
    label: 'Platinum',
    gradient: 'from-brand-purple via-brand-purple to-brand-purple',
    textColor: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/30',
    glowColor: 'shadow-brand-purple/20',
    progressColor: 'from-brand-purple to-brand-purple',
  },
}

// Threshold points for each tier (used for progress calculation)
const TIER_THRESHOLDS: Record<GamificationTier, number> = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 1500,
  PLATINUM: 5000,
}

export function GamificationTierBadge({
  tier,
  totalPoints,
  pointsToNext,
  nextTier,
  compact = false,
  className = '',
}: GamificationTierBadgeProps) {
  const cfg = TIER_CONFIG[tier]

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border} ${className}`}
        title={`${cfg.label}${totalPoints != null ? ` - ${totalPoints.toLocaleString()} pts` : ''}`}
      >
        <span className="text-xs">{cfg.emoji}</span>
        <span className={`text-[10px] font-mono font-bold ${cfg.textColor}`}>{cfg.label}</span>
      </div>
    )
  }

  // Calculate progress to next tier
  let progressPct = 100
  if (nextTier && pointsToNext != null && totalPoints != null) {
    const currentThreshold = TIER_THRESHOLDS[tier]
    const nextThreshold = TIER_THRESHOLDS[nextTier]
    const rangeTotal = nextThreshold - currentThreshold
    const rangeCurrent = totalPoints - currentThreshold
    progressPct = rangeTotal > 0 ? Math.min(100, Math.max(0, (rangeCurrent / rangeTotal) * 100)) : 100
  }

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      {/* Tier icon with glow */}
      <div className={`w-12 h-12 rounded-md ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
        <span className="text-xl">{cfg.emoji}</span>
      </div>

      {/* Tier name */}
      <span className={`text-[10px] font-mono font-bold ${cfg.textColor}`}>{cfg.label}</span>

      {/* Total points */}
      {totalPoints != null && (
        <span className={`text-[10px] font-mono font-semibold ${cfg.textColor}`}>
          {totalPoints.toLocaleString()} pts
        </span>
      )}

      {/* Progress bar to next tier */}
      {nextTier && pointsToNext != null && pointsToNext > 0 && (
        <div className="w-full max-w-[120px]">
          <div className="h-1.5 bg-void rounded overflow-hidden">
            <div
              className={`h-full rounded ${cfg.textColor.replace('text-', 'bg-')} transition-all duration-700`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className={`text-[9px] font-mono mt-0.5 text-center ${cfg.textColor} opacity-70`}>
            {pointsToNext.toLocaleString()} pts to {TIER_CONFIG[nextTier].label}
          </p>
        </div>
      )}
    </div>
  )
}

/** Inline row badge for tables/lists */
export function GamificationTierInline({
  tier,
  totalPoints,
  className = '',
}: {
  tier: GamificationTier
  totalPoints?: number
  className?: string
}) {
  const cfg = TIER_CONFIG[tier]

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border}`}>
        <span className="text-xs">{cfg.emoji}</span>
        <span className={`text-[10px] font-mono font-bold ${cfg.textColor}`}>{cfg.label}</span>
      </div>
      {totalPoints != null && (
        <span className={`text-[10px] font-mono font-semibold ${cfg.textColor}`}>
          {totalPoints.toLocaleString()}
        </span>
      )}
    </div>
  )
}

export { TIER_CONFIG, TIER_THRESHOLDS }
