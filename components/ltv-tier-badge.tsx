'use client'

import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import type { LTVTier, LTVTrend } from '@/types'
import { formatCurrency } from '@/lib/api/helpers'

// ============================================================
// LTV TIER BADGE (P5-12)
// Premium badge showing tier with gradient, emoji, and trend
// ============================================================

interface LTVTierBadgeProps {
  tier: LTVTier
  predictedValue?: number
  trend?: LTVTrend
  compact?: boolean
  className?: string
}

const TIER_CONFIG: Record<LTVTier, {
  emoji: string
  label: string
  gradient: string
  textColor: string
  bg: string
  border: string
  glowColor: string
}> = {
  DIAMOND: {
    emoji: '\uD83D\uDC8E',
    label: 'Diamond',
    gradient: 'from-indigo-500 via-purple-500 to-blue-500',
    textColor: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/30',
    glowColor: 'shadow-indigo-500/20',
  },
  PLATINUM: {
    emoji: '\u2B50',
    label: 'Platinum',
    gradient: 'from-text-muted via-text-primary to-text-muted',
    textColor: 'text-slate-300',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
    glowColor: 'shadow-slate-400/20',
  },
  GOLD: {
    emoji: '\uD83C\uDFC6',
    label: 'Gold',
    gradient: 'from-brand-gold via-status-warning to-brand-gold',
    textColor: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    border: 'border-brand-gold/30',
    glowColor: 'shadow-brand-gold/20',
  },
  SILVER: {
    emoji: '\uD83E\uDD48',
    label: 'Silver',
    gradient: 'from-text-muted via-text-dim to-text-muted',
    textColor: 'text-text-muted',
    bg: 'bg-text-muted/10',
    border: 'border-text-muted/30',
    glowColor: 'shadow-text-muted/20',
  },
  BRONZE: {
    emoji: '\uD83E\uDD49',
    label: 'Bronze',
    gradient: 'from-brand-gold via-status-warning to-brand-gold',
    textColor: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    border: 'border-brand-gold/30',
    glowColor: 'shadow-brand-gold/20',
  },
}

const TREND_CONFIG: Record<LTVTrend, {
  icon: typeof TrendingUp
  color: string
  label: string
}> = {
  RISING: { icon: TrendingUp, color: 'text-status-success', label: 'Subiendo' },
  STABLE: { icon: ArrowRight, color: 'text-status-info', label: 'Estable' },
  DECLINING: { icon: TrendingDown, color: 'text-status-danger', label: 'Bajando' },
}

export function LTVTierBadge({
  tier,
  predictedValue,
  trend,
  compact = false,
  className = '',
}: LTVTierBadgeProps) {
  const cfg = TIER_CONFIG[tier]
  const trendCfg = trend ? TREND_CONFIG[trend] : null

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border} ${className}`}
        title={`${cfg.label} — ${predictedValue ? formatCurrency(predictedValue) : ''}`}
      >
        <span className="text-xs">{cfg.emoji}</span>
        <span className={`text-[10px] font-mono font-bold ${cfg.textColor}`}>{cfg.label}</span>
        {trendCfg && <trendCfg.icon size={10} className={trendCfg.color} />}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Tier icon with subtle glow */}
      <div className={`w-12 h-12 rounded-md ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
        <span className="text-xl">{cfg.emoji}</span>
      </div>

      {/* Tier name */}
      <span className={`text-[10px] font-mono font-bold ${cfg.textColor}`}>{cfg.label}</span>

      {/* Predicted value */}
      {predictedValue !== undefined && (
        <span className={`text-[10px] font-mono font-semibold ${cfg.textColor}`}>
          {formatCurrency(predictedValue)}
        </span>
      )}

      {/* Trend arrow */}
      {trendCfg && (
        <div className="flex items-center gap-0.5">
          <trendCfg.icon size={11} className={trendCfg.color} />
          <span className={`text-[9px] font-mono font-semibold ${trendCfg.color}`}>{trendCfg.label}</span>
        </div>
      )}
    </div>
  )
}

/** Inline row badge for tables/lists */
export function LTVTierInline({
  tier,
  predictedValue,
  trend,
  className = '',
}: {
  tier: LTVTier
  predictedValue?: number
  trend?: LTVTrend
  className?: string
}) {
  const cfg = TIER_CONFIG[tier]
  const trendCfg = trend ? TREND_CONFIG[trend] : null

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border}`}>
        <span className="text-xs">{cfg.emoji}</span>
        <span className={`text-[10px] font-mono font-bold ${cfg.textColor}`}>{cfg.label}</span>
      </div>
      {predictedValue !== undefined && (
        <span className={`text-[10px] font-mono font-semibold ${cfg.textColor}`}>
          {formatCurrency(predictedValue)}
        </span>
      )}
      {trendCfg && <trendCfg.icon size={12} className={trendCfg.color} />}
    </div>
  )
}

export { TIER_CONFIG, TREND_CONFIG }
