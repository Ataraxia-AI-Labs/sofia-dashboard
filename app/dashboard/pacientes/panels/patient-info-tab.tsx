'use client'

import { Phone, Mail, MapPin, Calendar, MessageSquare, Star, CreditCard, Cake } from 'lucide-react'
import { formatCOP, formatPercent } from '@/lib/api'
import type { PatientDetail, Treatment } from '@/types'

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
      {/* Contact Info */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Informacion</h4>
        <DetailRow icon={<Phone size={14} />} label="Telefono" value={patient.phone} />
        <DetailRow icon={<Mail size={14} />} label="Email" value={patient.email || '\u2014'} />
        <DetailRow icon={<CreditCard size={14} />} label="Cedula" value={patient.national_id || '\u2014'} />
        <DetailRow icon={<Cake size={14} />} label="Nacimiento" value={computeAge(patient.date_of_birth)} />
        <DetailRow icon={<MapPin size={14} />} label="Ciudad" value={patient.city || 'Por identificar'} />
        <DetailRow icon={<Star size={14} />} label="Interes" value={patient.service_interest || 'Por identificar'} />
        <DetailRow icon={<MessageSquare size={14} />} label="Canal" value={CHANNELS[patient.acquisition_channel]?.label || patient.acquisition_channel} />
        <DetailRow icon={<Calendar size={14} />} label="Registro" value={new Date(patient.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </div>

      {/* Psychometrics */}
      {patient.psychometrics && (
        <div className="glass-card p-4 space-y-3">
          <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Psicometria</h4>
          <div className="grid grid-cols-2 gap-3">
            <MiniMetric label="Nivel de Confianza" value={formatPercent((patient.psychometrics.trust_level || 0) * 100)} color="text-status-success" />
            <MiniMetric label="Riesgo de Churn" value={formatPercent((patient.psychometrics.churn_risk_score || 0) * 100)} color="text-status-danger" />
            <MiniMetric label="Sensibilidad a Precio" value={formatPercent((patient.psychometrics.price_sensitivity || 0) * 100)} color="text-status-warning" />
            <MiniMetric label="LTV Predicho" value={formatCOP(patient.psychometrics.lifetime_value_predicted || 0)} color="text-brand-purple" />
          </div>
        </div>
      )}

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
              <div className="text-[10px] text-text-dim mt-0.5">{new Date(t.start_date).toLocaleDateString('es-CO')} &rarr; {new Date(t.end_date).toLocaleDateString('es-CO')}</div>
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
