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
    textColor: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
  },
  GOOGLE_REVIEW: {
    emoji: '\u2B50',
    label: 'Review Google',
    textColor: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/25',
  },
  ON_TIME_PAYMENT: {
    emoji: '\uD83D\uDCB0',
    label: 'Pago puntual',
    textColor: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  PROFILE_COMPLETE: {
    emoji: '\uD83D\uDCCB',
    label: 'Perfil completo',
    textColor: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/25',
  },
  SURVEY_RESPONSE: {
    emoji: '\uD83D\uDCCA',
    label: 'Encuesta',
    textColor: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
  },
  FIRST_VISIT: {
    emoji: '\uD83C\uDF89',
    label: 'Primera visita',
    textColor: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/25',
  },
  STREAK_BONUS: {
    emoji: '\uD83D\uDD25',
    label: 'Racha bonus',
    textColor: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
  },
  BIRTHDAY_VISIT: {
    emoji: '\uD83C\uDF82',
    label: 'Visita cumple',
    textColor: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
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
          <span className={`text-[9px] font-bold ${cfg.textColor}`}>+{points}</span>
        )}
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${cfg.bg} border ${cfg.border} ${className}`}>
      <span className="text-sm">{cfg.emoji}</span>
      <div className="flex flex-col">
        <span className={`text-[11px] font-semibold ${cfg.textColor}`}>{cfg.label}</span>
      </div>
      {points != null && (
        <span className={`text-xs font-bold font-mono ${cfg.textColor} ml-auto`}>
          +{points.toLocaleString()}
        </span>
      )}
    </div>
  )
}

export { ACTION_CONFIG }
