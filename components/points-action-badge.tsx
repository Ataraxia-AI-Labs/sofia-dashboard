'use client'

import type { GamificationAction } from '@/types'

// ============================================================
// POINTS ACTION BADGE (P5-06)
// Visual badge for gamification action types with icon + color
// ============================================================

interface PointsActionBadgeProps {
  action: GamificationAction
  points?: number
  compact?: boolean
  className?: string
}

const ACTION_CONFIG: Record<GamificationAction, {
  emoji: string
  label: string
  textColor: string
  bg: string
  border: string
}> = {
  VISIT_COMPLETED: {
    emoji: '\u2705',
    label: 'Visita completada',
    textColor: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
  },
  REFERRAL: {
    emoji: '\uD83D\uDC65',
    label: 'Referido',
    textColor: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/25',
  },
  GOOGLE_REVIEW: {
    emoji: '\u2B50',
    label: 'Review Google',
    textColor: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    border: 'border-brand-gold/25',
  },
  ON_TIME_PAYMENT: {
    emoji: '\uD83D\uDCB0',
    label: 'Pago puntual',
    textColor: 'text-status-success',
    bg: 'bg-status-success/10',
    border: 'border-status-success/25',
  },
  PROFILE_COMPLETE: {
    emoji: '\uD83D\uDCCB',
    label: 'Perfil completo',
    textColor: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/25',
  },
  SURVEY_RESPONSE: {
    emoji: '\uD83D\uDCCA',
    label: 'Encuesta',
    textColor: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/25',
  },
  FIRST_VISIT: {
    emoji: '\uD83C\uDF89',
    label: 'Primera visita',
    textColor: 'text-brand-cyan',
    bg: 'bg-brand-cyan/10',
    border: 'border-brand-cyan/25',
  },
  STREAK_BONUS: {
    emoji: '\uD83D\uDD25',
    label: 'Racha bonus',
    textColor: 'text-status-warning',
    bg: 'bg-status-warning/10',
    border: 'border-status-warning/25',
  },
  BIRTHDAY_VISIT: {
    emoji: '\uD83C\uDF82',
    label: 'Visita cumple',
    textColor: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/25',
  },
}

export function PointsActionBadge({
  action,
  points,
  compact = false,
  className = '',
}: PointsActionBadgeProps) {
  const cfg = ACTION_CONFIG[action]
  if (!cfg) return null

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${cfg.bg} border ${cfg.border} ${className}`}
        title={cfg.label}
      >
        <span className="text-[10px]">{cfg.emoji}</span>
        {points != null && (
          <span className={`text-[9px] font-mono font-bold ${cfg.textColor}`}>+{points}</span>
        )}
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${cfg.bg} border ${cfg.border} ${className}`}>
      <span className="text-sm">{cfg.emoji}</span>
      <div className="flex flex-col">
        <span className={`text-[10px] font-mono font-semibold ${cfg.textColor}`}>{cfg.label}</span>
      </div>
      {points != null && (
        <span className={`text-[10px] font-bold font-mono ${cfg.textColor} ml-auto`}>
          +{points.toLocaleString()}
        </span>
      )}
    </div>
  )
}

export { ACTION_CONFIG }
