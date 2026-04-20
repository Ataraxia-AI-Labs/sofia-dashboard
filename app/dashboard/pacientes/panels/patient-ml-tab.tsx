'use client'

import { Brain } from 'lucide-react'
import { formatCOP, formatPercent } from '@/lib/api'
import type { PatientMLFeatures } from '@/types'

interface PatientMLTabProps {
  mlFeatures: PatientMLFeatures | null
}

export function PatientMLTab({ mlFeatures }: PatientMLTabProps) {
  if (!mlFeatures) {
    return <p className="text-[13px] font-body text-text-dim text-center py-8">No hay datos de ML disponibles para este paciente.</p>
  }

  return (
    <div className="glass-card p-4 space-y-4">
      <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
        <Brain size={12} className="text-brand-purple" />
        ML Features
      </h4>

      {/* Engagement */}
      <div>
        <p className="text-[12px] font-body text-text-dim uppercase tracking-wider mb-2">Engagement</p>
        <div className="grid grid-cols-3 gap-2">
          <MLStat label="Interacciones" value={mlFeatures.total_interactions} />
          <MLStat label="Mensajes in" value={mlFeatures.total_inbound} />
          <MLStat label="Mensajes out" value={mlFeatures.total_outbound} />
          <MLStat label="Hora preferida" value={mlFeatures.preferred_hour != null ? `${mlFeatures.preferred_hour}:00` : '\u2014'} />
          <MLStat label="Dia preferido" value={mlFeatures.preferred_day != null ? (['Dom','Lun','Mar','Mie','Jue','Vie','Sab'][mlFeatures.preferred_day] || '\u2014') : '\u2014'} />
          <MLStat label="Dias sin contacto" value={mlFeatures.days_since_last_contact} />
        </div>
      </div>

      {/* Appointments */}
      <div>
        <p className="text-[12px] font-body text-text-dim uppercase tracking-wider mb-2">Citas</p>
        <div className="grid grid-cols-3 gap-2">
          <MLStat label="Total" value={mlFeatures.total_appointments} />
          <MLStat label="Completadas" value={mlFeatures.completed_appointments} color="text-status-success" />
          <MLStat label="Canceladas" value={mlFeatures.cancelled_appointments} color="text-status-danger" />
          <MLStat label="No-Show" value={mlFeatures.no_show_appointments} color="text-status-warning" />
          <MLStat label="Conversion" value={formatPercent((mlFeatures.conversion_rate ?? 0) * 100)} />
          <MLStat label="Asistencia" value={formatPercent((mlFeatures.show_rate ?? 0) * 100)} />
        </div>
      </div>

      {/* Revenue */}
      <div>
        <p className="text-[12px] font-body text-text-dim uppercase tracking-wider mb-2">Revenue</p>
        <div className="grid grid-cols-3 gap-2">
          <MLStat label="Total" value={formatCOP(mlFeatures.total_revenue ?? 0)} color="text-status-success" />
          <MLStat label="Transacciones" value={mlFeatures.total_transactions} />
          <MLStat label="Ticket avg" value={formatCOP(mlFeatures.avg_transaction_value ?? 0)} />
          <MLStat label="LTV" value={formatCOP(mlFeatures.lifetime_value ?? 0)} color="text-brand-purple" />
        </div>
      </div>

      {/* Predictions */}
      <div>
        <p className="text-[12px] font-body text-text-dim uppercase tracking-wider mb-2">Predicciones IA</p>
        <div className="grid grid-cols-2 gap-2">
          <PredictionBar label="Probabilidad Conversion" value={mlFeatures.conversion_probability ?? 0} color="bg-status-success" />
          <PredictionBar label="Riesgo de Churn" value={mlFeatures.churn_probability ?? 0} color="bg-status-danger" />
          <PredictionBar label="Riesgo No-Show" value={mlFeatures.no_show_probability ?? 0} color="bg-status-warning" />
          <PredictionBar label="LTV Predicho" value={(mlFeatures.predicted_ltv ?? 0) > 0 ? Math.min((mlFeatures.predicted_ltv ?? 0) / 5000000, 1) : 0} color="bg-brand-purple" extra={formatCOP(mlFeatures.predicted_ltv ?? 0)} />
        </div>
      </div>

      {/* Sentiment */}
      <div>
        <p className="text-[12px] font-body text-text-dim uppercase tracking-wider mb-2">Sentiment</p>
        <div className="grid grid-cols-3 gap-2">
          <MLStat label="Promedio" value={mlFeatures.avg_sentiment?.toFixed(2)} color={(mlFeatures.avg_sentiment ?? 0) >= 0 ? 'text-status-success' : 'text-status-danger'} />
          <MLStat label="Tendencia" value={mlFeatures.sentiment_trend?.toFixed(2)} color={(mlFeatures.sentiment_trend ?? 0) >= 0 ? 'text-status-success' : 'text-status-danger'} />
          <MLStat label="Quejas" value={mlFeatures.complaint_count} color={(mlFeatures.complaint_count ?? 0) > 0 ? 'text-status-danger' : 'text-text-muted'} />
        </div>
      </div>

      {/* Media usage */}
      <div className="flex gap-2 flex-wrap">
        {mlFeatures.has_sent_audio && <span className="badge badge-info">Audio</span>}
        {mlFeatures.has_sent_image && <span className="badge badge-purple">Imagen</span>}
        {mlFeatures.has_sent_document && <span className="badge badge-warning">Documento</span>}
      </div>
    </div>
  )
}

function MLStat({ label, value, color }: { label: string; value: string | number | null | undefined; color?: string }) {
  return (
    <div className="bg-void/50 rounded-md px-2.5 py-1.5">
      <div className="text-[11px] font-body text-text-dim">{label}</div>
      <div className={`text-xs font-semibold font-body ${color || 'text-text-primary'}`}>{value ?? '\u2014'}</div>
    </div>
  )
}

function PredictionBar({ label, value, color, extra }: { label: string; value: number; color: string; extra?: string }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div className="bg-void/50 rounded-md px-2.5 py-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-body text-text-dim">{label}</span>
        <span className="text-[10px] font-bold font-body text-text-primary">{extra || `${pct}%`}</span>
      </div>
      <div className="h-1.5 bg-surface-3 rounded-md overflow-hidden">
        <div className={`h-full rounded-md ${color} transition-all duration-700`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  )
}
