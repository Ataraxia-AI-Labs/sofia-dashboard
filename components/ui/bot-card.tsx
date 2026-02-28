import React from 'react'

export interface BotCardProps {
  emoji: string
  name: string
  value: number
  label: string
  extra?: string
  desc?: string
  gradient: string
  formatNumber?: (n: number) => string
}

export function BotCard({ emoji, name, value, label, extra, desc, gradient, formatNumber: fmt }: BotCardProps) {
  const display = fmt ? fmt(value) : value.toLocaleString()
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-base`}>
          {emoji}
        </div>
        <span className="text-sm font-semibold text-text-primary">{name}</span>
      </div>
      <div className="text-3xl font-bold font-mono text-text-primary">{display}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
      {extra && <div className="text-xs text-brand-purple font-semibold mt-1.5">{extra}</div>}
      {desc && <div className="text-[11px] text-text-dim mt-3">{desc}</div>}
    </div>
  )
}
