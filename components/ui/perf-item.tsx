import React from 'react'

export interface PerfItemProps {
  label: string
  value: string
  accent?: boolean
}

export function PerfItem({ label, value, accent }: PerfItemProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-text-muted font-body">{label}</span>
      <span className={`text-[13px] font-body font-semibold tabular-nums ${accent ? 'text-brand-purple' : 'text-text-primary'}`}>{value}</span>
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
      <div className="text-[11px] text-text-muted font-body mb-1">{label}</div>
      <div className={`text-xl font-mono font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
