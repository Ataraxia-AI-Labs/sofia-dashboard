'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { fetchGrowthAnomalies, type GrowthAnomaly } from '@/lib/api/zombies'
import * as Sentry from '@sentry/nextjs'

const METRIC_LABELS: Record<string, string> = {
  leads_new: 'Leads nuevos',
  leads_contacted: 'Contactados',
  appointments_scheduled: 'Citas',
  revenue_paid_cop: 'Revenue',
  conversion_rate: 'Conversión',
}

interface Props {
  orgId: string
}

export function GrowthAnomaliesCard({ orgId }: Props) {
  const [items, setItems] = useState<GrowthAnomaly[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    fetchGrowthAnomalies(orgId)
      .then(rows => { if (!cancelled) setItems(rows || []) })
      .catch(err => Sentry.captureException(err, { tags: { feature: 'growth_anomalies' } }))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId])

  return (
    <div className="glass-card p-4">
      <h2 className="text-[12px] font-body font-semibold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
        <AlertCircle size={14} className="text-status-warning" strokeWidth={1.8} />
        Anomalías detectadas
      </h2>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-8 bg-surface-2/40 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[11px] font-body text-text-dim leading-relaxed">
          Todo dentro de lo esperado. SofIA monitorea spikes y caídas {'>'} 2σ sobre el baseline de 30d.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map(a => {
            const isSpike = a.metric_today > a.metric_baseline
            const Icon = isSpike ? TrendingUp : TrendingDown
            const color = a.severity === 'CRITICAL'
              ? 'text-status-danger'
              : a.severity === 'WARN'
                ? 'text-status-warning'
                : (isSpike ? 'text-status-success' : 'text-text-muted')
            const label = METRIC_LABELS[a.metric_name] || a.metric_name
            return (
              <li key={a.id} className="flex items-center gap-2 text-[11.5px] font-body">
                <Icon size={12} className={color} strokeWidth={1.8} />
                <span className="flex-1 text-text-muted">
                  <strong className="text-text-primary">{label}</strong>
                  <span className="text-text-dim"> · {Math.round(a.metric_today)} vs {Math.round(a.metric_baseline)}</span>
                  <span className="text-text-dim"> · z {Number(a.z_score).toFixed(1)}</span>
                </span>
                <span className="text-[10px] font-mono text-text-dim">
                  {new Date(a.detected_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
