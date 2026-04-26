'use client'

import { useEffect, useState, useMemo } from 'react'
import { Target } from 'lucide-react'
import { fetchAttributionSnapshots, type AttributionSnapshot } from '@/lib/api/zombies'
import { formatCurrency } from '@/lib/api/helpers'
import * as Sentry from '@sentry/nextjs'

interface Props {
  orgId: string
  days?: number
}

const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: 'bg-status-success',
  INSTAGRAM: 'bg-brand-purple',
  MESSENGER: 'bg-brand-cyan',
  WEB: 'bg-status-warning',
  VOICE: 'bg-status-info',
  FACEBOOK: 'bg-brand-purple-dark',
  GOOGLE: 'bg-status-info',
  ORGANIC: 'bg-text-muted',
}

export function AttributionView({ orgId, days = 30 }: Props) {
  const [data, setData] = useState<AttributionSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [model, setModel] = useState<string>('LINEAR')

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    setLoading(true)
    fetchAttributionSnapshots(orgId, days)
      .then(rows => { if (!cancelled) setData(rows || []) })
      .catch(err => Sentry.captureException(err, { tags: { feature: 'attribution_view' } }))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId, days])

  // Models stored as columns: first_touch_credit, last_touch_credit, linear_credit,
  // time_decay_credit, position_based_credit. Pick which weight to apply.
  const models: Array<'LINEAR' | 'FIRST_TOUCH' | 'LAST_TOUCH' | 'TIME_DECAY' | 'POSITION_BASED'> = [
    'LINEAR', 'FIRST_TOUCH', 'LAST_TOUCH', 'TIME_DECAY', 'POSITION_BASED',
  ]
  const creditField = (m: string): keyof AttributionSnapshot => {
    switch (m) {
      case 'FIRST_TOUCH': return 'first_touch_credit'
      case 'LAST_TOUCH': return 'last_touch_credit'
      case 'TIME_DECAY': return 'time_decay_credit'
      case 'POSITION_BASED': return 'position_based_credit'
      default: return 'linear_credit'
    }
  }

  // Aggregate by channel — *_credit columns are already attributed revenue
  // in COP (weighted by the model). Sum directly.
  const byChannel = useMemo(() => {
    const field = creditField(model)
    const acc: Record<string, { revenue: number; leads: number }> = {}
    for (const r of data) {
      const ch = r.channel || 'UNKNOWN'
      const revenue = Number((r as unknown as Record<string, unknown>)[field as string] || 0)
      if (!acc[ch]) acc[ch] = { revenue: 0, leads: 0 }
      acc[ch].revenue += revenue
      acc[ch].leads += r.conversions_count || 0
    }
    return Object.entries(acc).sort(([, a], [, b]) => b.revenue - a.revenue)
  }, [data, model])

  const totalRevenue = byChannel.reduce((s, [, v]) => s + v.revenue, 0)

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-[12px] font-body font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
          <Target size={14} className="text-brand-purple" strokeWidth={1.8} />
          Atribución por canal
        </h2>
        {models.length > 1 && (
          <div className="flex gap-1">
            {models.map(m => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${
                  model === m
                    ? 'bg-brand-purple/15 text-brand-purple'
                    : 'bg-surface-2/40 text-text-dim hover:text-text-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-6 bg-surface-2/40 rounded animate-pulse" />
          ))}
        </div>
      ) : byChannel.length === 0 ? (
        <p className="text-[11px] font-body text-text-dim leading-relaxed">
          Aún no hay datos de atribución. Se calculan diariamente desde las conversiones registradas.
        </p>
      ) : (
        <div className="space-y-1.5">
          {byChannel.slice(0, 8).map(([ch, v]) => {
            const pct = totalRevenue > 0 ? (v.revenue / totalRevenue) * 100 : 0
            const color = CHANNEL_COLORS[ch] || 'bg-text-muted'
            return (
              <div key={ch} className="flex items-center gap-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted w-20 truncate">{ch}</span>
                <div className="flex-1 h-2 bg-surface-2/40 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] font-mono text-text-primary w-20 text-right">
                  {formatCurrency(v.revenue, 'COP')}
                </span>
                <span className="text-[10px] font-mono text-text-dim w-10 text-right">
                  {pct.toFixed(0)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
