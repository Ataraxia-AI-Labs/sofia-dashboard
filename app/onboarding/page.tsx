'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { API_URL } from '@/lib/supabase'
import {
  ArrowRight, ArrowLeft, Check, Zap, Clock, CreditCard, MessageSquare,
  Eye, EyeOff, ExternalLink, Shield, Mail, RefreshCw
} from 'lucide-react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

// Cloudflare Turnstile type declarations
declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

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

  // Turnstile CAPTCHA
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetId = useRef<string | null>(null)

  // Email verification flow
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Render Turnstile widget when Step 4 is active
  const renderTurnstile = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return
    // Clean up previous widget if any
    if (turnstileWidgetId.current !== null && window.turnstile) {
      try { window.turnstile.remove(turnstileWidgetId.current) } catch {}
      turnstileWidgetId.current = null
    }
    if (window.turnstile) {
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      })
    }
  }, [])

  useEffect(() => {
    if (step === 4 && TURNSTILE_SITE_KEY) {
      // Small delay to let the DOM render the container
      const t = setTimeout(renderTurnstile, 300)
      return () => clearTimeout(t)
    }
  }, [step, renderTurnstile])

  // Resend verification email
  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return
    setResendLoading(true)
    setResendSuccess(false)
    try {
      const res = await fetch(`${API_URL}/onboarding/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.owner_email }),
      })
      if (res.ok) {
        setResendSuccess(true)
        setResendCooldown(60)
      }
    } catch {
      // Silently fail — user can retry
    }
    setResendLoading(false)
  }

  const passwordsMatch = form.password === form.password_confirm
  const passwordValid = form.password.length >= 8
  // International phone: + followed by 7-15 digits (supports 20+ countries per i18n)
  const phoneValid = /^\+?\d{7,15}$/.test(form.phone.replace(/[\s\-()]/g, ''))

  const canProceed = () => {
    switch (step) {
      case 1: return form.clinic_name && form.specialty
      case 2: return form.owner_name && form.owner_email && form.phone && phoneValid && passwordValid && passwordsMatch
      case 3: return true
      case 4: return acceptTerms && (TURNSTILE_SITE_KEY ? !!turnstileToken : true)
      default: return false
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const payload: Record<string, unknown> = {
        clinic_name: form.clinic_name,
        owner_email: form.owner_email,
        owner_name: form.owner_name,
        password: form.password,
        phone: form.phone,
        city: form.city,
        specialty: form.specialty,
        whatsapp_phone_id: form.whatsapp_phone_id,
        plan: 'TRIAL',
      }

      // Include Turnstile token when CAPTCHA is enabled
      if (TURNSTILE_SITE_KEY && turnstileToken) {
        payload.turnstile_token = turnstileToken
      }

      const res = await fetch(`${API_URL}/onboarding/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data: any
      try {
        data = await res.json()
      } catch {
        setError('Error de conexion con el servidor. Intenta de nuevo.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        const msg = data.detail || data.mensaje || 'Error creando clinica'
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('existe')) {
          setError('Ya existe una cuenta con este email. Intenta iniciar sesion o usa otro email.')
        } else {
          setError(msg)
        }
        setLoading(false)
        // Reset Turnstile on error so user can retry
        if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetId.current !== null) {
          window.turnstile.reset(turnstileWidgetId.current)
          setTurnstileToken('')
        }
        return
      }

      setResult(data)
      setSuccess(true)
      setResendCooldown(60) // Start cooldown immediately after registration
    } catch (e: any) {
      setError(e.message || 'Error de conexion')
    }

    setLoading(false)
  }

  if (success && result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          {/* Envelope icon with animated pulse ring */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-2xl bg-brand-purple/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple-dark flex items-center justify-center">
              <Mail size={36} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-2">Revisa tu correo</h1>
          <p className="text-text-muted mb-2 leading-relaxed">
            Te enviamos un link de verificacion a
          </p>
          <p className="text-brand-purple font-semibold text-sm mb-8 break-all">
            {form.owner_email}
          </p>

          <div className="glass-card p-5 text-left mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail size={14} className="text-brand-purple" />
              </div>
              <div>
                <p className="text-sm text-text-primary font-medium mb-1">Verifica tu email para continuar</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Revisa tu bandeja de entrada (y la carpeta de spam).
                  Haz clic en el link de verificacion para activar tu cuenta y acceder al dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 text-left mb-6">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Tu clinica esta lista</h3>
            <div className="space-y-2">
              <SetupItem done={true} label="Organizacion creada" />
              <SetupItem done={true} label="Horarios configurados (Lun-Sab)" />
              <SetupItem done={true} label={`${result.setup?.services || 0} servicios de ejemplo`} />
              <SetupItem done={result.setup?.whatsapp} label="WhatsApp conectado" />
            </div>
          </div>

          {/* Resend email button */}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="w-full py-3 rounded-xl bg-surface-2 border border-border text-text-muted font-semibold text-sm flex items-center justify-center gap-2 hover:border-brand-purple/30 hover:text-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {resendLoading ? (
              <div className="w-4 h-4 border-2 border-text-dim/30 border-t-text-muted rounded-full animate-spin" />
            ) : (
              <RefreshCw size={14} className={resendSuccess ? 'text-status-success' : ''} />
            )}
            {resendCooldown > 0
              ? `Reenviar email (${resendCooldown}s)`
              : resendSuccess
                ? 'Email reenviado'
                : 'Reenviar email de verificacion'
            }
          </button>

          {resendSuccess && resendCooldown > 0 && (
            <p className="text-xs text-status-success mb-3 flex items-center justify-center gap-1">
              <Check size={12} /> Email de verificacion reenviado exitosamente
            </p>
          )}

          {/* Go to login button */}
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all"
          >
            Ya verifique mi email <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Cloudflare Turnstile script — loaded only when site key is configured */}
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          onLoad={() => {
            // If already on step 4, render immediately
            if (step === 4) renderTurnstile()
          }}
        />
      )}

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
                <label htmlFor="ob-clinic-name" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre de la clínica *</label>
                <input id="ob-clinic-name" type="text" value={form.clinic_name} onChange={(e) => updateForm('clinic_name', e.target.value)} placeholder="Ej: Sonrisa Perfect" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/50" />
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
                <label htmlFor="ob-city" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Ciudad</label>
                <select id="ob-city" value={form.city} onChange={(e) => updateForm('city', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none">
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
                <label htmlFor="ob-owner-name" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Nombre completo *</label>
                <input id="ob-owner-name" type="text" value={form.owner_name} onChange={(e) => updateForm('owner_name', e.target.value)} placeholder="Dr. Juan Pérez" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label htmlFor="ob-email" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Email *</label>
                <input id="ob-email" type="email" value={form.owner_email} onChange={(e) => updateForm('owner_email', e.target.value)} placeholder="juan@clinica.com" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label htmlFor="ob-password" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Contraseña del Dashboard *</label>
                <div className="relative">
                  <input id="ob-password" type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => updateForm('password', e.target.value)} placeholder="Mínimo 8 caracteres" className={`w-full px-4 py-3 pr-12 rounded-xl bg-surface-2 border text-text-primary text-sm outline-none transition-colors ${form.password && !passwordValid ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors" aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password && !passwordValid && (
                  <p className="text-[10px] text-status-danger mt-1">Mínimo 8 caracteres</p>
                )}
              </div>

              <div>
                <label htmlFor="ob-pw-confirm" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Confirmar contraseña *</label>
                <input id="ob-pw-confirm" type={showPw ? 'text' : 'password'} value={form.password_confirm} onChange={(e) => updateForm('password_confirm', e.target.value)} placeholder="Repite la contraseña" className={`w-full px-4 py-3 rounded-xl bg-surface-2 border text-text-primary text-sm outline-none transition-colors ${form.password_confirm && !passwordsMatch ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                {form.password_confirm && !passwordsMatch && (
                  <p className="text-[10px] text-status-danger mt-1">Las contraseñas no coinciden</p>
                )}
                {form.password_confirm && passwordsMatch && passwordValid && (
                  <p className="text-[10px] text-status-success mt-1 flex items-center gap-1"><Check size={10} /> Contraseñas coinciden</p>
                )}
              </div>

              <div>
                <label htmlFor="ob-phone" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">WhatsApp del doctor *</label>
                <input id="ob-phone" type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="+573001234567" className={`w-full px-4 py-3 rounded-xl bg-surface-2 border text-text-primary text-sm font-mono outline-none transition-colors ${form.phone && !phoneValid ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                {form.phone && !phoneValid ? (
                  <p className="text-[10px] text-status-danger mt-1">Formato internacional: codigo de pais + numero (ej: +573001234567)</p>
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
                <p className="text-text-muted text-sm">Conecta el WhatsApp de tu clinica para que SofIA atienda pacientes</p>
              </div>

              {/* Primary: Embedded Signup (post-registration in dashboard) */}
              <div className="glass-card p-5 space-y-3 border-brand-purple/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 flex items-center justify-center">
                    <Zap size={18} className="text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Conexion con un clic</h3>
                    <p className="text-[10px] text-text-dim">Disponible despues del registro, en Ajustes &rarr; Canales</p>
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  Despues de crear tu cuenta, podras conectar WhatsApp, Instagram y Messenger
                  con un solo clic desde el dashboard. Solo necesitas tu cuenta de Meta Business.
                </p>
              </div>

              {/* Secondary: Manual Phone ID (optional, for users who already have it) */}
              <div>
                <label htmlFor="ob-phone-id" className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Phone Number ID (opcional)</label>
                <input id="ob-phone-id" type="text" value={form.whatsapp_phone_id} onChange={(e) => updateForm('whatsapp_phone_id', e.target.value)} placeholder="Ej: 123456789012345" className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/50" />
                <p className="text-[10px] text-text-dim mt-1 flex items-center gap-1">
                  Si ya tienes el Phone ID de Meta Business, puedes ingresarlo ahora
                  <a href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers" target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:text-brand-purple-light inline-flex items-center gap-0.5">
                    Ir a Meta <ExternalLink size={9} />
                  </a>
                </p>
              </div>

              <div className="glass-card p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Shield size={14} className="text-brand-purple mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-text-muted">
                    No te preocupes si no tienes el Phone ID ahora. Puedes conectar WhatsApp en segundos
                    desde <strong>Ajustes &rarr; Canales</strong> despues de iniciar sesion.
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

              {/* Cloudflare Turnstile CAPTCHA */}
              {TURNSTILE_SITE_KEY && (
                <div className="flex justify-center">
                  <div ref={turnstileRef} />
                </div>
              )}

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
