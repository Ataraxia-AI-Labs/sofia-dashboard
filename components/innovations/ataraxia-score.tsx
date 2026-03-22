'use client'

import { useMemo } from 'react'
import type { FullAnalytics, VoiceMetrics } from '@/types'

interface AtaraxiaScoreProps {
  data: FullAnalytics
  voice?: VoiceMetrics | null
}

/**
 * Ataraxia Score — 0-100 tranquility index.
 * Measures how "at peace" the clinic is operating.
 *
 * Dimensions (25pts each):
 * - Conversion: tasa_conversion_pct mapped 0-25
 * - Revenue: revenue_total vs proyeccion_mensual
 * - Response: response_time_promedio_ms (lower = better)
 * - Attendance: tasa_asistencia_pct mapped 0-25
 */
function computeScore(data: FullAnalytics, voice?: VoiceMetrics | null): { score: number; dimensions: { label: string; value: number; max: number }[] } {
  const c = data.conversiones
  const r = data.revenue
  const p = data.performance_ia

  // Conversion (0-25): 10%+ conversion = 25pts
  const conversionRaw = Math.min(c.tasa_conversion_pct / 10, 1) * 25

  // Revenue health (0-25): actual vs projection
  const revenueRatio = r.proyeccion_mensual > 0
    ? Math.min(r.revenue_total / (r.proyeccion_mensual * 0.8), 1)
    : (r.revenue_total > 0 ? 0.5 : 0)
  const revenueRaw = revenueRatio * 25

  // Response time (0-25): < 2000ms = 25, > 10000ms = 0
  const rtMs = p.response_time_promedio_ms || 5000
  const responseRaw = Math.max(0, Math.min(1, (10000 - rtMs) / 8000)) * 25

  // Attendance (0-25): direct map from 0-100% to 0-25
  const attendanceRaw = (c.tasa_asistencia_pct / 100) * 25

  // Voice bonus: if voice is active, slight bump (max 5 extra but capped at 100)
  const voiceBonus = voice && voice.total_calls > 0 ? 3 : 0

  const raw = conversionRaw + revenueRaw + responseRaw + attendanceRaw + voiceBonus
  const score = Math.round(Math.min(100, Math.max(0, raw)))

  return {
    score,
    dimensions: [
      { label: 'CONV', value: Math.round(conversionRaw), max: 25 },
      { label: 'REV', value: Math.round(revenueRaw), max: 25 },
      { label: 'RESP', value: Math.round(responseRaw), max: 25 },
      { label: 'ATTN', value: Math.round(attendanceRaw), max: 25 },
    ],
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-status-success'
  if (score >= 60) return 'text-brand-cyan'
  if (score >= 40) return 'text-status-warning'
  return 'text-status-danger'
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-status-success'
  if (score >= 60) return 'bg-brand-cyan'
  if (score >= 40) return 'bg-status-warning'
  return 'bg-status-danger'
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'ATARAXIA'
  if (score >= 75) return 'SERENO'
  if (score >= 60) return 'ESTABLE'
  if (score >= 40) return 'ALERTA'
  return 'CRITICO'
}

export function AtaraxiaScore({ data, voice }: AtaraxiaScoreProps) {
  const { score, dimensions } = useMemo(() => computeScore(data, voice), [data, voice])

  // SVG circular gauge
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="glass-card p-4 flex items-center gap-4">
      {/* Circular gauge */}
      <div className="relative flex-shrink-0">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          {/* Track */}
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke="currentColor"
            className="text-surface-3"
            strokeWidth="4"
          />
          {/* Progress */}
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke="currentColor"
            className={scoreColor(score)}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-mono font-bold ${scoreColor(score)}`}>{score}</span>
          <span className="text-[7px] font-mono text-text-dim tracking-[0.2em]">{scoreLabel(score)}</span>
        </div>
      </div>

      {/* Dimensions */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] font-mono font-bold text-text-primary uppercase tracking-wider">Ataraxia Score</span>
          <div className={`w-1.5 h-1.5 rounded-full ${scoreBg(score)} animate-sentient-pulse`} />
        </div>
        <div className="space-y-1.5">
          {dimensions.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-text-dim w-8 tracking-wider">{d.label}</span>
              <div className="flex-1 h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreBg(score)} transition-all duration-700`}
                  style={{ width: `${(d.value / d.max) * 100}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-text-muted w-6 text-right">{d.value}/{d.max}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
