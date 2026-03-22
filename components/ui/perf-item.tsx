import React from 'react'

export interface PerfItemProps {
  label: string
  value: string
  accent?: boolean
}

export function PerfItem({ label, value, accent }: PerfItemProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-text-muted font-mono">{label}</span>
      <span className={`text-xs font-mono font-semibold ${accent ? 'text-brand-purple' : 'text-text-primary'}`}>{value}</span>
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
      <div className="text-[9px] text-text-muted font-mono mb-0.5">{label}</div>
      <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
    </div>
  )
}
