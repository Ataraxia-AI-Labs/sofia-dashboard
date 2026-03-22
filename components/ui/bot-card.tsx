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
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-sm">
          {emoji}
        </div>
        <span className="text-[11px] font-mono font-semibold text-text-primary">{name}</span>
      </div>
      <div className="text-2xl font-mono font-bold text-text-primary tracking-tight">{display}</div>
      <div className="text-[9px] text-text-muted font-mono mt-0.5">{label}</div>
      {extra && <div className="text-[9px] text-brand-purple font-mono font-semibold mt-1">{extra}</div>}
      {desc && <div className="text-[9px] text-text-dim font-mono mt-2 leading-relaxed">{desc}</div>}
    </div>
  )
}
