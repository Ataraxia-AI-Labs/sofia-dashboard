'use client'

import { useState, useCallback } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { fetchFullAnalytics } from '@/lib/api'
import type { SubBotMetrics } from '@/types'

interface BotsTabProps {
  orgId: string
}

export function BotsTab({ orgId }: BotsTabProps) {
  const [metrics, setMetrics] = useState<SubBotMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchFullAnalytics(orgId, 30)
      if (data?.sub_bots) setMetrics(data.sub_bots as SubBotMetrics)
    } catch {
      // non-critical
    }
    setLoading(false)
  }, [orgId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Sub-Bot Monitor</h3>
          <p className="text-xs text-text-dim mt-0.5">Metricas de los bots automaticos en los ultimos 30 dias.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadMetrics} disabled={loading} icon={<RefreshCw size={12} className={loading ? 'animate-spin' : ''} />}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </Button>
      </div>

      {!metrics && !loading && (
        <div className="glass-card p-8 text-center">
          <Activity size={24} className="mx-auto text-text-dim mb-3" />
          <p className="text-text-muted text-sm">Haz clic en &quot;Actualizar&quot; para cargar metricas de bots.</p>
        </div>
      )}

      {metrics && (
        <div className="space-y-3">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted font-semibold">Total mensajes automaticos (30d)</span>
              <span className="text-lg font-bold text-brand-purple">{metrics.total_mensajes_automaticos.toLocaleString()}</span>
            </div>
          </div>

          <BotCard
            name="Reminder Bot"
            description={metrics.reminder_bot.descripcion}
            stats={[{ label: 'Mensajes enviados', value: metrics.reminder_bot.mensajes_enviados }]}
            color="text-brand-cyan"
          />
          <BotCard
            name="Hunter Bot"
            description={metrics.hunter_bot.descripcion}
            stats={[
              { label: 'Follow-ups enviados', value: metrics.hunter_bot.followups_enviados },
              { label: 'Conversiones post-followup', value: metrics.hunter_bot.conversiones_post_followup },
            ]}
            color="text-status-warning"
          />
          <BotCard
            name="Nurse Bot"
            description={metrics.nurse_bot.descripcion}
            stats={[{ label: 'Recordatorios enviados', value: metrics.nurse_bot.recordatorios_enviados }]}
            color="text-status-success"
          />
        </div>
      )}
    </div>
  )
}

function BotCard({ name, description, stats, color }: {
  name: string; description: string; stats: { label: string; value: number }[]; color: string
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={14} className={color} />
        <span className="text-sm font-semibold text-text-primary">{name}</span>
      </div>
      <p className="text-xs text-text-dim mb-3">{description}</p>
      <div className="flex gap-4">
        {stats.map(s => (
          <div key={s.label} className="flex-1 px-3 py-2 rounded-lg bg-surface-2">
            <div className="text-lg font-bold text-text-primary">{s.value.toLocaleString()}</div>
            <div className="text-[10px] text-text-dim">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
