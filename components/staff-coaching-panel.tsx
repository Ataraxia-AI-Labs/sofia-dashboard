'use client'

import { useEffect, useState, useCallback } from 'react'
import { getCoachingTips, getStaffMetrics, markTipRead, getCoachingDashboard } from '@/lib/api/conv-intel'
import type { CoachingTip, StaffMetric } from '@/lib/api/conv-intel'
import { GraduationCap, Lightbulb, BarChart3, CheckCircle, TrendingUp } from 'lucide-react'

interface Props {
  orgId: string
}

export function StaffCoachingPanel({ orgId }: Props) {
  const [tips, setTips] = useState<CoachingTip[]>([])
  const [metrics, setMetrics] = useState<StaffMetric[]>([])
  const [dashboard, setDashboard] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'tips' | 'metrics'>('tips')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, m, d] = await Promise.all([
        getCoachingTips(orgId),
        getStaffMetrics(orgId),
        getCoachingDashboard(orgId),
      ])
      setTips(Array.isArray(t) ? t : [])
      setMetrics(Array.isArray(m) ? m : [])
      setDashboard(d && typeof d === 'object' && !Array.isArray(d) ? d : {})
    } catch { /* */ }
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const handleMarkRead = async (tipId: string) => {
    await markTipRead(orgId, tipId)
    setTips(prev => prev.map(t => t.id === tipId ? { ...t, is_read: true } : t))
  }

  if (loading) return <div className="p-4 text-[12px] font-body text-text-dim">...</div>

  const unreadTips = tips.filter(t => !t.is_read)

  return (
    <div className="border border-border rounded-lg">
      <div className="bg-surface-2/50 px-4 py-2.5 border-b border-border flex items-center justify-between">
        <p className="text-[13px] font-body font-bold text-brand-purple flex items-center gap-1.5">
          <GraduationCap size={14} /> Coaching IA
        </p>
        {unreadTips.length > 0 && (
          <span className="text-[10px] font-body bg-brand-purple/10 text-brand-purple px-1.5 py-0.5 rounded-full font-semibold">
            {unreadTips.length} nuevos
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setTab('tips')}
          className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-body border-b-2 transition-colors ${
            tab === 'tips' ? 'text-brand-purple border-brand-purple font-semibold' : 'text-text-dim border-transparent hover:text-text-muted'
          }`}><Lightbulb size={10} /> Tips ({tips.length})</button>
        <button onClick={() => setTab('metrics')}
          className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-body border-b-2 transition-colors ${
            tab === 'metrics' ? 'text-brand-purple border-brand-purple font-semibold' : 'text-text-dim border-transparent hover:text-text-muted'
          }`}><BarChart3 size={10} /> Metricas</button>
      </div>

      <div className="p-3 max-h-[400px] overflow-y-auto">
        {tab === 'tips' ? (
          tips.length === 0 ? (
            <p className="text-[12px] font-body text-text-dim py-4 text-center">Sin tips de coaching disponibles</p>
          ) : (
            <div className="space-y-2">
              {tips.map(tip => (
                <div key={tip.id} className={`border rounded-lg p-3 transition-colors ${tip.is_read ? 'border-border/50 bg-transparent' : 'border-brand-purple/15 bg-brand-purple/3'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-body px-1.5 py-0.5 rounded font-semibold uppercase ${
                          tip.priority === 'HIGH' ? 'bg-status-danger/8 text-status-danger'
                          : tip.priority === 'MEDIUM' ? 'bg-status-warning/8 text-status-warning'
                          : 'bg-surface-2 text-text-dim'
                        }`}>{tip.priority}</span>
                        <span className="text-[10px] font-body text-text-dim">{tip.category}</span>
                      </div>
                      <p className="text-[12px] font-body text-text-secondary">{tip.tip}</p>
                    </div>
                    {!tip.is_read && (
                      <button onClick={() => handleMarkRead(tip.id)}
                        className="p-1 rounded hover:bg-surface-2 text-text-dim hover:text-status-success transition-colors flex-shrink-0">
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          metrics.length === 0 ? (
            <p className="text-[12px] font-body text-text-dim py-4 text-center">Sin metricas de staff</p>
          ) : (
            <div className="space-y-2">
              {metrics.map(m => (
                <div key={m.staff_id} className="border border-border rounded-lg p-3">
                  <p className="text-[13px] font-body font-semibold text-text-primary">{m.staff_name}</p>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div>
                      <p className="text-[10px] font-body text-text-dim">Conversaciones</p>
                      <p className="text-[13px] font-body font-bold text-text-primary">{m.conversations_handled}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-body text-text-dim">Resp. (s)</p>
                      <p className="text-[13px] font-body font-bold text-text-primary">{m.avg_response_time.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-body text-text-dim">Satisfaccion</p>
                      <p className="text-[13px] font-body font-bold text-status-success">{(m.satisfaction_score * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-body text-text-dim">Resolucion</p>
                      <p className="text-[13px] font-body font-bold text-brand-purple">{(m.resolution_rate * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
