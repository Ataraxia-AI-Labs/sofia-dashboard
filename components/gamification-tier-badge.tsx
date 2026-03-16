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
    gradient: 'from-orange-700 via-amber-600 to-orange-800',
    textColor: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glowColor: 'shadow-orange-500/15',
    progressColor: 'from-orange-700 to-amber-600',
  },
  SILVER: {
    emoji: '\uD83E\uDD48',
    label: 'Silver',
    gradient: 'from-gray-300 via-slate-200 to-gray-400',
    textColor: 'text-gray-300',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/30',
    glowColor: 'shadow-gray-400/15',
    progressColor: 'from-gray-400 to-slate-300',
  },
  GOLD: {
    emoji: '\uD83C\uDFC6',
    label: 'Gold',
    gradient: 'from-yellow-500 via-amber-400 to-yellow-600',
    textColor: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/15',
    progressColor: 'from-yellow-500 to-amber-400',
  },
  PLATINUM: {
    emoji: '\uD83D\uDC8E',
    label: 'Platinum',
    gradient: 'from-purple-500 via-violet-400 to-indigo-500',
    textColor: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
    progressColor: 'from-purple-500 to-violet-400',
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
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${cfg.bg} border ${cfg.border} ${className}`}
        title={`${cfg.label}${totalPoints != null ? ` - ${totalPoints.toLocaleString()} pts` : ''}`}
      >
        <span className="text-xs">{cfg.emoji}</span>
        <span className={`text-[10px] font-bold ${cfg.textColor}`}>{cfg.label}</span>
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
      <div className={`w-12 h-12 rounded-2xl ${cfg.bg} border ${cfg.border} shadow-lg ${cfg.glowColor} flex items-center justify-center`}>
        <span className="text-xl">{cfg.emoji}</span>
      </div>

      {/* Tier name */}
      <span className={`text-xs font-bold ${cfg.textColor}`}>{cfg.label}</span>

      {/* Total points */}
      {totalPoints != null && (
        <span className={`text-[11px] font-mono font-semibold ${cfg.textColor}`}>
          {totalPoints.toLocaleString()} pts
        </span>
      )}

      {/* Progress bar to next tier */}
      {nextTier && pointsToNext != null && pointsToNext > 0 && (
        <div className="w-full max-w-[120px]">
          <div className="h-1.5 bg-void rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${cfg.progressColor} transition-all duration-700`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className={`text-[9px] mt-0.5 text-center ${cfg.textColor} opacity-70`}>
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
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${cfg.bg} border ${cfg.border}`}>
        <span className="text-xs">{cfg.emoji}</span>
        <span className={`text-[10px] font-bold ${cfg.textColor}`}>{cfg.label}</span>
      </div>
      {totalPoints != null && (
        <span className={`text-xs font-mono font-semibold ${cfg.textColor}`}>
          {totalPoints.toLocaleString()}
        </span>
      )}
    </div>
  )
}

export { TIER_CONFIG, TIER_THRESHOLDS }
