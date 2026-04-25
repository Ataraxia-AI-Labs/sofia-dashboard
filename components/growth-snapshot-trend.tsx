'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchGrowthSnapshots, type GrowthSnapshot } from '@/lib/api/zombies'
import { formatCurrency } from '@/lib/api/helpers'
import * as Sentry from '@sentry/nextjs'

type Metric = 'leads_new' | 'leads_contacted' | 'appointments_scheduled' | 'revenue_paid_cop'

const METRIC_LABELS: Record<Metric, string> = {
  leads_new: 'Leads nuevos',
  leads_contacted: 'Contactados',
  appointments_scheduled: 'Citas agendadas',
  revenue_paid_cop: 'Revenue cobrado',
}

const METRIC_COLORS: Record<Metric, string> = {
  leads_new: 'rgb(139,92,246)',          // brand-purple
  leads_contacted: 'rgb(34,211,238)',    // brand-cyan
  appointments_scheduled: 'rgb(245,200,66)', // status-warning
  revenue_paid_cop: 'rgb(34,197,94)',    // status-success
}

interface Props {
  orgId: string
  days?: number
}

export function GrowthSnapshotTrend({ orgId, days = 30 }: Props) {
  const [data, setData] = useState<GrowthSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<Metric>('leads_new')

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setLoading(true)
    fetchGrowthSnapshots(orgId, days)
      .then(rows => { if (!cancelled) setData(rows || []) })
      .catch(err => Sentry.captureException(err, { tags: { feature: 'growth_snapshot_trend' } }))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId, days])

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="h-3 w-32 bg-surface-2 rounded animate-pulse mb-3" />
        <div className="h-24 bg-surface-2/40 rounded animate-pulse" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="glass-card p-4">
        <h2 className="text-[12px] font-body font-semibold text-text-primary uppercase tracking-wider mb-2">
          Tendencia de crecimiento
        </h2>
        <p className="text-[11px] font-body text-text-dim">
          Aún no hay snapshots. SofIA los genera automáticamente cada noche.
        </p>
      </div>
    )
  }

  const values = data.map(d => Number(d[metric] ?? 0))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  // Trend: last vs first
  const first = values[0] ?? 0
  const last = values[values.length - 1] ?? 0
  const delta = last - first
  const deltaPct = first > 0 ? Math.round((delta / first) * 100) : (delta > 0 ? 100 : 0)
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendColor = delta > 0 ? 'text-status-success' : delta < 0 ? 'text-status-danger' : 'text-text-dim'

  // SVG line
  const w = 600
  const h = 80
  const stepX = data.length > 1 ? w / (data.length - 1) : 0
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * (h - 6) - 3
    return `${x},${y}`
  }).join(' ')

  const fmt = (v: number) => metric === 'revenue_paid_cop'
    ? formatCurrency(v, 'COP')
    : v.toLocaleString('es-CO')

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-[12px] font-body font-semibold text-text-primary uppercase tracking-wider mb-0.5">
            Tendencia de crecimiento · {days}d
          </h2>
          <p className="text-[10.5px] font-mono text-text-dim">
            {data.length} snapshot{data.length === 1 ? '' : 's'} disponibles
          </p>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={14} strokeWidth={1.8} />
          <span className="text-[12px] font-mono font-semibold">
            {delta > 0 ? '+' : ''}{deltaPct}%
          </span>
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.keys(METRIC_LABELS) as Metric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-2 py-1 rounded-md text-[10.5px] font-mono uppercase tracking-wider transition-all ${
              metric === m
                ? 'bg-brand-purple/15 text-brand-purple'
                : 'bg-surface-2/40 text-text-dim hover:text-text-muted'
            }`}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      {/* SVG sparkline */}
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gr-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={METRIC_COLORS[metric]} stopOpacity="0.3" />
              <stop offset="100%" stopColor={METRIC_COLORS[metric]} stopOpacity="0" />
            </linearGradient>
          </defs>
          {data.length > 1 && (
            <>
              <polygon
                points={`0,${h} ${points} ${w},${h}`}
                fill={`url(#gr-${metric})`}
              />
              <polyline
                points={points}
                fill="none"
                stroke={METRIC_COLORS[metric]}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          )}
          {data.length === 1 && (
            <circle cx={w / 2} cy={h / 2} r="4" fill={METRIC_COLORS[metric]} />
          )}
        </svg>
        <div className="flex items-baseline justify-between mt-1.5">
          <span className="text-[10px] font-mono text-text-dim">{data[0]?.snapshot_date}</span>
          <span className="text-[12px] font-mono font-semibold text-text-primary">
            {fmt(last)}
          </span>
          <span className="text-[10px] font-mono text-text-dim">{data[data.length - 1]?.snapshot_date}</span>
        </div>
      </div>
    </div>
  )
}
