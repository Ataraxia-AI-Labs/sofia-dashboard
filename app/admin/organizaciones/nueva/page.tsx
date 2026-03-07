'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganizationFull, type CreateOrgInput } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { fetchServicesCatalog, fetchBusinessHours, createService, updateBusinessHour } from '@/lib/api'
import type { ServiceCatalog, BusinessHour } from '@/types'
import {
  Building2, User, Stethoscope, Phone, ShoppingBag, Clock, BookOpen,
  ChevronRight, ChevronLeft, Check, AlertTriangle, Loader2,
  Mail, Lock, Eye, EyeOff, Plus, Trash2, Sparkles, MapPin
} from 'lucide-react'

const STEPS = [
  { label: 'Organización', icon: Building2 },
  { label: 'Propietario', icon: User },
  { label: 'Especialidad', icon: Stethoscope },
  { label: 'Servicios', icon: ShoppingBag },
  { label: 'Horarios', icon: Clock },
  { label: 'System Prompt', icon: BookOpen },
  { label: 'Confirmar', icon: Check },
]

const SPECIALTIES = [
  { value: 'estetica', label: 'Estética', desc: 'Botox, ácido hialurónico, lipoescultura, etc.' },
  { value: 'odontologia', label: 'Odontología', desc: 'Ortodoncia, implantes, blanqueamiento, etc.' },
  { value: 'ambas', label: 'Estética + Odontología', desc: 'Clínica integral con ambos servicios' },
  { value: 'general', label: 'Medicina General', desc: 'Consulta general, preventiva, etc.' },
]

const PLANS = [
  { value: 'TRIAL', label: 'Trial', desc: 'Gratis 7 dias — Todas las features Pro sin voz', color: 'border-brand-cyan/30 bg-brand-cyan/5' },
  { value: 'STARTER', label: 'Starter', desc: '$99.000 COP/mes — WhatsApp + Agenda + Dashboard', color: 'border-status-info/30 bg-status-info/5' },
  { value: 'PRO', label: 'Pro', desc: '$299.000 COP/mes — + Voice AI + Bots + Pipeline', color: 'border-brand-purple/30 bg-brand-purple/5' },
  { value: 'BUSINESS', label: 'Business', desc: '$499.000 COP/mes — + Outbound + Revenue Engine', color: 'border-status-success/30 bg-status-success/5' },
  { value: 'ENTERPRISE', label: 'Enterprise', desc: 'Custom — Multi-sede ilimitada, API, Fine-tuning', color: 'border-brand-gold/30 bg-brand-gold/5' },
]

const SERVICE_TEMPLATES: Record<string, { name: string; price: number; duration: number; category: string }[]> = {
  estetica: [
    { name: 'Botox (zona)', price: 800000, duration: 30, category: 'ESTETICA' },
    { name: 'Ácido Hialurónico', price: 1200000, duration: 45, category: 'ESTETICA' },
    { name: 'Limpieza Facial', price: 250000, duration: 60, category: 'ESTETICA' },
    { name: 'Peeling Químico', price: 350000, duration: 45, category: 'ESTETICA' },
    { name: 'Microdermoabrasión', price: 280000, duration: 45, category: 'ESTETICA' },
    { name: 'Lipoescultura (consulta)', price: 0, duration: 45, category: 'CONSULTA' },
    { name: 'Valoración Estética', price: 0, duration: 30, category: 'CONSULTA' },
  ],
  odontologia: [
    { name: 'Limpieza Dental', price: 150000, duration: 45, category: 'ODONTOLOGIA' },
    { name: 'Blanqueamiento', price: 800000, duration: 60, category: 'ODONTOLOGIA' },
    { name: 'Ortodoncia (consulta)', price: 100000, duration: 30, category: 'CONSULTA' },
    { name: 'Resina Estética', price: 200000, duration: 30, category: 'ODONTOLOGIA' },
    { name: 'Extracción Simple', price: 180000, duration: 30, category: 'ODONTOLOGIA' },
    { name: 'Implante Dental', price: 3500000, duration: 90, category: 'ODONTOLOGIA' },
    { name: 'Valoración General', price: 0, duration: 30, category: 'CONSULTA' },
  ],
  ambas: [
    { name: 'Botox (zona)', price: 800000, duration: 30, category: 'ESTETICA' },
    { name: 'Ácido Hialurónico', price: 1200000, duration: 45, category: 'ESTETICA' },
    { name: 'Limpieza Facial', price: 250000, duration: 60, category: 'ESTETICA' },
    { name: 'Limpieza Dental', price: 150000, duration: 45, category: 'ODONTOLOGIA' },
    { name: 'Blanqueamiento', price: 800000, duration: 60, category: 'ODONTOLOGIA' },
    { name: 'Valoración', price: 0, duration: 30, category: 'CONSULTA' },
  ],
  general: [
    { name: 'Consulta General', price: 120000, duration: 30, category: 'CONSULTA' },
    { name: 'Consulta Especializada', price: 200000, duration: 45, category: 'CONSULTA' },
    { name: 'Valoración', price: 0, duration: 30, category: 'CONSULTA' },
  ],
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const DEFAULT_HOURS = [
  { day: 1, open: '08:00', close: '18:00', isOpen: true },
  { day: 2, open: '08:00', close: '18:00', isOpen: true },
  { day: 3, open: '08:00', close: '18:00', isOpen: true },
  { day: 4, open: '08:00', close: '18:00', isOpen: true },
  { day: 5, open: '08:00', close: '18:00', isOpen: true },
  { day: 6, open: '08:00', close: '13:00', isOpen: true },
  { day: 0, open: '00:00', close: '00:00', isOpen: false },
]

function generatePreviewPrompt(name: string, specialty: string): string {
  const map: Record<string, string> = {
    estetica: 'estética (botox, ácido hialurónico, lipoescultura, etc.)',
    odontologia: 'odontología (ortodoncia, implantes, blanqueamiento, etc.)',
    ambas: 'estética y odontología',
    general: 'servicios médicos generales',
  }
  const desc = map[specialty] || specialty
  return `Eres SofIA, la asistente virtual inteligente de ${name}, una clínica especializada en ${desc}.

PERSONALIDAD:
- Eres amable, profesional y empática
- Hablas en español colombiano (pero sin exceso de modismos)
- Tuteas a los pacientes
- Eres proactiva: si el paciente pregunta por un servicio, ofreces agendar cita

REGLAS:
- SIEMPRE consulta los horarios disponibles antes de sugerir una cita
- SIEMPRE confirma el servicio, fecha y hora antes de agendar
- Si no sabes algo, dilo honestamente y ofrece escalar a un humano
- No inventes precios ni servicios que no estén en el catálogo
- Para urgencias médicas, escala inmediatamente al personal

FLUJO TÍPICO:
1. Saludo cordial
2. Identificar necesidad del paciente
3. Consultar precios/disponibilidad
4. Ofrecer agendar cita
5. Confirmar datos
6. Despedida amable`
}

export default function CreateOrgPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resultOrgId, setResultOrgId] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Wizard services state (before org creation — stored locally, inserted after org creation)
  const [wizardServices, setWizardServices] = useState<{ name: string; price: number; duration: number; category: string }[]>([])
  const [newSvcName, setNewSvcName] = useState('')
  const [newSvcPrice, setNewSvcPrice] = useState('')
  const [newSvcDuration, setNewSvcDuration] = useState('30')
  const [newSvcCategory, setNewSvcCategory] = useState('GENERAL')

  // Wizard hours state (before org creation — edit locally, applied after)
  const [wizardHours, setWizardHours] = useState(DEFAULT_HOURS)

  // System prompt preview
  const [promptPreview, setPromptPreview] = useState('')

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

  // Auto-load service templates when specialty changes
  useEffect(() => {
    if (wizardServices.length === 0) {
      const templates = SERVICE_TEMPLATES[form.specialty] || SERVICE_TEMPLATES.general
      setWizardServices(templates)
    }
  }, [form.specialty])

  // Update prompt preview when name or specialty changes
  useEffect(() => {
    setPromptPreview(generatePreviewPrompt(form.name || 'Tu Clínica', form.specialty))
  }, [form.name, form.specialty])

  const handleLoadTemplates = () => {
    const templates = SERVICE_TEMPLATES[form.specialty] || SERVICE_TEMPLATES.general
    setWizardServices(templates)
  }

  const handleAddLocalService = () => {
    if (!newSvcName) return
    setWizardServices(prev => [...prev, {
      name: newSvcName,
      price: parseInt(newSvcPrice) || 0,
      duration: parseInt(newSvcDuration) || 30,
      category: newSvcCategory,
    }])
    setNewSvcName('')
    setNewSvcPrice('')
  }

  const handleRemoveLocalService = (idx: number) => {
    setWizardServices(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleWizardDay = (dayIdx: number) => {
    setWizardHours(prev => prev.map(h => h.day === dayIdx ? { ...h, isOpen: !h.isOpen } : h))
  }

  const updateWizardHourTime = (dayIdx: number, field: 'open' | 'close', value: string) => {
    setWizardHours(prev => prev.map(h => h.day === dayIdx ? { ...h, [field]: value } : h))
  }

  const canNext = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length >= 3 && !!form.plan
      case 1: return form.owner_email.includes('@') && form.owner_password.length >= 6
      case 2: return !!form.specialty
      case 3: return wizardServices.length > 0
      case 4: return true
      case 5: return promptPreview.length > 50
      case 6: return true
      default: return false
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    try {
      // Step 1: Create org + user + business hours + prompt
      const result = await createOrganizationFull(form)
      const orgId = result.orgId

      // Step 2: Insert wizard services into the new org
      for (const svc of wizardServices) {
        try {
          await createService(orgId, {
            name: svc.name,
            price: svc.price,
            duration_minutes: svc.duration,
            category: svc.category,
          })
        } catch {
          // skip duplicates
        }
      }

      // Step 3: Update business hours to match wizard selection
      const existingHours = await fetchBusinessHours(orgId)
      for (const wh of wizardHours) {
        const existing = existingHours.find((h: { day_of_week: number }) => h.day_of_week === wh.day)
        if (existing) {
          await updateBusinessHour(existing.id, {
            is_open: wh.isOpen,
            open_time: wh.open,
            close_time: wh.close,
          })
        }
      }

      // Step 4: Update system prompt if customized
      if (promptPreview) {
        await supabase
          .from('organizations')
          .update({ system_prompt: promptPreview })
          .eq('id', orgId)
      }

      setResultOrgId(orgId)
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
            <strong>{form.name}</strong> está lista con {wizardServices.length} servicios configurados. El propietario puede iniciar sesión en <strong>{form.owner_email}</strong>.
          </p>
          <div className="glass-card p-4 mb-6 text-left text-xs space-y-1">
            <div className="flex justify-between py-1"><span className="text-text-dim">Org ID:</span><span className="font-mono text-text-muted">{resultOrgId}</span></div>
            <div className="flex justify-between py-1"><span className="text-text-dim">Plan:</span><span className="text-text-muted">{form.plan}</span></div>
            <div className="flex justify-between py-1"><span className="text-text-dim">Servicios:</span><span className="text-text-muted">{wizardServices.length}</span></div>
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
        <p className="text-text-dim text-xs mt-0.5">Wizard de 7 pasos — nivel enterprise</p>
      </div>

      {/* STEP INDICATOR */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all w-full ${
                  isActive ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                  : isDone ? 'bg-status-success/10 text-status-success border border-status-success/20 cursor-pointer'
                  : 'bg-surface-2 text-text-dim border border-border'
                }`}
              >
                {isDone ? <Check size={10} /> : <Icon size={10} />}
                <span className="hidden lg:inline truncate">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={12} className="text-text-dim mx-0.5 flex-shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* STEP CONTENT */}
      <div className="glass-card p-6 animate-fade-in">
        {/* Step 0: Organization Name & Plan */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre de la Clínica *</label>
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Clínica Estética Bella Vida" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Plan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLANS.map(p => (
                  <button key={p.value} onClick={() => updateForm('plan', p.value)} className={`text-left p-3.5 rounded-xl border transition-all ${form.plan === p.value ? p.color + ' ring-1 ring-brand-purple/30' : 'bg-surface-2 border-border hover:border-border-2'}`}>
                    <div className="text-sm font-semibold text-text-primary">{p.label}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Ciudad</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                  <input type="text" value={form.city || ''} onChange={e => updateForm('city', e.target.value)} placeholder="Medellín" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">WhatsApp Phone ID</label>
                <input type="text" value={form.whatsapp_phone_id || ''} onChange={e => updateForm('whatsapp_phone_id', e.target.value)} placeholder="Meta Business Phone ID" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm font-mono outline-none focus:border-brand-purple/40 transition-all" />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Owner Account */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-status-info/5 border border-status-info/15 text-xs text-status-info flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Se creará una cuenta Supabase Auth. El propietario recibirá acceso al dashboard y completará el onboarding.</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre del Propietario</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                <input type="text" value={form.owner_name || ''} onChange={e => updateForm('owner_name', e.target.value)} placeholder="Dr. Juan Pérez" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Email del Propietario *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                <input type="email" value={form.owner_email} onChange={e => updateForm('owner_email', e.target.value)} placeholder="doctor@clinica.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" autoFocus />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Contraseña *</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                <input type={showPw ? 'text' : 'password'} value={form.owner_password} onChange={e => updateForm('owner_password', e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full pl-10 pr-12 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Teléfono</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                  <input type="tel" value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+57 300 123 4567" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Dirección</label>
                <input type="text" value={form.address || ''} onChange={e => updateForm('address', e.target.value)} placeholder="Calle 10 #43-12" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
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
                <button key={s.value} onClick={() => { updateForm('specialty', s.value); setWizardServices(SERVICE_TEMPLATES[s.value] || SERVICE_TEMPLATES.general) }} className={`text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${form.specialty === s.value ? 'bg-brand-purple/10 border-brand-purple/25 ring-1 ring-brand-purple/20' : 'bg-surface-2 border-border hover:border-border-2'}`}>
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

        {/* Step 3: Services with Templates */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-0.5">Catálogo de Servicios</h3>
                <p className="text-xs text-text-dim">Precargados por especialidad. Edita precios y agrega los tuyos.</p>
              </div>
              <button onClick={handleLoadTemplates} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors">
                <Sparkles size={12} /> Recargar templates
              </button>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {wizardServices.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-2 border border-border group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs text-text-primary truncate">{s.name}</span>
                    <span className="text-[10px] text-text-dim px-1.5 py-0.5 rounded bg-surface-3 border border-border">{s.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-muted">{s.price > 0 ? `$${s.price.toLocaleString()}` : 'Gratis'}</span>
                    <span className="text-[10px] text-text-dim">{s.duration}min</span>
                    <button onClick={() => handleRemoveLocalService(i)} className="text-text-dim hover:text-status-danger transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input type="text" value={newSvcName} onChange={e => setNewSvcName(e.target.value)} placeholder="Servicio personalizado" className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs outline-none focus:border-brand-purple/40 transition-all" />
              <input type="number" value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)} placeholder="$ COP" className="w-28 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all" />
              <select value={newSvcCategory} onChange={e => setNewSvcCategory(e.target.value)} className="px-2 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-xs outline-none focus:border-brand-purple/40 transition-all">
                <option value="GENERAL">General</option>
                <option value="ESTETICA">Estética</option>
                <option value="ODONTOLOGIA">Odontología</option>
                <option value="CONSULTA">Consulta</option>
              </select>
              <button onClick={handleAddLocalService} className="px-3 py-2 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Hours Grid */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-0.5">Horarios de Atención</h3>
              <p className="text-xs text-text-dim">SofIA agendará citas dentro de estos horarios</p>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const h = wizardHours.find(wh => wh.day === day)!
                return (
                  <div key={day} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${h.isOpen ? 'bg-surface-2 border-border' : 'bg-surface-3/30 border-border/50'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleWizardDay(day)} className={`w-9 h-5 rounded-full transition-all relative ${h.isOpen ? 'bg-status-success' : 'bg-surface-3'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${h.isOpen ? 'left-4' : 'left-0.5'}`} />
                      </button>
                      <span className={`text-sm font-medium w-28 ${h.isOpen ? 'text-text-primary' : 'text-text-dim'}`}>
                        {DAY_NAMES[day]}
                      </span>
                    </div>
                    {h.isOpen ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={h.open} onChange={e => updateWizardHourTime(day, 'open', e.target.value)} className="px-2 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all" />
                        <span className="text-text-dim text-xs">—</span>
                        <input type="time" value={h.close} onChange={e => updateWizardHourTime(day, 'close', e.target.value)} className="px-2 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all" />
                      </div>
                    ) : (
                      <span className="text-xs text-text-dim">Cerrado</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 5: System Prompt Preview */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-0.5">System Prompt de SofIA</h3>
              <p className="text-xs text-text-dim">Auto-generado. Puedes editarlo ahora o después en el detalle de la org.</p>
            </div>
            <textarea
              value={promptPreview}
              onChange={e => setPromptPreview(e.target.value)}
              rows={16}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-xs font-mono leading-relaxed outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim">{promptPreview.length} caracteres</span>
              <button onClick={() => setPromptPreview(generatePreviewPrompt(form.name || 'Tu Clínica', form.specialty))} className="text-xs text-brand-purple hover:underline">
                Regenerar prompt
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Confirm */}
        {step === 6 && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-text-primary">Resumen de la Organización</h3>
            <div className="space-y-2">
              {[
                { label: 'Nombre', value: form.name },
                { label: 'Plan', value: form.plan },
                { label: 'Especialidad', value: SPECIALTIES.find(s => s.value === form.specialty)?.label || form.specialty },
                { label: 'Propietario', value: `${form.owner_name || ''} (${form.owner_email})` },
                { label: 'Ciudad', value: form.city || '—' },
                { label: 'Servicios', value: `${wizardServices.length} configurados` },
                { label: 'Horarios', value: `${wizardHours.filter(h => h.isOpen).length} días abiertos` },
                { label: 'WhatsApp', value: form.whatsapp_phone_id || 'No configurado' },
                { label: 'System Prompt', value: `${promptPreview.length} caracteres` },
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
                <li>4. Insertar {wizardServices.length} servicios</li>
                <li>5. Configurar horarios ({wizardHours.filter(h => h.isOpen).length} días)</li>
                <li>6. Guardar system prompt personalizado</li>
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
