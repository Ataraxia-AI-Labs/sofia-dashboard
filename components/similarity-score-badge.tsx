'use client'

import { User, Phone, Fingerprint, Activity, Clock } from 'lucide-react'

// ============================================================
// SIMILARITY SCORE BADGE (P5-11)
// Circular gauge showing duplicate similarity percentage
// Color: red (>85%), orange (60-85%), gray (<60%)
// ============================================================

interface SimilarityScoreBadgeProps {
  score: number
  signals?: {
    name_similarity?: number
    id_match?: boolean
    phone_similarity?: number
    behavioral_score?: number
    temporal_proximity?: number
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getConfig(score: number) {
  const pct = Math.round(score * 100)
  if (pct >= 85) {
    return {
      color: 'text-status-danger',
      bg: 'bg-status-danger/10',
      border: 'border-status-danger/25',
      stroke: 'text-status-danger',
      label: 'Alta',
    }
  }
  if (pct >= 60) {
    return {
      color: 'text-status-warning',
      bg: 'bg-status-warning/10',
      border: 'border-status-warning/25',
      stroke: 'text-status-warning',
      label: 'Media',
    }
  }
  return {
    color: 'text-text-dim',
    bg: 'bg-surface-3',
    border: 'border-border',
    stroke: 'text-text-dim',
    label: 'Baja',
  }
}

const SIGNAL_CONFIG = [
  { key: 'name_similarity', icon: User, label: 'Nombre' },
  { key: 'id_match', icon: Fingerprint, label: 'ID' },
  { key: 'phone_similarity', icon: Phone, label: 'Tel' },
  { key: 'behavioral_score', icon: Activity, label: 'Comp.' },
  { key: 'temporal_proximity', icon: Clock, label: 'Temp.' },
] as const

export function SimilarityScoreBadge({
  score,
  signals,
  size = 'md',
  className = '',
}: SimilarityScoreBadgeProps) {
  const pct = Math.round(score * 100)
  const cfg = getConfig(score)

  const dims = size === 'sm' ? 'w-14 h-14' : size === 'lg' ? 'w-24 h-24' : 'w-[72px] h-[72px]'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm'
  const strokeWidth = size === 'sm' ? 3 : size === 'lg' ? 5 : 4
  const radius = size === 'sm' ? 24 : size === 'lg' ? 42 : 32
  const viewBoxSize = size === 'sm' ? 56 : size === 'lg' ? 96 : 72
  const center = viewBoxSize / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (pct / 100) * circumference

  // Identify active signals
  const activeSignals = signals
    ? SIGNAL_CONFIG.filter(s => {
        const val = signals[s.key as keyof typeof signals]
        if (typeof val === 'boolean') return val
        if (typeof val === 'number') return val > 0.3
        return false
      })
    : []

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      {/* Circular gauge */}
      <div className={`relative ${dims} flex items-center justify-center`}>
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
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
            className={cfg.stroke}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <div className="text-center z-10">
          <div className={`${textSize} font-bold font-mono ${cfg.color}`}>{pct}%</div>
        </div>
      </div>

      {/* Signal pills */}
      {activeSignals.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {activeSignals.map(s => {
            const Icon = s.icon
            return (
              <div
                key={s.key}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${cfg.bg} border ${cfg.border}`}
                title={s.label}
              >
                <Icon size={9} className={cfg.color} />
                <span className={`text-[8px] font-semibold ${cfg.color}`}>{s.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Inline compact version for table rows */
export function SimilarityScoreInline({
  score,
  className = '',
}: {
  score: number
  className?: string
}) {
  const pct = Math.round(score * 100)
  const cfg = getConfig(score)

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${cfg.bg} border ${cfg.border} ${className}`}>
      <span className={`text-[10px] font-bold font-mono ${cfg.color}`}>{pct}%</span>
      <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
    </div>
  )
}
