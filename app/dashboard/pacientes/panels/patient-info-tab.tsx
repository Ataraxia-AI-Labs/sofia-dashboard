'use client'

import { Phone, Mail, MapPin, Calendar, MessageSquare, Star, CreditCard, Cake } from 'lucide-react'
import { formatCOP, formatPercent } from '@/lib/api'
import type { PatientDetail, Treatment } from '@/types'
import { PatientAliasesStrip } from '@/components/patient-aliases-strip'
import { PatientSummaryBlock } from '@/components/patient-summary-block'

function computeAge(dob?: string | null): string {
  if (!dob) return '—'
  try {
    const birth = new Date(dob)
    if (isNaN(birth.getTime())) return '—'
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return `${age} años (${birth.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })})`
  } catch {
    return '—'
  }
}

const CHANNELS: Record<string, { label: string; color: string }> = {
  WHATSAPP: { label: 'WhatsApp', color: 'text-status-success' },
  INSTAGRAM: { label: 'Instagram', color: 'text-brand-purple' },
  MESSENGER: { label: 'Messenger', color: 'text-brand-cyan' },
  WEB: { label: 'Web Chat', color: 'text-status-info' },
  WEBCHAT: { label: 'Web Chat', color: 'text-status-info' },
  VOICE_CALL: { label: 'Voz', color: 'text-brand-gold' },
  VOICE: { label: 'Voz', color: 'text-brand-gold' },
  PRESENCIAL: { label: 'Presencial', color: 'text-brand-gold' },
}

interface PatientInfoTabProps {
  patient: PatientDetail
  treatments: Treatment[]
}

export function PatientInfoTab({ patient, treatments }: PatientInfoTabProps) {
  return (
    <>
      {/* Cross-channel aliases (S100) */}
      <PatientAliasesStrip patientId={patient.id} />

      {/* AI summary (Zombie #5) */}
      <PatientSummaryBlock patientId={patient.id} />

      {/* Contact Info */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Información</h4>
        <DetailRow icon={<Phone size={14} />} label="Teléfono" value={patient.phone} />
        <DetailRow icon={<Mail size={14} />} label="Email" value={patient.email || '\u2014'} />
        <DetailRow icon={<CreditCard size={14} />} label="Cédula" value={patient.national_id || '\u2014'} />
        <DetailRow icon={<Cake size={14} />} label="Nacimiento" value={computeAge(patient.date_of_birth)} />
        <DetailRow icon={<MapPin size={14} />} label="Ciudad" value={patient.city || 'Por identificar'} />
        <DetailRow icon={<Star size={14} />} label="Interés" value={patient.service_interest || 'Por identificar'} />
        <DetailRow icon={<MessageSquare size={14} />} label="Origen" value={CHANNELS[patient.acquisition_channel]?.label || patient.acquisition_channel} />
        {patient.active_channels && patient.active_channels.length > 0 && (
          <DetailRow
            icon={<MessageSquare size={14} />}
            label="Activo en"
            value={patient.active_channels.map(c => CHANNELS[c]?.label || c).join(' · ')}
          />
        )}
        <DetailRow icon={<Calendar size={14} />} label="Registro" value={new Date(patient.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </div>

      {/* Predicción + Psicometría heurística (S153).
          LTV viene del modelo (LtvPredictor). trust/churn/price son
          heurísticos derivados de señales reales (sentiment, recencia,
          show-rate, complaint count, ticket vs avg-org). _source = "heuristic"
          deja claro al operador que NO es ML entrenado todavía — cuando
          el pipeline de ML produzca scores, el predictor sobrescribirá
          estas claves y el badge "heurística" desaparecerá. */}
      {patient.psychometrics ? (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Lectura del paciente</h4>
            {patient.psychometrics._source === 'heuristic' && (
              <span className="text-[9px] font-mono uppercase tracking-wider text-text-dim border border-border rounded px-1.5 py-0.5" title="Estimaciones derivadas de señales reales: engagement, sentimiento, recencia, ticket vs promedio. No es un modelo ML entrenado todavía.">
                heurística
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {patient.psychometrics.lifetime_value_predicted ? (
              <MiniMetric
                label="LTV 12 meses"
                value={formatCOP(patient.psychometrics.lifetime_value_predicted)}
                color="text-brand-purple"
              />
            ) : null}
            {typeof patient.psychometrics.trust_level === 'number' ? (
              <MiniMetric
                label="Confianza"
                value={formatPercent(patient.psychometrics.trust_level * 100)}
                color="text-status-success"
              />
            ) : null}
            {typeof patient.psychometrics.churn_risk_score === 'number' ? (
              <MiniMetric
                label="Riesgo de churn"
                value={formatPercent(patient.psychometrics.churn_risk_score * 100)}
                color={patient.psychometrics.churn_risk_score > 0.5 ? 'text-status-danger' : 'text-status-warning'}
              />
            ) : null}
            {typeof patient.psychometrics.price_sensitivity === 'number' ? (
              <MiniMetric
                label="Sensibilidad a precio"
                value={formatPercent(patient.psychometrics.price_sensitivity * 100)}
                color="text-text-muted"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Treatments */}
      {treatments.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Tratamientos Activos</h4>
          {treatments.map((t) => (
            <div key={t.id} className={`bg-void/50 rounded-lg px-3 py-2 ${t.status !== 'ACTIVE' ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-body font-semibold text-text-primary">{t.treatment_name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.status === 'ACTIVE' ? 'bg-status-success/10 text-status-success' : 'bg-surface-3 text-text-dim'}`}>{t.status}</span>
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">{t.medication} — {t.dosage} — cada {t.frequency_hours}h</div>
              <div className="text-[10px] text-text-dim mt-0.5">{new Date(t.start_date).toLocaleDateString('es-CO')} &rarr; {t.end_date ? new Date(t.end_date).toLocaleDateString('es-CO') : 'sin fin'}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-dim">{icon}</span>
      <span className="text-xs font-body text-text-muted w-20 flex-shrink-0">{label}</span>
      <span className="text-sm font-body text-text-primary truncate">{value}</span>
    </div>
  )
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-3 rounded-md px-3 py-2">
      <div className="text-[12px] font-body text-text-dim mb-0.5">{label}</div>
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}
