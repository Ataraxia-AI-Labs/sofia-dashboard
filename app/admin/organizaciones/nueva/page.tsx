'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganizationFull, type CreateOrgInput } from '@/lib/admin-api'
import {
  Building2, User, Stethoscope, Phone, MapPin, CreditCard,
  ChevronRight, ChevronLeft, Check, AlertTriangle, Loader2,
  Mail, Lock, Eye, EyeOff
} from 'lucide-react'

const STEPS = [
  { label: 'Organización', icon: Building2 },
  { label: 'Propietario', icon: User },
  { label: 'Especialidad', icon: Stethoscope },
  { label: 'Contacto', icon: Phone },
  { label: 'Confirmar', icon: Check },
]

const SPECIALTIES = [
  { value: 'estetica', label: 'Estética', desc: 'Botox, ácido hialurónico, lipoescultura, etc.' },
  { value: 'odontologia', label: 'Odontología', desc: 'Ortodoncia, implantes, blanqueamiento, etc.' },
  { value: 'ambas', label: 'Estética + Odontología', desc: 'Clínica integral con ambos servicios' },
  { value: 'general', label: 'Medicina General', desc: 'Consulta general, preventiva, etc.' },
]

const PLANS = [
  { value: 'TRIAL', label: 'Trial', desc: 'Gratis 14 días — Ideal para pruebas', color: 'border-brand-cyan/30 bg-brand-cyan/5' },
  { value: 'BASIC', label: 'Starter', desc: '$497K/mes — WhatsApp + Agenda + Dashboard', color: 'border-status-info/30 bg-status-info/5' },
  { value: 'PRO', label: 'Pro', desc: '$997K/mes — Todo Starter + Voice AI + Bots', color: 'border-brand-purple/30 bg-brand-purple/5' },
  { value: 'ENTERPRISE', label: 'Enterprise', desc: 'Custom — Multi-sede, API, White-label', color: 'border-brand-gold/30 bg-brand-gold/5' },
]

export default function CreateOrgPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resultOrgId, setResultOrgId] = useState('')
  const [showPw, setShowPw] = useState(false)

  const [form, setForm] = useState<CreateOrgInput>({
    name: '',
    plan: 'TRIAL',
    specialty: 'estetica',
    owner_email: '',
    owner_password: '',
    owner_name: '',
    whatsapp_phone_id: '',
    city: '',
    address: '',
    phone: '',
  })

  const updateForm = (key: keyof CreateOrgInput, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const canNext = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length >= 3 && !!form.plan
      case 1: return form.owner_email.includes('@') && form.owner_password.length >= 6
      case 2: return !!form.specialty
      case 3: return true
      case 4: return true
      default: return false
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    try {
      const result = await createOrganizationFull(form)
      setResultOrgId(result.orgId)
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    }
    setSaving(false)
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-status-success/10 border border-status-success/20 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-status-success" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Organización Creada</h2>
          <p className="text-text-muted text-sm mb-6">
            <strong>{form.name}</strong> está lista. El propietario puede iniciar sesión en <strong>{form.owner_email}</strong> y completar el onboarding.
          </p>
          <div className="glass-card p-4 mb-6 text-left text-xs">
            <div className="flex justify-between py-1"><span className="text-text-dim">Org ID:</span><span className="font-mono text-text-muted">{resultOrgId}</span></div>
            <div className="flex justify-between py-1"><span className="text-text-dim">Plan:</span><span className="text-text-muted">{form.plan}</span></div>
            <div className="flex justify-between py-1"><span className="text-text-dim">Estado:</span><span className="text-status-warning">SETUP (pendiente onboarding)</span></div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push(`/admin/organizaciones/${resultOrgId}`)} className="px-5 py-2.5 rounded-xl bg-brand-purple/15 text-brand-purple font-semibold text-sm hover:bg-brand-purple/25 transition-colors">
              Ver Organización
            </button>
            <button onClick={() => router.push('/admin')} className="px-5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-muted font-semibold text-sm hover:text-text-primary transition-colors">
              Volver al Admin
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Crear Nueva Organización</h2>
        <p className="text-text-dim text-xs mt-0.5">Wizard de onboarding — reemplaza las queries SQL manuales</p>
      </div>

      {/* STEP INDICATOR */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={i} className="flex items-center flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all w-full ${
                  isActive ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                  : isDone ? 'bg-status-success/10 text-status-success border border-status-success/20 cursor-pointer'
                  : 'bg-surface-2 text-text-dim border border-border'
                }`}
              >
                {isDone ? <Check size={12} /> : <Icon size={12} />}
                <span className="hidden sm:inline truncate">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-text-dim mx-0.5 flex-shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* STEP CONTENT */}
      <div className="glass-card p-6">
        {/* Step 0: Organization Name & Plan */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre de la Clínica *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateForm('name', e.target.value)}
                placeholder="Clínica Estética Bella Vida"
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Plan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLANS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => updateForm('plan', p.value)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      form.plan === p.value ? p.color + ' ring-1 ring-brand-purple/30' : 'bg-surface-2 border-border hover:border-border-2'
                    }`}
                  >
                    <div className="text-sm font-semibold text-text-primary">{p.label}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Owner Account */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-status-info/5 border border-status-info/15 text-xs text-status-info flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Se creará una cuenta de Supabase Auth para el propietario. Recibirá acceso al dashboard de clínica.</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre del Propietario</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                <input type="text" value={form.owner_name || ''} onChange={e => updateForm('owner_name', e.target.value)} placeholder="Dr. Juan Pérez" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Email del Propietario *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                <input type="email" value={form.owner_email} onChange={e => updateForm('owner_email', e.target.value)} placeholder="doctor@clinica.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" autoFocus />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Contraseña *</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                <input type={showPw ? 'text' : 'password'} value={form.owner_password} onChange={e => updateForm('owner_password', e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Specialty */}
        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Especialidad de la Clínica</label>
            <div className="grid gap-3">
              {SPECIALTIES.map(s => (
                <button
                  key={s.value}
                  onClick={() => updateForm('specialty', s.value)}
                  className={`text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                    form.specialty === s.value
                      ? 'bg-brand-purple/10 border-brand-purple/25 ring-1 ring-brand-purple/20'
                      : 'bg-surface-2 border-border hover:border-border-2'
                  }`}
                >
                  <Stethoscope size={20} className={form.specialty === s.value ? 'text-brand-purple' : 'text-text-dim'} />
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{s.label}</div>
                    <div className="text-[11px] text-text-muted">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Contact & Location */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-text-dim">Información opcional — se puede completar después en el onboarding.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Ciudad</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                  <input type="text" value={form.city || ''} onChange={e => updateForm('city', e.target.value)} placeholder="Medellín" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Teléfono</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                  <input type="tel" value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+57 300 123 4567" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Dirección</label>
              <input type="text" value={form.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="Calle 10 #43-12, El Poblado" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">WhatsApp Phone ID (Meta Business)</label>
              <input type="text" value={form.whatsapp_phone_id || ''} onChange={e => updateForm('whatsapp_phone_id', e.target.value)} placeholder="Ej: 123456789012345" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm font-mono outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" />
              <p className="text-[10px] text-text-dim mt-1">Se configura después si aún no tienes WhatsApp Business API.</p>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-text-primary">Resumen de la Organización</h3>
            <div className="space-y-2">
              {[
                { label: 'Nombre', value: form.name },
                { label: 'Plan', value: form.plan },
                { label: 'Especialidad', value: SPECIALTIES.find(s => s.value === form.specialty)?.label || form.specialty },
                { label: 'Propietario', value: `${form.owner_name || ''} (${form.owner_email})` },
                { label: 'Ciudad', value: form.city || '—' },
                { label: 'WhatsApp', value: form.whatsapp_phone_id || 'No configurado' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs text-text-dim">{row.label}</span>
                  <span className="text-xs font-medium text-text-primary">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/15 text-xs text-text-muted">
              <strong className="text-brand-purple">Al crear se ejecutará:</strong>
              <ul className="mt-1.5 space-y-0.5 text-text-dim">
                <li>1. Crear usuario en Supabase Auth</li>
                <li>2. Crear organización (status: SETUP)</li>
                <li>3. Asignar rol OWNER al propietario</li>
                <li>4. Crear horarios por defecto (Lun-Vie 8-18, Sáb 8-13)</li>
                <li>5. Generar system prompt personalizado</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step === 0 ? router.back() : setStep(step - 1)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-muted font-semibold text-xs hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={14} />
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-xs hover:shadow-lg hover:shadow-brand-purple/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-status-success to-emerald-600 text-white font-semibold text-xs hover:shadow-lg hover:shadow-status-success/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Creando...' : 'Crear Organización'}
          </button>
        )}
      </div>
    </div>
  )
}
