import React from 'react'

export interface MetricCardProps {
  icon: React.ReactNode
  iconColor: string
  value: string
  label: string
  sub?: string
  subColor?: string
  delay?: number
  /** Optional hover tooltip explaining the metric */
  tooltip?: string
}

export function MetricCard({ icon, iconColor, value, label, sub, subColor, delay = 0, tooltip }: MetricCardProps) {
  return (
    <div
      className="glass-card metric-glow p-4 animate-fade-up"
      style={{ animationDelay: `${delay * 60}ms` }}
      title={tooltip}
    >
      <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple mb-2">
        {icon}
      </div>
      <div className="text-2xl font-mono font-semibold text-text-primary tracking-tight tabular-nums">{value}</div>
      <div className="text-[12px] text-text-muted mt-1 font-body">{label}</div>
      {sub && <div className={`text-[11px] mt-1.5 font-body font-semibold ${subColor || 'text-text-dim'}`}>{sub}</div>}
    </div>
  )
}
