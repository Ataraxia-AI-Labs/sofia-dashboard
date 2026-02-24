'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '@/lib/supabase'
import {
  ArrowRight, ArrowLeft, Check, Zap, Clock, CreditCard, MessageSquare,
  Eye, EyeOff, ExternalLink, Shield
} from 'lucide-react'

const SPECIALTIES = [
  { value: 'Estética y Odontología', label: 'Estética + Odontología', icon: '🦷✨' },
  { value: 'Odontología', label: 'Odontología', icon: '🦷' },
  { value: 'Estética', label: 'Medicina Estética', icon: '✨' },
  { value: 'Dermatología', label: 'Dermatología', icon: '🧴' },
  { value: 'Cirugía Plástica', label: 'Cirugía Plástica', icon: '🏥' },
  { value: 'General', label: 'Medicina General', icon: '⚕️' },
]

const CITIES = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
  'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Ibagué',
  'Cúcuta', 'Villavicencio', 'Pasto', 'Montería', 'Neiva', 'Otra',
]

type Step = 1 | 2 | 3 | 4

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [result, setResult] = useState<any>(null)

  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({
    clinic_name: '',
    owner_name: '',
    owner_email: '',
    password: '',
    password_confirm: '',
    phone: '',
    city: '',
    specialty: '',
    whatsapp_phone_id: '',
  })

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const [acceptTerms, setAcceptTerms] = useState(false)

  const passwordsMatch = form.password === form.password_confirm
  const passwordValid = form.password.length >= 8
  const phoneValid = /^57\d{10}$/.test(form.phone.replace(/\s/g, ''))

  const canProceed = () => {
    switch (step) {
      case 1: return form.clinic_name && form.specialty
      case 2: return form.owner_name && form.owner_email && form.phone && phoneValid && passwordValid && passwordsMatch
      case 3: return true
      case 4: return acceptTerms
      default: return false
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/onboarding/create-clinic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_name: form.clinic_name,
          owner_email: form.owner_email,
          owner_name: form.owner_name,
          password: form.password,
          phone: form.phone,
          city: form.city,
          specialty: form.specialty,
          whatsapp_phone_id: form.whatsapp_phone_id,
          plan: 'TRIAL',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.detail || data.mensaje || 'Error creando clinica'
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('existe')) {
          setError('Ya existe una cuenta con este email. Intenta iniciar sesion o usa otro email.')
        } else {
          setError(msg)
        }
        setLoading(false)
        return
      }

      setResult(data)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
    }

    setLoading(false)
  }

  if (success && result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-status-success to-status-info flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">¡{form.clinic_name} está lista!</h1>
          <p className="text-text-muted mb-8">SofIA ya puede atender pacientes para tu clínica.</p>

          <div className="glass-card p-6 text-left space-y-3 mb-6">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Setup completado</h3>
            <div className="space-y-2">
              <SetupItem done={true} label="Organización creada" />
              <SetupItem done={true} label="Horarios configurados (Lun-Sáb)" />
              <SetupItem done={true} label={`${result.setup?.services || 0} servicios de ejemplo`} />
              <SetupItem done={result.setup?.whatsapp} label="WhatsApp conectado" />
              <SetupItem done={result.setup?.payments} label="Pagos (Wompi) configurados" />
            </div>
          </div>

          <div className="glass-card p-6 text-left mb-6">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Próximos pasos</h3>
            <div className="space-y-2 text-sm text-text-muted">
              {!result.setup?.whatsapp && <p>1. Conectar WhatsApp Business (Meta Cloud API)</p>}
              <p>{result.setup?.whatsapp ? '1' : '2'}. Personalizar catálogo de servicios y precios</p>
              <p>{result.setup?.whatsapp ? '2' : '3'}. Configurar Wompi para aceptar pagos</p>
              <p>{result.setup?.whatsapp ? '3' : '4'}. Personalizar el system prompt de SofIA</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/login')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            Ir al Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-surface items-center justify-center">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-purple/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-brand-cyan/8 rounded-full blur-[120px]" />

        <div className="relative z-10 px-12 max-w-md">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-text-primary font-display text-xl font-semibold">Ataraxia IA Labs</span>
          </div>

          <h1 className="font-display text-3xl font-bold text-text-primary leading-tight mb-4">
            Configura tu clínica en <span className="gradient-text italic">5 minutos</span>
          </h1>

          <p className="text-text-muted leading-relaxed mb-8">
            SofIA atiende pacientes 24/7 por WhatsApp, agenda citas, cobra anticipos y detecta oportunidades de venta.
          </p>

          <div className="space-y-4">
            {[
              { icon: <MessageSquare size={16} />, text: 'WhatsApp + Instagram + Messenger' },
              { icon: <Clock size={16} />, text: 'Agenda y recordatorios automáticos' },
              { icon: <CreditCard size={16} />, text: 'Cobros con Nequi, PSE, tarjeta' },
              { icon: <Zap size={16} />, text: 'IA que detecta oportunidades de venta' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-text-muted">
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">{item.icon}</div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex gap-2 mb-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-brand-purple' : 'bg-surface-3'}`} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-text-dim px-1">
              {['Clínica', 'Cuenta', 'WhatsApp', 'Confirmar'].map((label, i) => (
                <span key={label} className={i + 1 === step ? 'text-brand-purple font-semibold' : ''}>{label}</span>
              ))}
            </div>
          </div>

          {/* Step 1: Clínica */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-1">Tu clínica</h2>
                <p className="text-text-muted text-sm">Información básica de tu negocio</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre de la clínica *</label>
                <input type="text" value={form.clinic_name} onChange={(e) => updateForm('clinic_name', e.target.value)} placeholder="Ej: Sonrisa Perfect" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Especialidad *</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALTIES.map((s) => (
                    <button key={s.value} onClick={() => updateForm('specialty', s.value)} className={`px-3 py-3 rounded-xl border text-left text-sm transition-all ${form.specialty === s.value ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-border bg-surface-2 text-text-muted hover:border-border-2'}`}>
                      <span className="text-lg mr-2">{s.icon}</span>
                      <span className="text-xs font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Ciudad</label>
                <select value={form.city} onChange={(e) => updateForm('city', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none">
                  <option value="">Seleccionar...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Dueño */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-1">Tu información</h2>
                <p className="text-text-muted text-sm">Datos del administrador de la clínica</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre completo *</label>
                <input type="text" value={form.owner_name} onChange={(e) => updateForm('owner_name', e.target.value)} placeholder="Dr. Juan Pérez" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Email *</label>
                <input type="email" value={form.owner_email} onChange={(e) => updateForm('owner_email', e.target.value)} placeholder="juan@clinica.com" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Contraseña del Dashboard *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => updateForm('password', e.target.value)} placeholder="Mínimo 8 caracteres" className={`w-full px-4 py-3 pr-12 rounded-xl bg-surface-2 border text-text-primary text-sm outline-none transition-colors ${form.password && !passwordValid ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors" aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password && !passwordValid && (
                  <p className="text-[10px] text-status-danger mt-1">Mínimo 8 caracteres</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Confirmar contraseña *</label>
                <input type={showPw ? 'text' : 'password'} value={form.password_confirm} onChange={(e) => updateForm('password_confirm', e.target.value)} placeholder="Repite la contraseña" className={`w-full px-4 py-3 rounded-xl bg-surface-2 border text-text-primary text-sm outline-none transition-colors ${form.password_confirm && !passwordsMatch ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                {form.password_confirm && !passwordsMatch && (
                  <p className="text-[10px] text-status-danger mt-1">Las contraseñas no coinciden</p>
                )}
                {form.password_confirm && passwordsMatch && passwordValid && (
                  <p className="text-[10px] text-status-success mt-1 flex items-center gap-1"><Check size={10} /> Contraseñas coinciden</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">WhatsApp del doctor *</label>
                <input type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="573001234567" className={`w-full px-4 py-3 rounded-xl bg-surface-2 border text-text-primary text-sm font-mono outline-none transition-colors ${form.phone && !phoneValid ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                {form.phone && !phoneValid ? (
                  <p className="text-[10px] text-status-danger mt-1">Formato: 57 + 10 digitos (ej: 573001234567)</p>
                ) : (
                  <p className="text-[10px] text-text-dim mt-1">Aqui SofIA enviara alertas de emergencia y escalamiento</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: WhatsApp */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-1">WhatsApp Business</h2>
                <p className="text-text-muted text-sm">Conecta el WhatsApp de tu clínica (puedes hacerlo después)</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">WhatsApp Phone Number ID</label>
                <input type="text" value={form.whatsapp_phone_id} onChange={(e) => updateForm('whatsapp_phone_id', e.target.value)} placeholder="Ej: 123456789012345" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/50" />
                <p className="text-[10px] text-text-dim mt-1 flex items-center gap-1">
                  Se obtiene de Meta Business &rarr; WhatsApp &rarr; API Setup
                  <a href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers" target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:text-brand-purple-light inline-flex items-center gap-0.5">
                    Ir a Meta <ExternalLink size={9} />
                  </a>
                </p>
              </div>

              <div className="glass-card p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Shield size={14} className="text-brand-purple mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-text-muted">
                    Si no tienes el Phone ID ahora, puedes configurarlo después en <strong>Ajustes</strong>.
                    SofIA empezará a atender apenas lo conectes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmación */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-1">Confirmar setup</h2>
                <p className="text-text-muted text-sm">Revisa que todo esté correcto</p>
              </div>

              <div className="glass-card p-5 space-y-3">
                <ConfirmRow label="Clínica" value={form.clinic_name} />
                <ConfirmRow label="Especialidad" value={form.specialty} />
                <ConfirmRow label="Ciudad" value={form.city || 'No especificada'} />
                <ConfirmRow label="Doctor" value={form.owner_name} />
                <ConfirmRow label="Email" value={form.owner_email} />
                <ConfirmRow label="WhatsApp" value={form.phone} />
                <ConfirmRow label="WA Phone ID" value={form.whatsapp_phone_id || 'Pendiente'} />
              </div>

              <div className="glass-card p-4 border-brand-purple/20">
                <p className="text-xs text-text-muted">
                  Al confirmar se creara: organizacion, horarios (Lun-Sab 8AM-6PM),
                  servicios de ejemplo segun tu especialidad, y el system prompt personalizado para <strong>{form.clinic_name}</strong>.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-brand-purple"
                />
                <span className="text-xs text-text-muted leading-relaxed group-hover:text-text-primary transition-colors">
                  Acepto los terminos de servicio y la politica de privacidad de Ataraxia IA Labs.
                  Los datos de pacientes seran procesados conforme a la regulacion colombiana de proteccion de datos (Ley 1581 de 2012).
                </span>
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button onClick={() => setStep((step - 1) as Step)} className="px-5 py-3 rounded-xl bg-surface-2 border border-border text-text-muted text-sm font-semibold flex items-center gap-2">
                <ArrowLeft size={16} /> Atrás
              </button>
            )}
            <button
              onClick={() => step < 4 ? setStep((step + 1) as Step) : handleSubmit()}
              disabled={!canProceed() || loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : step < 4 ? (
                <>Siguiente <ArrowRight size={16} /></>
              ) : (
                <>Crear Clínica <Check size={16} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SetupItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-status-success/10 text-status-success' : 'bg-surface-3 text-text-dim'}`}>
        {done ? <Check size={12} /> : <span className="text-[8px]">—</span>}
      </div>
      <span className={`text-sm ${done ? 'text-text-primary' : 'text-text-dim'}`}>{label}</span>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-text-dim">{label}</span>
      <span className="text-sm text-text-primary font-medium">{value}</span>
    </div>
  )
}
