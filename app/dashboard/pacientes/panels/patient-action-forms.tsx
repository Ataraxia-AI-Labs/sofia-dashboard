'use client'

import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { PatientDetail } from '@/types'

// ── WhatsApp Send Form ──────────────────────────────────────────────────
interface WhatsAppFormProps {
  patient: PatientDetail
  message: string
  onMessageChange: (v: string) => void
  onSend: () => void
  sending: boolean
}

export function WhatsAppForm({ patient, message, onMessageChange, onSend, sending }: WhatsAppFormProps) {
  const t = useTranslations('patients')
  return (
    <div className="glass-card p-4 space-y-2 border-status-success/20">
      <h4 className="text-xs font-mono font-semibold text-status-success">{t('sendWhatsApp', { name: patient.full_name })}</h4>
      <textarea value={message} onChange={(e) => onMessageChange(e.target.value)} rows={3} placeholder={t('writeMessage')} className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none focus:border-status-success/40 resize-none" />
      <div className="flex justify-end">
        <button onClick={onSend} disabled={sending || !message.trim()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-success/15 text-status-success text-xs font-semibold disabled:opacity-30">
          <Send size={11} /> <span className="font-mono">{sending ? t('sending') : t('send')}</span>
        </button>
      </div>
    </div>
  )
}

// ── Treatment Form ──────────────────────────────────────────────────────
interface TreatmentData {
  treatment_name: string
  medication: string
  dosage: string
  frequency_hours: number
  start_date: string
  end_date: string
  notes: string
}

interface TreatmentFormProps {
  data: TreatmentData
  onChange: (data: TreatmentData) => void
  onSubmit: () => void
  onCancel: () => void
}

export function TreatmentForm({ data, onChange, onSubmit, onCancel }: TreatmentFormProps) {
  const t = useTranslations('patients')
  return (
    <div className="glass-card p-4 space-y-2 border-status-info/20">
      <h4 className="text-xs font-mono font-semibold text-status-info">{t('newTreatment')}</h4>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('treatmentLabel')} *</label><input type="text" value={data.treatment_name} onChange={(e) => onChange({...data, treatment_name: e.target.value})} placeholder="Post-operatorio" className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('medication')} *</label><input type="text" value={data.medication} onChange={(e) => onChange({...data, medication: e.target.value})} placeholder="Ibuprofeno" className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('dosage')}</label><input type="text" value={data.dosage} onChange={(e) => onChange({...data, dosage: e.target.value})} placeholder="400mg" className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('everyHours')}</label><input type="number" value={data.frequency_hours} onChange={(e) => onChange({...data, frequency_hours: Number(e.target.value)})} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('start')}</label><input type="date" value={data.start_date} onChange={(e) => onChange({...data, start_date: e.target.value})} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('end')}</label><input type="date" value={data.end_date} onChange={(e) => onChange({...data, end_date: e.target.value})} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
      </div>
      <input type="text" value={data.notes} onChange={(e) => onChange({...data, notes: e.target.value})} placeholder={t('additionalNotes')} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-2.5 py-1 rounded-md bg-surface-3 text-text-muted text-[10px] font-mono">{t('cancel')}</button>
        <button onClick={onSubmit} disabled={!data.treatment_name || !data.medication} className="px-2.5 py-1 rounded-md bg-status-info/15 text-status-info text-[10px] font-mono font-semibold disabled:opacity-30">{t('createTreatment')}</button>
      </div>
    </div>
  )
}

// ── Edit Patient Form ──────────────────────────────────────────────────
interface EditPatientFormProps {
  patient: PatientDetail
  editData: Partial<PatientDetail>
  onEditChange: (data: Partial<PatientDetail>) => void
  onSave: () => void
  onCancel: () => void
}

export function EditPatientForm({ patient, editData, onEditChange, onSave, onCancel }: EditPatientFormProps) {
  const t = useTranslations('patients')
  return (
    <div className="glass-card p-4 space-y-2 border-brand-purple/20">
      <h4 className="text-xs font-mono font-semibold text-brand-purple">{t('editPatient')}</h4>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('name')}</label><input type="text" defaultValue={patient.full_name} onChange={(e) => onEditChange({...editData, full_name: e.target.value})} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('email')}</label><input type="email" defaultValue={patient.email || ''} onChange={(e) => onEditChange({...editData, email: e.target.value})} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('city')}</label><input type="text" defaultValue={patient.city || ''} onChange={(e) => onEditChange({...editData, city: e.target.value})} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
        <div><label className="block text-[9px] font-mono text-text-dim uppercase mb-0.5">{t('interest')}</label><input type="text" defaultValue={patient.service_interest || ''} onChange={(e) => onEditChange({...editData, service_interest: e.target.value})} className="w-full px-2 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-mono outline-none" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-2.5 py-1 rounded-md bg-surface-3 text-text-muted text-[10px] font-mono">{t('cancel')}</button>
        <button onClick={onSave} className="px-2.5 py-1 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[10px] font-mono font-semibold">{t('save')}</button>
      </div>
    </div>
  )
}
