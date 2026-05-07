'use client'

import {
  Activity, Calendar, DollarSign, Heart, Music, Image as ImageIcon, FileText,
} from 'lucide-react'
import { formatCOP, formatPercent } from '@/lib/api'
import type { PatientMLFeatures } from '@/types'

interface PatientMLTabProps {
  mlFeatures: PatientMLFeatures | null
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function PatientMLTab({ mlFeatures }: PatientMLTabProps) {
  if (!mlFeatures) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-[13px] font-body text-text-dim">
          No hay datos de ML disponibles para este paciente todavía.
        </p>
        <p className="text-[11px] font-body text-text-dim mt-1">
          Las features se computan tras la primera interacción.
        </p>
      </div>
    )
  }

  // S153: only show day/hour preference when the patient has actually
  // had interactions. Otherwise both fields fall to their stored
  // defaults (12:00 / Tuesday) and read like real preferences instead
  // of "we never collected this."
  const hasEngagement = (mlFeatures.total_interactions ?? 0) > 0
  const hasAppointments = (mlFeatures.total_appointments ?? 0) > 0
  const hasRevenue = (mlFeatures.total_transactions ?? 0) > 0
  const hasSentiment = Math.abs(mlFeatures.avg_sentiment ?? 0) > 0 ||
    Math.abs(mlFeatures.sentiment_trend ?? 0) > 0 ||
    (mlFeatures.complaint_count ?? 0) > 0

  return (
    <div className="space-y-3">
      {/* === Engagement === */}
      <Section
        icon={<Activity size={13} />}
        title="Engagement"
        accent="text-brand-purple"
        empty={!hasEngagement}
        emptyHint="Sin mensajes registrados aún"
      >
        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="Interacciones" value={mlFeatures.total_interactions} />
          <Stat
            label="Inbound"
            value={mlFeatures.total_inbound}
            color={(mlFeatures.total_inbound ?? 0) > 0 ? 'text-status-success' : undefined}
          />
          <Stat
            label="Outbound"
            value={mlFeatures.total_outbound}
            color={(mlFeatures.total_outbound ?? 0) > 0 ? 'text-brand-purple' : undefined}
          />
          <Stat
            label="Hora preferida"
            value={hasEngagement && mlFeatures.preferred_hour != null
              ? `${String(mlFeatures.preferred_hour).padStart(2, '0')}:00`
              : null}
          />
          <Stat
            label="Día preferido"
            value={hasEngagement && mlFeatures.preferred_day != null
              ? DAY_LABELS[mlFeatures.preferred_day] ?? null
              : null}
          />
          <Stat
            label="Días sin contacto"
            value={mlFeatures.days_since_last_contact}
            color={(mlFeatures.days_since_last_contact ?? 0) > 30
              ? 'text-status-danger'
              : (mlFeatures.days_since_last_contact ?? 0) > 14
                ? 'text-status-warning'
                : undefined}
          />
        </div>
      </Section>

      {/* === Sentimiento === */}
      <Section
        icon={<Heart size={13} />}
        title="Sentimiento"
        accent="text-brand-cyan"
        empty={!hasSentiment}
        emptyHint="Aún no hay señal emocional medible"
      >
        <div className="grid grid-cols-3 gap-1.5">
          <Stat
            label="Promedio"
            value={hasSentiment ? mlFeatures.avg_sentiment?.toFixed(2) : null}
            color={(mlFeatures.avg_sentiment ?? 0) >= 0.2
              ? 'text-status-success'
              : (mlFeatures.avg_sentiment ?? 0) <= -0.2
                ? 'text-status-danger'
                : undefined}
          />
          <Stat
            label="Tendencia"
            value={hasSentiment ? mlFeatures.sentiment_trend?.toFixed(2) : null}
            color={(mlFeatures.sentiment_trend ?? 0) > 0
              ? 'text-status-success'
              : (mlFeatures.sentiment_trend ?? 0) < 0
                ? 'text-status-danger'
                : undefined}
          />
          <Stat
            label="Quejas"
            value={mlFeatures.complaint_count}
            color={(mlFeatures.complaint_count ?? 0) > 0 ? 'text-status-danger' : undefined}
          />
        </div>
      </Section>

      {/* === Citas === */}
      <Section
        icon={<Calendar size={13} />}
        title="Citas"
        accent="text-brand-gold"
        empty={!hasAppointments}
        emptyHint="Sin citas todavía"
      >
        <div className="grid grid-cols-3 gap-1.5">
          <Stat label="Total" value={mlFeatures.total_appointments} />
          <Stat
            label="Completadas"
            value={mlFeatures.completed_appointments}
            color={(mlFeatures.completed_appointments ?? 0) > 0 ? 'text-status-success' : undefined}
          />
          <Stat
            label="Canceladas"
            value={mlFeatures.cancelled_appointments}
            color={(mlFeatures.cancelled_appointments ?? 0) > 0 ? 'text-status-danger' : undefined}
          />
          <Stat
            label="No-show"
            value={mlFeatures.no_show_appointments}
            color={(mlFeatures.no_show_appointments ?? 0) > 0 ? 'text-status-warning' : undefined}
          />
          <Stat
            label="Conversión"
            value={hasAppointments
              ? formatPercent((mlFeatures.conversion_rate ?? 0) * 100)
              : null}
          />
          <Stat
            label="Asistencia"
            value={hasAppointments
              ? formatPercent((mlFeatures.show_rate ?? 0) * 100)
              : null}
          />
        </div>
      </Section>

      {/* === Revenue (histórico) === */}
      <Section
        icon={<DollarSign size={13} />}
        title="Revenue histórico"
        accent="text-status-success"
        empty={!hasRevenue}
        emptyHint="Sin pagos registrados"
        hint="Estos números son revenue real cobrado, no LTV predicho. La predicción está en el tab Info bajo «Lectura del paciente»."
      >
        <div className="grid grid-cols-2 gap-1.5">
          <Stat
            label="Total cobrado"
            value={hasRevenue ? formatCOP(mlFeatures.total_revenue ?? 0) : null}
            color="text-status-success"
          />
          <Stat label="Transacciones" value={mlFeatures.total_transactions} />
          <Stat
            label="Ticket promedio"
            value={hasRevenue ? formatCOP(mlFeatures.avg_transaction_value ?? 0) : null}
          />
          <Stat
            label="LTV histórico"
            value={hasRevenue ? formatCOP(mlFeatures.lifetime_value ?? 0) : null}
            color="text-brand-purple"
          />
        </div>
      </Section>

      {/* === Media enviada === */}
      {(mlFeatures.has_sent_audio || mlFeatures.has_sent_image || mlFeatures.has_sent_document) && (
        <Section
          icon={<Music size={13} />}
          title="Media enviada"
          accent="text-status-info"
        >
          <div className="flex flex-wrap gap-2">
            {mlFeatures.has_sent_audio && (
              <Badge icon={<Music size={10} />} label="Audio" />
            )}
            {mlFeatures.has_sent_image && (
              <Badge icon={<ImageIcon size={10} />} label="Imagen" />
            )}
            {mlFeatures.has_sent_document && (
              <Badge icon={<FileText size={10} />} label="Documento" />
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({
  icon, title, accent, empty, emptyHint, hint, children,
}: {
  icon: React.ReactNode
  title: string
  accent: string
  empty?: boolean
  emptyHint?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="glass-card overflow-hidden flex">
      <div aria-hidden="true" className="w-0.5 bg-current opacity-30 self-stretch" style={{ flex: '0 0 auto' }} />
      <div className="flex-1 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={`text-[11px] font-body font-semibold uppercase tracking-[0.14em] flex items-center gap-1.5 ${accent}`}>
            <span aria-hidden="true">{icon}</span>
            {title}
          </h4>
          {empty && emptyHint && (
            <span className="text-[10px] font-body text-text-dim italic">{emptyHint}</span>
          )}
        </div>
        {!empty && children}
        {hint && !empty && (
          <p className="text-[10px] font-body text-text-dim leading-snug pt-1">{hint}</p>
        )}
      </div>
    </div>
  )
}

function Stat({
  label, value, color,
}: {
  label: string
  value: string | number | null | undefined
  color?: string
}) {
  const isEmpty = value == null || value === ''
  return (
    <div className="bg-void/40 rounded-md px-2 py-1.5 border border-border/30">
      <div className="text-[10px] font-body text-text-dim leading-tight">{label}</div>
      <div className={`text-[13px] font-mono font-semibold leading-tight mt-0.5 ${
        isEmpty ? 'text-text-dim' : (color || 'text-text-primary')
      }`}>
        {isEmpty ? '—' : value}
      </div>
    </div>
  )
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-status-info/10 border border-status-info/20 text-[10.5px] font-body font-medium text-status-info">
      {icon}
      {label}
    </span>
  )
}
