'use client'

import { Syringe, Target, Cake, Hospital, Moon, Star, Palmtree } from 'lucide-react'
import type { OutreachTriggerType } from '@/types'

// ============================================================
// OUTREACH TRIGGER BADGE (P5-01)
// Icon + label + color for each trigger type
// ============================================================

const TRIGGER_CONFIG: Record<OutreachTriggerType, {
  icon: typeof Syringe
  label: string
  color: string
  bg: string
  border: string
}> = {
  TREATMENT_CYCLE: {
    icon: Syringe,
    label: 'Ciclo Tratamiento',
    color: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/25',
  },
  LEAD_NURTURE: {
    icon: Target,
    label: 'Nurture Lead',
    color: 'text-brand-cyan',
    bg: 'bg-brand-cyan/10',
    border: 'border-brand-cyan/25',
  },
  BIRTHDAY: {
    icon: Cake,
    label: 'Cumpleanos',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/25',
  },
  PREVENTIVE: {
    icon: Hospital,
    label: 'Preventivo',
    color: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/25',
  },
  REACTIVATION: {
    icon: Moon,
    label: 'Reactivacion',
    color: 'text-status-warning',
    bg: 'bg-status-warning/10',
    border: 'border-status-warning/25',
  },
  POST_TREATMENT: {
    icon: Star,
    label: 'Post-Tratamiento',
    color: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    border: 'border-brand-gold/25',
  },
  SEASONAL: {
    icon: Palmtree,
    label: 'Temporada',
    color: 'text-status-success',
    bg: 'bg-status-success/10',
    border: 'border-status-success/25',
  },
}

interface OutreachTriggerBadgeProps {
  triggerType: OutreachTriggerType
  compact?: boolean
  className?: string
}

export function OutreachTriggerBadge({ triggerType, compact = false, className = '' }: OutreachTriggerBadgeProps) {
  const cfg = TRIGGER_CONFIG[triggerType] || TRIGGER_CONFIG.LEAD_NURTURE
  const Icon = cfg.icon

  if (compact) {
    return (
      <div
        className={`w-7 h-7 rounded-md ${cfg.bg} border ${cfg.border} flex items-center justify-center ${className}`}
        title={cfg.label}
      >
        <Icon size={14} className={cfg.color} />
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border} ${className}`}>
      <Icon size={10} className={cfg.color} />
      <span className={`text-[10px] font-mono font-semibold ${cfg.color}`}>{cfg.label}</span>
    </div>
  )
}

export { TRIGGER_CONFIG }
