import React from 'react'

export interface StatusPillProps {
  label: string
  value: string
  color: 'success' | 'danger' | 'warning'
}

const colors = {
  success: 'bg-status-success/8 border-status-success/15 text-status-success',
  danger: 'bg-status-danger/8 border-status-danger/15 text-status-danger',
  warning: 'bg-status-warning/8 border-status-warning/15 text-status-warning',
} as const

export function StatusPill({ label, value, color }: StatusPillProps) {
  return (
    <div className={`badge ${colors[color]}`}>
      <div className={`w-1.5 h-1.5 rounded-full bg-status-${color}`} />
      <span className="text-text-muted text-[11px]">{label}</span>
      <span className="font-bold text-xs">{value}</span>
    </div>
  )
}
