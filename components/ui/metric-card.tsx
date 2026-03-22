import React from 'react'

export interface MetricCardProps {
  icon: React.ReactNode
  iconColor: string
  value: string
  label: string
  sub?: string
  subColor?: string
  delay?: number
}

export function MetricCard({ icon, iconColor, value, label, sub, subColor, delay = 0 }: MetricCardProps) {
  return (
    <div className="glass-card metric-glow p-4 animate-fade-up" style={{ animationDelay: `${delay * 60}ms` }}>
      <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple mb-2">
        {icon}
      </div>
      <div className="text-xl font-mono font-bold text-text-primary tracking-tight">{value}</div>
      <div className="text-[10px] text-text-muted mt-0.5 font-mono">{label}</div>
      {sub && <div className={`text-[9px] mt-1 font-mono font-semibold ${subColor || 'text-text-dim'}`}>{sub}</div>}
    </div>
  )
}
