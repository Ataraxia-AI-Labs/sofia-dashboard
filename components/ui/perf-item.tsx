import React from 'react'

export interface PerfItemProps {
  label: string
  value: string
  accent?: boolean
}

export function PerfItem({ label, value, accent }: PerfItemProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-semibold font-mono ${accent ? 'text-brand-purple' : 'text-text-primary'}`}>{value}</span>
    </div>
  )
}

export interface RevenueItemProps {
  label: string
  value: string
  color: string
}

export function RevenueItem({ label, value, color }: RevenueItemProps) {
  return (
    <div>
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}
