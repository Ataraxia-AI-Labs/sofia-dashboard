'use client'

import type { CallStatus } from '@/types'

// ============================================================
// CALL STATUS BADGE (P5-10)
// Status indicator for voice calls
// ============================================================

interface CallStatusBadgeProps {
  status: CallStatus
  className?: string
}

const STATUS_CONFIG: Record<CallStatus, {
  label: string
  color: string
  bg: string
  border: string
  pulse?: boolean
}> = {
  IN_PROGRESS: {
    label: 'En curso',
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/25',
    pulse: true,
  },
  COMPLETED: {
    label: 'Completada',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  TRANSFERRED: {
    label: 'Transferida',
    color: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/25',
  },
  MISSED: {
    label: 'Perdida',
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/25',
  },
  FAILED: {
    label: 'Fallida',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
  },
}

export function CallStatusBadge({ status, className = '' }: CallStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.COMPLETED

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
    >
      {cfg.pulse ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-danger opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-danger" />
        </span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${
          status === 'COMPLETED' ? 'bg-emerald-400' :
          status === 'TRANSFERRED' ? 'bg-status-info' :
          status === 'MISSED' ? 'bg-status-danger' :
          'bg-orange-400'
        }`} />
      )}
      {cfg.label}
    </span>
  )
}

export { STATUS_CONFIG }
