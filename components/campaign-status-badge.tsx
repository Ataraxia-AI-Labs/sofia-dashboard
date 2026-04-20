'use client'

import { FileEdit, Clock, Loader2, CheckCircle, XCircle, BarChart3 } from 'lucide-react'
import type { CampaignStatus } from '@/types'

// ============================================================
// CAMPAIGN STATUS BADGE (P5-09)
// Visual indicator for campaign lifecycle states
// ============================================================

const STATUS_CONFIG: Record<CampaignStatus, {
  icon: typeof FileEdit
  label: string
  color: string
  bg: string
  border: string
  animate?: string
}> = {
  DRAFT: {
    icon: FileEdit,
    label: 'Borrador',
    color: 'text-text-muted',
    bg: 'bg-surface-3',
    border: 'border-border',
  },
  SCHEDULED: {
    icon: Clock,
    label: 'Programada',
    color: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/25',
  },
  SENDING: {
    icon: Loader2,
    label: 'Enviando',
    color: 'text-status-warning',
    bg: 'bg-status-warning/10',
    border: 'border-status-warning/25',
    animate: 'animate-spin',
  },
  COMPLETED: {
    icon: CheckCircle,
    label: 'Completada',
    color: 'text-status-success',
    bg: 'bg-status-success/10',
    border: 'border-status-success/25',
  },
  CANCELLED: {
    icon: XCircle,
    label: 'Cancelada',
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/25',
  },
  ANALYZED: {
    icon: BarChart3,
    label: 'Analizada',
    color: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/25',
  },
}

interface CampaignStatusBadgeProps {
  status: CampaignStatus
  className?: string
}

export function CampaignStatusBadge({ status, className = '' }: CampaignStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT
  const Icon = cfg.icon

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border} ${className}`}>
      <Icon size={10} className={`${cfg.color} ${cfg.animate || ''}`} />
      <span className={`text-[12px] font-body font-semibold ${cfg.color}`}>{cfg.label}</span>
    </div>
  )
}

export { STATUS_CONFIG }
