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
    <div className="glass-card metric-glow p-5 animate-fade-up" style={{ animationDelay: `${delay * 80}ms` }}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center text-white mb-3 shadow-lg`}>
        {icon}
      </div>
      <div className="stat-number text-text-primary">{value}</div>
      <div className="text-xs text-text-muted mt-1 font-medium">{label}</div>
      {sub && <div className={`text-[11px] mt-1.5 font-semibold ${subColor || 'text-text-dim'}`}>{sub}</div>}
    </div>
  )
}
