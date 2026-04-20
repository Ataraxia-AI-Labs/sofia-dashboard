import React from 'react'

export interface StatusPillProps {
  label: string
  value: string
  color: 'success' | 'danger' | 'warning'
}

const dotColors = {
  success: 'bg-status-success',
  danger: 'bg-status-danger',
  warning: 'bg-status-warning',
} as const

export function StatusPill({ label, value, color }: StatusPillProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-2 border border-border/50 text-[11px] font-body">
      <div className={`w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-mono font-semibold tabular-nums">{value}</span>
    </div>
  )
}
