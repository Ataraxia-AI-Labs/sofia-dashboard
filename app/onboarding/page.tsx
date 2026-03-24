'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { API_URL } from '@/lib/supabase'
import { SofiaLogo } from '@/components/sofia-logo'
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
        // Backend returned non-JSON (likely HTML proxy error from Render)
        setError(
          res.status === 502 || res.status === 503
            ? 'El servidor esta iniciando. Espera 30 segundos e intenta de nuevo.'
            : res.status === 429
            ? 'Demasiados intentos. Espera un minuto e intenta de nuevo.'
            : `Error de conexion con el servidor (${res.status}). Intenta de nuevo.`
        )
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
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          {/* Envelope icon with animated pulse ring */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-lg bg-brand-purple/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-16 h-16 rounded-lg bg-brand-purple flex items-center justify-center">
              <Mail size={28} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-text-primary font-mono mb-1">Revisa tu correo</h1>
          <p className="text-text-muted text-xs font-mono mb-1.5 leading-relaxed">
            Te enviamos un link de verificacion a
          </p>
          <p className="text-brand-purple font-semibold text-xs font-mono mb-6 break-all">
            {form.owner_email}
          </p>

          <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-4 text-left mb-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail size={12} className="text-brand-purple" />
              </div>
              <div>
                <p className="text-xs text-text-primary font-mono font-medium mb-0.5">Verifica tu email para continuar</p>
                <p className="text-[10px] text-text-muted font-mono leading-relaxed">
                  Revisa tu bandeja de entrada (y la carpeta de spam).
                  Haz clic en el link de verificacion para activar tu cuenta y acceder al dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-4 text-left mb-5">
            <h3 className="text-[10px] font-semibold text-text-dim font-mono uppercase tracking-wider mb-2">Tu clinica esta lista</h3>
            <div className="space-y-1.5">
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
            className="w-full py-2.5 rounded-lg bg-surface-2 border border-border text-text-muted font-semibold text-xs font-mono flex items-center justify-center gap-2 hover:border-brand-purple/30 hover:text-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {resendLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-text-dim/30 border-t-text-muted rounded-full animate-spin" />
            ) : (
              <RefreshCw size={12} className={resendSuccess ? 'text-status-success' : ''} />
            )}
            {resendCooldown > 0
              ? `Reenviar email (${resendCooldown}s)`
              : resendSuccess
                ? 'Email reenviado'
                : 'Reenviar email de verificacion'
            }
          </button>

          {resendSuccess && resendCooldown > 0 && (
            <p className="text-[10px] text-status-success font-mono mb-2 flex items-center justify-center gap-1">
              <Check size={10} /> Email de verificacion reenviado exitosamente
            </p>
          )}

          {/* Go to login button */}
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 rounded-lg bg-brand-purple text-white font-semibold text-xs font-mono flex items-center justify-center gap-2 hover:bg-brand-purple-dark transition-colors"
          >
            Ya verifique mi email <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void flex">
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
        <div className="relative z-10 px-10 max-w-md">
          <div className="mb-8">
            <SofiaLogo size="md" variant="full" />
          </div>

          <h1 className="font-display text-3xl font-bold text-text-primary leading-tight mb-3">
            Configura tu clinica en <span className="text-brand-purple italic">5 minutos</span>
          </h1>

          <p className="text-text-muted text-xs font-mono leading-relaxed mb-6">
            SofIA atiende pacientes 24/7 por WhatsApp, agenda citas, cobra anticipos y detecta oportunidades de venta.
          </p>

          <div className="space-y-3">
            {[
              { icon: <MessageSquare size={14} />, text: 'WhatsApp + Instagram + Messenger' },
              { icon: <Clock size={14} />, text: 'Agenda y recordatorios automaticos' },
              { icon: <CreditCard size={14} />, text: 'Cobros con Nequi, PSE, tarjeta' },
              { icon: <Zap size={14} />, text: 'IA que detecta oportunidades de venta' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono text-text-muted">
                <div className="w-7 h-7 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">{item.icon}</div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex gap-1.5 mb-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-brand-purple' : 'bg-surface-3'}`} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-text-dim px-0.5">
              {['Clinica', 'Cuenta', 'WhatsApp', 'Confirmar'].map((label, i) => (
                <span key={label} className={i + 1 === step ? 'text-brand-purple font-semibold' : ''}>{label}</span>
              ))}
            </div>
          </div>

          {/* Step 1: Clinica */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary font-mono mb-0.5">Tu clinica</h2>
                <p className="text-text-muted text-xs font-mono">Informacion basica de tu negocio</p>
              </div>

              <div>
                <label htmlFor="ob-clinic-name" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Nombre de la clinica *</label>
                <input id="ob-clinic-name" type="text" value={form.clinic_name} onChange={(e) => updateForm('clinic_name', e.target.value)} placeholder="Ej: Sonrisa Perfect" className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Especialidad *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SPECIALTIES.map((s) => (
                    <button key={s.value} onClick={() => updateForm('specialty', s.value)} className={`px-2.5 py-2.5 rounded-lg border text-left text-xs font-mono transition-all ${form.specialty === s.value ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-border bg-surface-2 text-text-muted hover:border-border-2'}`}>
                      <span className="text-lg mr-1.5">{s.icon}</span>
                      <span className="text-[10px] font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="ob-city" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Ciudad</label>
                <select id="ob-city" value={form.city} onChange={(e) => updateForm('city', e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none">
                  <option value="">Seleccionar...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Dueno */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary font-mono mb-0.5">Tu informacion</h2>
                <p className="text-text-muted text-xs font-mono">Datos del administrador de la clinica</p>
              </div>

              <div>
                <label htmlFor="ob-owner-name" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Nombre completo *</label>
                <input id="ob-owner-name" type="text" value={form.owner_name} onChange={(e) => updateForm('owner_name', e.target.value)} placeholder="Dr. Juan Perez" className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label htmlFor="ob-email" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Email *</label>
                <input id="ob-email" type="email" value={form.owner_email} onChange={(e) => updateForm('owner_email', e.target.value)} placeholder="juan@clinica.com" className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/50" />
              </div>

              <div>
                <label htmlFor="ob-password" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Contrasena del Dashboard *</label>
                <div className="relative">
                  <input id="ob-password" type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => updateForm('password', e.target.value)} placeholder="Minimo 8 caracteres" className={`w-full px-3 py-2.5 pr-10 rounded-lg bg-surface-2 border text-text-primary text-xs font-mono outline-none transition-colors ${form.password && !passwordValid ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors" aria-label={showPw ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.password && !passwordValid && (
                  <p className="text-[10px] font-mono text-status-danger mt-0.5">Minimo 8 caracteres</p>
                )}
              </div>

              <div>
                <label htmlFor="ob-pw-confirm" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Confirmar contrasena *</label>
                <input id="ob-pw-confirm" type={showPw ? 'text' : 'password'} value={form.password_confirm} onChange={(e) => updateForm('password_confirm', e.target.value)} placeholder="Repite la contrasena" className={`w-full px-3 py-2.5 rounded-lg bg-surface-2 border text-text-primary text-xs font-mono outline-none transition-colors ${form.password_confirm && !passwordsMatch ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                {form.password_confirm && !passwordsMatch && (
                  <p className="text-[10px] font-mono text-status-danger mt-0.5">Las contrasenas no coinciden</p>
                )}
                {form.password_confirm && passwordsMatch && passwordValid && (
                  <p className="text-[10px] font-mono text-status-success mt-0.5 flex items-center gap-1"><Check size={10} /> Contrasenas coinciden</p>
                )}
              </div>

              <div>
                <label htmlFor="ob-phone" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">WhatsApp del doctor *</label>
                <input id="ob-phone" type="tel" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="+573001234567" className={`w-full px-3 py-2.5 rounded-lg bg-surface-2 border text-text-primary text-xs font-mono outline-none transition-colors ${form.phone && !phoneValid ? 'border-status-danger/40 focus:border-status-danger/60' : 'border-border focus:border-brand-purple/50'}`} />
                {form.phone && !phoneValid ? (
                  <p className="text-[10px] font-mono text-status-danger mt-0.5">Formato internacional: codigo de pais + numero (ej: +573001234567)</p>
                ) : (
                  <p className="text-[10px] font-mono text-text-dim mt-0.5">Aqui SofIA enviara alertas de emergencia y escalamiento</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: WhatsApp */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary font-mono mb-0.5">WhatsApp Business</h2>
                <p className="text-text-muted text-xs font-mono">Conecta el WhatsApp de tu clinica para que SofIA atienda pacientes</p>
              </div>

              {/* Primary: Embedded Signup (post-registration in dashboard) */}
              <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                    <Zap size={14} className="text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-semibold text-text-primary">Conexion con un clic</h3>
                    <p className="text-[10px] font-mono text-text-dim">Disponible despues del registro, en Ajustes &rarr; Canales</p>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-text-muted leading-relaxed">
                  Despues de crear tu cuenta, podras conectar WhatsApp, Instagram y Messenger
                  con un solo clic desde el dashboard. Solo necesitas tu cuenta de Meta Business.
                </p>
              </div>

              {/* Secondary: Manual Phone ID (optional) */}
              <div>
                <label htmlFor="ob-phone-id" className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">Phone Number ID (opcional)</label>
                <input id="ob-phone-id" type="text" value={form.whatsapp_phone_id} onChange={(e) => updateForm('whatsapp_phone_id', e.target.value)} placeholder="Ej: 123456789012345" className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/50" />
                <p className="text-[10px] font-mono text-text-dim mt-0.5 flex items-center gap-1">
                  Si ya tienes el Phone ID de Meta Business, puedes ingresarlo ahora
                  <a href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers" target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:text-brand-purple-light inline-flex items-center gap-0.5">
                    Ir a Meta <ExternalLink size={9} />
                  </a>
                </p>
              </div>

              <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-4 space-y-1.5">
                <div className="flex items-start gap-2">
                  <Shield size={12} className="text-brand-purple mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-mono text-text-muted leading-relaxed">
                    No te preocupes si no tienes el Phone ID ahora. Puedes conectar WhatsApp en segundos
                    desde <strong>Ajustes &rarr; Canales</strong> despues de iniciar sesion.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmacion */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-xl font-semibold text-text-primary font-mono mb-0.5">Confirmar setup</h2>
                <p className="text-text-muted text-xs font-mono">Revisa que todo este correcto</p>
              </div>

              <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-4 space-y-2">
                <ConfirmRow label="Clinica" value={form.clinic_name} />
                <ConfirmRow label="Especialidad" value={form.specialty} />
                <ConfirmRow label="Ciudad" value={form.city || 'No especificada'} />
                <ConfirmRow label="Doctor" value={form.owner_name} />
                <ConfirmRow label="Email" value={form.owner_email} />
                <ConfirmRow label="WhatsApp" value={form.phone} />
                <ConfirmRow label="WA Phone ID" value={form.whatsapp_phone_id || 'Pendiente'} />
              </div>

              <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-4">
                <p className="text-[10px] font-mono text-text-muted leading-relaxed">
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
                <span className="text-[10px] font-mono text-text-muted leading-relaxed group-hover:text-text-primary transition-colors">
                  Acepto los terminos de servicio y la politica de privacidad de Ataraxia IA Labs.
                  Los datos de pacientes seran procesados conforme a la regulacion colombiana de proteccion de datos (Ley 1581 de 2012).
                </span>
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 px-3 py-2.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-mono">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => setStep((step - 1) as Step)} className="px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-mono font-semibold flex items-center gap-2">
                <ArrowLeft size={14} /> Atras
              </button>
            )}
            <button
              onClick={() => step < 4 ? setStep((step + 1) as Step) : handleSubmit()}
              disabled={!canProceed() || loading}
              className="flex-1 py-2.5 rounded-lg bg-brand-purple text-white font-semibold text-xs font-mono flex items-center justify-center gap-2 hover:bg-brand-purple-dark transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : step < 4 ? (
                <>Siguiente <ArrowRight size={14} /></>
              ) : (
                <>Crear Clinica <Check size={14} /></>
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
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${done ? 'bg-status-success/10 text-status-success' : 'bg-surface-3 text-text-dim'}`}>
        {done ? <Check size={10} /> : <span className="text-[8px]">—</span>}
      </div>
      <span className={`text-xs font-mono ${done ? 'text-text-primary' : 'text-text-dim'}`}>{label}</span>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono text-text-dim">{label}</span>
      <span className="text-xs font-mono text-text-primary font-medium">{value}</span>
    </div>
  )
}
