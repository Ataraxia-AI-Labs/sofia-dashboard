'use client'

import { AlertTriangle, Info, AlertOctagon } from 'lucide-react'

interface NetworkAlertBadgeProps {
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  label?: string
}

const SEVERITY_CONFIG = {
  INFO: {
    icon: Info,
    bg: 'bg-status-info/10 border-status-info/20',
    text: 'text-status-info',
  },
  WARNING: {
    icon: AlertTriangle,
    bg: 'bg-status-warning/10 border-status-warning/20',
    text: 'text-status-warning',
  },
  CRITICAL: {
    icon: AlertOctagon,
    bg: 'bg-status-danger/10 border-status-danger/20',
    text: 'text-status-danger',
  },
}

export function NetworkAlertBadge({ severity, label }: NetworkAlertBadgeProps) {
  const cfg = SEVERITY_CONFIG[severity]
  const Icon = cfg.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text}`}>
      <Icon size={10} />
      {label || severity}
    </span>
  )
}
