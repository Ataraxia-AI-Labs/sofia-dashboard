'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchServicesCatalog, fetchBusinessHours,
  createService, updateBusinessHour, updateOrganization,
} from '@/lib/api'
import type { Organization, ServiceCatalog, BusinessHour } from '@/types'
import {
  Building2, ShoppingBag, Clock, Sparkles,
  ChevronRight, ChevronLeft, Check, Loader2, Plus, Trash2,
  MapPin, Phone as PhoneIcon, Globe
} from 'lucide-react'

const STEPS = [
  { label: 'Tu Clínica', icon: Building2 },
  { label: 'Servicios', icon: ShoppingBag },
  { label: 'Horarios', icon: Clock },
  { label: 'Personalizar', icon: Sparkles },
]

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Profesional', desc: 'Formal pero cercano. Ideal para clínicas premium.' },
  { value: 'casual', label: 'Casual', desc: 'Amigable y relajado. Para clínicas juveniles.' },
  { value: 'paisa', label: 'Paisa', desc: 'Cálido y coloquial. Perfecto para Medellín.' },
  { value: 'neutro', label: 'Neutro', desc: 'Equilibrado. Funciona para cualquier región.' },
]

const SERVICE_TEMPLATES: Record<string, { name: string; price: number; duration: number; category: string }[]> = {
  estetica: [
    { name: 'Botox (zona)', price: 800000, duration: 30, category: 'ESTETICA' },
    { name: 'Ácido Hialurónico', price: 1200000, duration: 45, category: 'ESTETICA' },
    { name: 'Limpieza Facial', price: 250000, duration: 60, category: 'ESTETICA' },
    { name: 'Peeling Químico', price: 350000, duration: 45, category: 'ESTETICA' },
    { name: 'Valoración Estética', price: 0, duration: 30, category: 'CONSULTA' },
  ],
  odontologia: [
    { name: 'Limpieza Dental', price: 150000, duration: 45, category: 'ODONTOLOGIA' },
    { name: 'Blanqueamiento', price: 800000, duration: 60, category: 'ODONTOLOGIA' },
    { name: 'Ortodoncia (consulta)', price: 100000, duration: 30, category: 'CONSULTA' },
    { name: 'Resina Estética', price: 200000, duration: 30, category: 'ODONTOLOGIA' },
    { name: 'Valoración General', price: 0, duration: 30, category: 'CONSULTA' },
  ],
  general: [
    { name: 'Consulta General', price: 120000, duration: 30, category: 'CONSULTA' },
    { name: 'Consulta Especializada', price: 200000, duration: 45, category: 'CONSULTA' },
    { name: 'Valoración', price: 0, duration: 30, category: 'CONSULTA' },
  ],
}

interface Props {
  org: Organization
  orgId: string
  onComplete: () => void
}

export default function OnboardingWizard({ org, orgId, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<ServiceCatalog[]>([])
  const [hours, setHours] = useState<BusinessHour[]>([])

  // Step 1: Clinic details
  const [clinicCity, setClinicCity] = useState((org.config_settings as Record<string, unknown>)?.city as string || '')
  const [clinicAddress, setClinicAddress] = useState((org.config_settings as Record<string, unknown>)?.address as string || '')
  const [clinicPhone, setClinicPhone] = useState((org.config_settings as Record<string, unknown>)?.phone as string || '')

  // Step 2: Services
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newDuration, setNewDuration] = useState('30')
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // Step 4: Personalization
  const [tone, setTone] = useState('profesional')
  const [welcomeMsg, setWelcomeMsg] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  useEffect(() => {
    loadExistingData()
  }, [orgId])

  const loadExistingData = async () => {
    try {
      const [svc, hrs] = await Promise.all([
        fetchServicesCatalog(orgId),
        fetchBusinessHours(orgId),
      ])
      setServices(svc)
      setHours(hrs)
    } catch (e) {
      console.error('Error loading existing data:', e)
    }
  }

  const loadTemplates = async () => {
    if (templatesLoaded || services.length > 0) return
    const specialty = (org.config_settings as Record<string, unknown>)?.specialty as string || 'general'
    const templates = SERVICE_TEMPLATES[specialty] || SERVICE_TEMPLATES.general
    for (const t of templates) {
      try {
        await createService(orgId, { name: t.name, price: t.price, duration_minutes: t.duration, category: t.category })
      } catch {
        // skip if already exists
      }
    }
    setTemplatesLoaded(true)
    await loadExistingData()
  }

  const handleAddService = async () => {
    if (!newName) return
    try {
      await createService(orgId, {
        name: newName,
        price: parseInt(newPrice) || 0,
        duration_minutes: parseInt(newDuration) || 30,
        category: 'GENERAL',
      })
      setNewName('')
      setNewPrice('')
      await loadExistingData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteService = async (id: string) => {
    try {
      await supabase.from('services_catalog').update({ is_active: false }).eq('id', id)
      await loadExistingData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleDay = async (hour: BusinessHour) => {
    try {
      await updateBusinessHour(hour.id, { is_open: !hour.is_open })
      await loadExistingData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateTime = async (hour: BusinessHour, field: 'open_time' | 'close_time', value: string) => {
    try {
      await updateBusinessHour(hour.id, { [field]: value })
      // Update local state immediately for responsive UX
      setHours(prev => prev.map(h =>
        h.id === hour.id ? { ...h, [field]: value } : h
      ))
    } catch (e) {
      console.error(e)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      // Save clinic details
      const config = (org.config_settings as Record<string, unknown>) || {}
      await updateOrganization(orgId, {
        config_settings: {
          ...config,
          city: clinicCity,
          address: clinicAddress,
          phone: clinicPhone,
          tone,
        },
      })

      // Generate and save system prompt
      const prompt = generatePrompt()
      await updateOrganization(orgId, {
        system_prompt: prompt,
        status: 'ACTIVE',
      })

      onComplete()
    } catch (e) {
      console.error('Error completing onboarding:', e)
    }
    setSaving(false)
  }

  const generatePrompt = (): string => {
    const toneMap: Record<string, string> = {
      profesional: 'profesional pero cercana',
      casual: 'amigable y relajada',
      paisa: 'cálida y coloquial, con modismos paisas',
      neutro: 'equilibrada y neutral',
    }
    const toneDesc = toneMap[tone] || 'profesional'
    const specialty = (org.config_settings as Record<string, unknown>)?.specialty as string || 'servicios médicos'

    let prompt = `Eres SofIA, la asistente virtual inteligente de ${org.name}, una clínica especializada en ${specialty}.

PERSONALIDAD:
- Tu comunicación es ${toneDesc}
- Hablas en español colombiano
- Tuteas a los pacientes
- Eres proactiva: si el paciente pregunta por un servicio, ofreces agendar cita`

    if (welcomeMsg) {
      prompt += `\n\nMENSAJE DE BIENVENIDA:\n"${welcomeMsg}"`
    }

    prompt += `\n
REGLAS:
- SIEMPRE consulta los horarios disponibles antes de sugerir una cita
- SIEMPRE confirma el servicio, fecha y hora antes de agendar
- Si no sabes algo, dilo honestamente y ofrece escalar a un humano
- No inventes precios ni servicios que no estén en el catálogo
- Para urgencias médicas, escala inmediatamente al personal`

    if (specialInstructions) {
      prompt += `\n\nINSTRUCCIONES ESPECIALES:\n${specialInstructions}`
    }

    prompt += `\n
FLUJO TÍPICO:
1. Saludo cordial
2. Identificar necesidad del paciente
3. Consultar precios/disponibilidad
4. Ofrecer agendar cita
5. Confirmar datos
6. Despedida amable`

    return prompt
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Configura {org.name}</h1>
          <p className="text-text-muted text-sm mt-1">4 pasos rápidos y SofIA estará lista para atender pacientes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6">
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

        {/* Step content */}
        <div className="glass-card p-6 animate-fade-in">
          {/* Step 0: Clinic Details */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Datos de tu clínica</h3>
                <p className="text-xs text-text-dim">Información básica para que SofIA conozca tu negocio</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Ciudad</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                    <input type="text" value={clinicCity} onChange={e => setClinicCity(e.target.value)} placeholder="Medellín" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Teléfono</label>
                  <div className="relative">
                    <PhoneIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
                    <input type="tel" value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} placeholder="+57 300 123 4567" className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Dirección</label>
                <input type="text" value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} placeholder="Calle 10 #43-12, El Poblado" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 transition-all" />
              </div>
            </div>
          )}

          {/* Step 1: Services */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">Catálogo de Servicios</h3>
                  <p className="text-xs text-text-dim">Los servicios que SofIA ofrecerá a los pacientes</p>
                </div>
                {services.length === 0 && (
                  <button onClick={loadTemplates} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors">
                    <Sparkles size={12} /> Cargar templates
                  </button>
                )}
              </div>

              {/* Service list */}
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-2 border border-border">
                    <div>
                      <span className="text-sm text-text-primary">{s.name}</span>
                      <span className="text-xs text-text-dim ml-2">{s.duration_minutes}min</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-semibold text-text-primary">{s.price > 0 ? `$${s.price.toLocaleString()}` : 'Gratis'}</span>
                      <button onClick={() => handleDeleteService(s.id)} className="text-text-dim hover:text-status-danger transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add service */}
              <div className="flex gap-2">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del servicio" className="flex-1 px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs outline-none focus:border-brand-purple/40 transition-all" />
                <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="$ COP" className="w-28 px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-all" />
                <button onClick={handleAddService} className="w-10 h-10 rounded-lg bg-brand-purple/15 text-brand-purple flex items-center justify-center hover:bg-brand-purple/25 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Hours */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Horarios de Atencion</h3>
                <p className="text-xs text-text-dim">SofIA agendara citas dentro de estos horarios. Ajusta el horario de apertura y cierre de cada dia.</p>
              </div>
              <div className="space-y-2">
                {hours.sort((a, b) => a.day_of_week - b.day_of_week).map(h => (
                  <div
                    key={h.id}
                    className={`p-3 rounded-xl border transition-all ${
                      h.is_open
                        ? 'bg-surface-2 border-border'
                        : 'bg-surface-3/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleDay(h)}
                          className={`w-9 h-5 rounded-full transition-all relative flex-shrink-0 ${
                            h.is_open ? 'bg-status-success' : 'bg-surface-3'
                          }`}
                          aria-label={`${h.is_open ? 'Desactivar' : 'Activar'} ${DAY_NAMES[h.day_of_week]}`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                              h.is_open ? 'left-4' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-sm font-medium w-24 ${
                            h.is_open ? 'text-text-primary' : 'text-text-dim'
                          }`}
                        >
                          {DAY_NAMES[h.day_of_week]}
                        </span>
                      </div>
                      {!h.is_open && (
                        <span className="text-xs text-text-dim">Cerrado</span>
                      )}
                    </div>

                    {/* Time pickers — shown only when day is open */}
                    {h.is_open && (
                      <div className="flex items-center gap-2 mt-3 ml-12 animate-fade-in">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-text-dim uppercase tracking-wider font-medium w-10">Abre</label>
                          <input
                            type="time"
                            value={h.open_time?.slice(0, 5) || '08:00'}
                            onChange={(e) => handleUpdateTime(h, 'open_time', e.target.value + ':00')}
                            className="px-2 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-colors w-[100px]"
                          />
                        </div>
                        <span className="text-text-dim text-xs">—</span>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] text-text-dim uppercase tracking-wider font-medium w-10">Cierra</label>
                          <input
                            type="time"
                            value={h.close_time?.slice(0, 5) || '18:00'}
                            onChange={(e) => handleUpdateTime(h, 'close_time', e.target.value + ':00')}
                            className="px-2 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 transition-colors w-[100px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {hours.length === 0 && (
                  <p className="text-xs text-text-dim text-center py-4">Los horarios se crearan al completar el setup</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Personalization */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Personaliza a SofIA</h3>
                <p className="text-xs text-text-dim">Define cómo se comunica SofIA con tus pacientes</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Tono de comunicación</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONE_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        tone === t.value ? 'bg-brand-purple/10 border-brand-purple/25' : 'bg-surface-2 border-border hover:border-border-2'
                      }`}
                    >
                      <div className={`text-xs font-semibold ${tone === t.value ? 'text-brand-purple' : 'text-text-primary'}`}>{t.label}</div>
                      <div className="text-[10px] text-text-dim mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Mensaje de bienvenida (opcional)</label>
                <textarea
                  value={welcomeMsg}
                  onChange={e => setWelcomeMsg(e.target.value)}
                  rows={2}
                  placeholder="Ej: ¡Hola! Soy SofIA, tu asistente virtual. ¿En qué puedo ayudarte hoy?"
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-xs outline-none focus:border-brand-purple/40 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Instrucciones especiales (opcional)</label>
                <textarea
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ej: No ofrecer descuentos. Siempre mencionar la garantía. Preguntar si es primera vez."
                  className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-xs outline-none focus:border-brand-purple/40 transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-muted font-semibold text-xs hover:text-text-primary transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-xs hover:shadow-lg hover:shadow-brand-purple/20 transition-all"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-status-success to-emerald-600 text-white font-semibold text-xs hover:shadow-lg hover:shadow-status-success/20 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Activando...' : 'Activar SofIA'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
