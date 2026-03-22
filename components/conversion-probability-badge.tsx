'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ============================================================
// CONVERSION PROBABILITY BADGE (P4-05)
// Pill badge showing conversion probability as percentage
// Color: green (>70%), yellow (40-70%), red (<40%)
// ============================================================

interface ConversionProbabilityBadgeProps {
  probability: number
  /** Show as compact icon-only badge */
  compact?: boolean
  /** Show percentage label */
  showLabel?: boolean
  className?: string
}

function getConfig(probability: number) {
  const pct = Math.round(probability * 100)
  if (pct >= 70) {
    return {
      icon: TrendingUp,
      color: 'text-status-success',
      bg: 'bg-status-success/10',
      border: 'border-status-success/25',
      label: 'Alta',
    }
  }
  if (pct >= 40) {
    return {
      icon: Minus,
      color: 'text-status-warning',
      bg: 'bg-status-warning/10',
      border: 'border-status-warning/25',
      label: 'Media',
    }
  }
  return {
    icon: TrendingDown,
    color: 'text-status-danger',
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/25',
    label: 'Baja',
  }
}

export function ConversionProbabilityBadge({
  probability,
  compact = false,
  showLabel = false,
  className = '',
}: ConversionProbabilityBadgeProps) {
  const pct = Math.round(probability * 100)
  const cfg = getConfig(probability)
  const Icon = cfg.icon

  if (compact) {
    return (
      <div
        className={`w-7 h-7 rounded-md ${cfg.bg} border ${cfg.border} flex items-center justify-center ${className}`}
        title={`Conversion: ${pct}%`}
      >
        <Icon size={14} className={cfg.color} />
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${cfg.bg} border ${cfg.border} ${className}`}
    >
      <Icon size={10} className={cfg.color} />
      <span className={`text-[10px] font-bold font-mono ${cfg.color}`}>{pct}%</span>
      {showLabel && (
        <span className={`text-[10px] font-mono font-semibold ${cfg.color}`}>{cfg.label}</span>
      )}
    </div>
  )
}

/** Gauge-style meter for individual patient view */
export function ConversionGauge({
  probability,
  size = 'md',
}: {
  probability: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const pct = Math.round(probability * 100)
  const cfg = getConfig(probability)
  const dims = size === 'sm' ? 'w-16 h-16' : size === 'lg' ? 'w-28 h-28' : 'w-20 h-20'
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'
  const labelSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]'
  const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 6 : 5
  const radius = size === 'sm' ? 28 : size === 'lg' ? 50 : 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference
  const viewBox = size === 'sm' ? '0 0 64 64' : size === 'lg' ? '0 0 112 112' : '0 0 80 80'
  const center = size === 'sm' ? 32 : size === 'lg' ? 56 : 40

  return (
    <div className={`relative ${dims} flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox={viewBox}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-3"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cfg.color}
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className={`${textSize} font-bold font-mono ${cfg.color}`}>{pct}%</div>
        <div className={`${labelSize} font-mono text-text-dim`}>Conv.</div>
      </div>
    </div>
  )
}
