'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { API_URL } from '@/lib/supabase'
import {
  ArrowRight, ArrowLeft, Check, Zap, Clock, CreditCard, MessageSquare,
  Eye, EyeOff, ExternalLink, Shield, Mail, RefreshCw
} from 'lucide-react'
import { AtaraxiaLogo, AtaraxiaLogoCompact } from '@/components/ataraxia-logo'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

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

// --- Portal narrative for each step ---
const STEP_NARRATIVE = [
  {
    title: 'Nombra tu universo',
    sub: 'Cada clínica es un mundo. El tuyo comienza ahora.',
    hint: 'SofIA aprenderá todo sobre tu clínica para atender como si fuera parte de tu equipo.',
  },
  {
    title: 'El comandante',
    sub: 'Cada Nucleus necesita un piloto. Identifícate.',
    hint: 'Estas credenciales te darán acceso al centro de control de tu clínica.',
  },
  {
    title: 'Conecta la señal',
    sub: 'SofIA necesita un canal para hablar con el mundo.',
    hint: 'WhatsApp es el canal principal. Puedes conectar más después.',
  },
  {
    title: 'Activar el portal',
    sub: 'Todo listo. Un clic y tu clínica nunca vuelve a dormir.',
    hint: 'Al confirmar, SofIA comienza a aprender sobre tu clínica.',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [result, setResult] = useState<{ setup?: { services?: number; whatsapp?: boolean }; [key: string]: unknown } | null>(null)
  const [showPw, setShowPw] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // --- Particle field background ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    // Create particles
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.offsetWidth
        if (p.x > canvas.offsetWidth) p.x = 0
        if (p.y < 0) p.y = canvas.offsetHeight
        if (p.y > canvas.offsetHeight) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139, 92, 246, ${p.a})`
        ctx.fill()
      }

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.06 * (1 - dist / 100)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const renderTurnstile = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return
    if (turnstileWidgetId.current !== null && window.turnstile) {
      try { window.turnstile.remove(turnstileWidgetId.current) } catch {}
      turnstileWidgetId.current = null
    }
    if (window.turnstile) {
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        size: 'compact',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      })
    }
  }, [])

  useEffect(() => {
    if (step === 4 && TURNSTILE_SITE_KEY) {
      const t = setTimeout(renderTurnstile, 300)
      return () => clearTimeout(t)
    }
  }, [step, renderTurnstile])

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
      // Silently fail
    }
    setResendLoading(false)
  }

  const passwordsMatch = form.password === form.password_confirm
  const passwordValid = form.password.length >= 8
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

      if (TURNSTILE_SITE_KEY && turnstileToken) {
        payload.turnstile_token = turnstileToken
      }

      // Retry once on network failure (Render free tier cold start can timeout)
      let res: Response
      try {
        res = await fetch(`${API_URL}/onboarding/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {
        // First attempt failed (likely cold start) — wait and retry
        await new Promise(r => setTimeout(r, 3000))
        res = await fetch(`${API_URL}/onboarding/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      let data: Record<string, unknown>
      try {
        data = await res.json()
      } catch {
        setError(
          res.status === 502 || res.status === 503
            ? 'El servidor esta iniciando. Espera 30 segundos e intenta de nuevo.'
            : res.status === 429
            ? 'Demasiados intentos. Espera un minuto e intenta de nuevo.'
            : `Error de conexión con el servidor (${res.status}). Intenta de nuevo.`
        )
        setLoading(false)
        return
      }

      if (!res.ok) {
        const msg = String(data.detail || data.mensaje || 'Error creando clínica')
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('existe')) {
          setError('Ya existe una cuenta con este email. Intenta iniciar sesión o usa otro email.')
        } else {
          setError(msg)
        }
        setLoading(false)
        if (TURNSTILE_SITE_KEY && window.turnstile && turnstileWidgetId.current !== null) {
          window.turnstile.reset(turnstileWidgetId.current)
          setTurnstileToken('')
        }
        return
      }

      setResult(data)
      setSuccess(true)
      setResendCooldown(60)
    } catch (e: unknown) {
      setError(
        'El servidor esta despertando. Espera 30 segundos e intenta de nuevo. ' +
        '(Si el error persiste, contacta soporte)'
      )
    }

    setLoading(false)
  }

  // ======= SUCCESS SCREEN: Email Verification =======
  if (success && result) {
    return (
      <div className="brand min-h-screen bg-void flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }} />

        <div className="max-w-lg w-full text-center relative z-10">
          {/* Animated portal ring */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border border-brand-purple/20 animate-sentient-breathe" />
            <div className="absolute inset-2 rounded-full border border-brand-purple/30 animate-sentient-breathe" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-4 rounded-full bg-brand-purple flex items-center justify-center">
              <Mail size={24} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white font-body mb-2 tracking-tight">Portal activado</h1>
          <p className="text-text-muted text-xs font-body mb-1 leading-relaxed">
            Enviamos un link de verificación a
          </p>
          <p className="text-brand-purple font-semibold text-sm font-body mb-8 break-all">
            {form.owner_email}
          </p>

          {/* Setup status */}
          <div className="bg-surface border border-border rounded-lg p-5 text-left mb-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                <Mail size={12} className="text-brand-purple" />
              </div>
              <div>
                <p className="text-xs text-white font-body font-medium mb-0.5">Verifica tu email para continuar</p>
                <p className="text-[10px] text-text-muted font-body leading-relaxed">
                  Revisa tu bandeja de entrada (y la carpeta de spam).
                  Haz clic en el link para activar tu cuenta.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-[12px] font-body text-text-dim uppercase tracking-wider mb-2 font-medium">Estado del portal</p>
              <div className="space-y-1.5">
                <SetupItem done={true} label="Organizacion creada" />
                <SetupItem done={true} label="Horarios configurados (Lun-Sab)" />
                <SetupItem done={true} label={`${result.setup?.services || 0} servicios de ejemplo`} />
                <SetupItem done={result.setup?.whatsapp ?? false} label="WhatsApp conectado" />
              </div>
            </div>
          </div>

          {/* Resend */}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="w-full py-2.5 rounded-lg bg-surface border border-border text-text-muted font-semibold text-xs font-body flex items-center justify-center gap-2 hover:border-brand-purple/30 hover:text-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-2"
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
                : 'Reenviar email de verificación'
            }
          </button>

          {resendSuccess && resendCooldown > 0 && (
            <p className="text-[10px] text-status-success font-body mb-2 flex items-center justify-center gap-1">
              <Check size={10} /> Email de verificación reenviado exitosamente
            </p>
          )}

          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 rounded-lg bg-brand-purple text-white font-semibold text-xs font-body flex items-center justify-center gap-2 hover:brightness-110 transition-all"
          >
            Ya verifique mi email <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ======= MAIN ONBOARDING FLOW =======
  const narrative = STEP_NARRATIVE[step - 1]
  const depthPercent = (step / 4) * 100

  return (
    <div className="brand min-h-screen bg-void flex relative overflow-hidden pt-12 lg:pt-16">
      {/* Cloudflare Turnstile */}
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          onLoad={() => { if (step === 4) renderTurnstile() }}
        />
      )}

      {/* Particle canvas — full background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      {/* Depth glow — intensifies with each step */}
      <div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000 pointer-events-none"
        style={{
          width: `${300 + depthPercent * 4}px`,
          height: `${300 + depthPercent * 4}px`,
          background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
          opacity: 0.02 + (step * 0.01),
        }}
      />

      {/* ===== LEFT PANEL — Dynamic Portal ===== */}
      <div className="hidden lg:flex lg:w-[42%] relative items-center justify-center">
        <div className="relative z-10 px-12 max-w-md">
          <div className="mb-10">
            <AtaraxiaLogo size={64} />
          </div>

          {/* Step counter */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[12px] font-body text-brand-purple uppercase tracking-widest">
              Paso {step} de 4
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[12px] font-body text-text-dim">
              {Math.round(depthPercent)}%
            </span>
          </div>

          {/* Narrative title — changes per step */}
          <h1
            className="font-body text-3xl font-bold text-white leading-tight mb-3 transition-all duration-500"
            key={`title-${step}`}
            style={{ animation: 'fadeUp 0.4s ease-out' }}
          >
            {narrative.title}
          </h1>

          <p
            className="text-text-secondary text-sm font-body leading-relaxed mb-8"
            key={`sub-${step}`}
            style={{ animation: 'fadeUp 0.5s ease-out' }}
          >
            {narrative.sub}
          </p>

          {/* Portal depth indicator — visual pipeline */}
          <div className="space-y-2">
            {STEP_NARRATIVE.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  i + 1 < step ? 'bg-brand-purple'
                  : i + 1 === step ? 'bg-brand-purple animate-sentient-pulse'
                  : 'bg-border'
                }`} />
                <div className={`h-px flex-1 transition-all duration-500 ${
                  i + 1 <= step ? 'bg-brand-purple/40' : 'bg-border'
                }`} />
                <span className={`text-[12px] font-body transition-colors duration-500 ${
                  i + 1 === step ? 'text-brand-purple' : i + 1 < step ? 'text-text-muted' : 'text-text-dim'
                }`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          {/* Benefit pills — only on step 1 */}
          {step === 1 && (
            <div className="mt-10 space-y-2.5" style={{ animation: 'fadeUp 0.6s ease-out' }}>
              {[
                { icon: <MessageSquare size={13} />, text: 'WhatsApp 24/7 con IA' },
                { icon: <Clock size={13} />, text: 'Agenda automatica' },
                { icon: <CreditCard size={13} />, text: 'Cobros integrados' },
                { icon: <Zap size={13} />, text: 'Deteccion de oportunidades' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-body text-text-muted">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-brand-purple"
                    style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
                    {item.icon}
                  </div>
                  {item.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT PANEL — Form ===== */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile: step counter + narrative */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AtaraxiaLogoCompact size={24} />
              <span className="text-[12px] font-body text-text-dim uppercase tracking-widest">
                Paso {step}/4
              </span>
            </div>
            <h2 className="text-lg font-mono font-bold text-white">{narrative.title}</h2>
            <p className="text-text-muted text-xs font-body">{narrative.sub}</p>
          </div>

          {/* Progress pipeline */}
          <div className="mb-6">
            <div className="flex gap-1 mb-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className="flex-1 h-0.5 rounded-full transition-all duration-500"
                  style={{
                    background: s <= step
                      ? '#8B5CF6'
                      : 'rgba(26, 26, 46, 1)',
                    boxShadow: s === step ? '0 0 8px rgba(139, 92, 246, 0.3)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ---- Step 1: Clinic ---- */}
          {step === 1 && (
            <div className="space-y-4" key="step1" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              <div>
                <label htmlFor="ob-clinic-name" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">Nombre de la clínica *</label>
                <input
                  id="ob-clinic-name"
                  type="text"
                  value={form.clinic_name}
                  onChange={(e) => updateForm('clinic_name', e.target.value)}
                  placeholder="Ej: Sonrisa Perfect"
                  className="w-full px-3 py-2.5 rounded-md bg-surface border border-border text-white text-xs font-body outline-none focus:border-brand-purple/50 transition-colors placeholder:text-text-dim"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">Especialidad *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateForm('specialty', s.value)}
                      className={`px-2.5 py-2.5 rounded-md border text-left text-xs font-body transition-all ${
                        form.specialty === s.value
                          ? 'border-brand-purple text-brand-purple'
                          : 'border-border bg-surface text-text-muted hover:border-border-2'
                      }`}
                      style={form.specialty === s.value ? { background: 'rgba(139, 92, 246, 0.08)' } : {}}
                    >
                      <span className="text-base mr-1" aria-hidden="true">{s.icon}</span>
                      <span className="text-[10px] font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="ob-city" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">Ciudad</label>
                <select
                  id="ob-city"
                  value={form.city}
                  onChange={(e) => updateForm('city', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-surface border border-border text-white text-xs font-body outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ---- Step 2: Owner ---- */}
          {step === 2 && (
            <div className="space-y-4" key="step2" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              <div>
                <label htmlFor="ob-owner-name" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">Nombre completo *</label>
                <input
                  id="ob-owner-name"
                  type="text"
                  value={form.owner_name}
                  onChange={(e) => updateForm('owner_name', e.target.value)}
                  placeholder="Dr. Juan Perez"
                  className="w-full px-3 py-2.5 rounded-md bg-surface border border-border text-white text-xs font-body outline-none focus:border-brand-purple/50 transition-colors placeholder:text-text-dim"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="ob-email" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">Email *</label>
                <input
                  id="ob-email"
                  type="email"
                  value={form.owner_email}
                  onChange={(e) => updateForm('owner_email', e.target.value)}
                  placeholder="juan@clinica.com"
                  className="w-full px-3 py-2.5 rounded-md bg-surface border border-border text-white text-xs font-body outline-none focus:border-brand-purple/50 transition-colors placeholder:text-text-dim"
                />
              </div>

              <div>
                <label htmlFor="ob-password" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">Contraseña del Dashboard *</label>
                <div className="relative">
                  <input
                    id="ob-password"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="Minimo 8 caracteres"
                    className={`w-full px-3 py-2.5 pr-10 rounded-md bg-surface border text-white text-xs font-body outline-none transition-colors placeholder:text-text-dim ${
                      form.password && !passwordValid ? 'border-status-danger/40' : 'border-border focus:border-brand-purple/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                    aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.password && !passwordValid && (
                  <p className="text-[12px] font-body text-status-danger mt-0.5">Minimo 8 caracteres</p>
                )}
              </div>

              <div>
                <label htmlFor="ob-pw-confirm" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">Confirmar contraseña *</label>
                <input
                  id="ob-pw-confirm"
                  type={showPw ? 'text' : 'password'}
                  value={form.password_confirm}
                  onChange={(e) => updateForm('password_confirm', e.target.value)}
                  placeholder="Repite la contraseña"
                  className={`w-full px-3 py-2.5 rounded-md bg-surface border text-white text-xs font-body outline-none transition-colors placeholder:text-text-dim ${
                    form.password_confirm && !passwordsMatch ? 'border-status-danger/40' : 'border-border focus:border-brand-purple/50'
                  }`}
                />
                {form.password_confirm && !passwordsMatch && (
                  <p className="text-[12px] font-body text-status-danger mt-0.5">Las contraseñas no coinciden</p>
                )}
                {form.password_confirm && passwordsMatch && passwordValid && (
                  <p className="text-[12px] font-body text-status-success mt-0.5 flex items-center gap-1"><Check size={10} /> Contraseñas coinciden</p>
                )}
              </div>

              <div>
                <label htmlFor="ob-phone" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">WhatsApp del doctor *</label>
                <input
                  id="ob-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="+573001234567"
                  className={`w-full px-3 py-2.5 rounded-md bg-surface border text-white text-xs font-body outline-none transition-colors placeholder:text-text-dim ${
                    form.phone && !phoneValid ? 'border-status-danger/40' : 'border-border focus:border-brand-purple/50'
                  }`}
                />
                {form.phone && !phoneValid ? (
                  <p className="text-[12px] font-body text-status-danger mt-0.5">Formato: código de país + número (ej: +573001234567)</p>
                ) : (
                  <p className="text-[12px] font-body text-text-dim mt-0.5">SofIA enviara alertas de emergencia aqui</p>
                )}
              </div>
            </div>
          )}

          {/* ---- Step 3: WhatsApp ---- */}
          {step === 3 && (
            <div className="space-y-4" key="step3" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              {/* Quick connect info */}
              <div className="bg-surface border border-border rounded-md p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
                    <Zap size={14} className="text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-xs font-body font-semibold text-white">Conexión con un clic</h3>
                    <p className="text-[12px] font-body text-text-dim">Disponible en Ajustes &rarr; Canales</p>
                  </div>
                </div>
                <p className="text-[12px] font-body text-text-muted leading-relaxed">
                  Despues de crear tu cuenta, podras conectar WhatsApp, Instagram y Messenger
                  con un solo clic desde el dashboard.
                </p>
              </div>

              {/* Manual phone ID */}
              <div>
                <label htmlFor="ob-phone-id" className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">ID de numero de WhatsApp (opcional)</label>
                <input
                  id="ob-phone-id"
                  type="text"
                  value={form.whatsapp_phone_id}
                  onChange={(e) => updateForm('whatsapp_phone_id', e.target.value)}
                  placeholder="Ej: 123456789012345"
                  className="w-full px-3 py-2.5 rounded-md bg-surface border border-border text-white text-xs font-body outline-none focus:border-brand-purple/50 transition-colors placeholder:text-text-dim"
                />
                <p className="text-[12px] font-body text-text-dim mt-0.5 flex items-center gap-1">
                  Si ya tienes el ID de tu numero en Meta Business
                  <a href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers" target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:brightness-125 inline-flex items-center gap-0.5">
                    Ir a Meta <ExternalLink size={9} />
                  </a>
                </p>
              </div>

              <div className="bg-surface border border-border rounded-md p-4">
                <div className="flex items-start gap-2">
                  <Shield size={12} className="text-brand-purple mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] font-body text-text-muted leading-relaxed">
                    Puedes configurar WhatsApp en cualquier momento desde
                    <strong className="text-text-primary"> Control &rarr; Canales</strong>.
                    SofIA estará lista cuando tú lo estés.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---- Step 4: Confirm ---- */}
          {step === 4 && (
            <div className="space-y-4" key="step4" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              {/* Summary */}
              <div className="bg-surface border border-border rounded-md p-4 space-y-2">
                <ConfirmRow label="Clínica" value={form.clinic_name} />
                <ConfirmRow label="Especialidad" value={form.specialty} />
                <ConfirmRow label="Ciudad" value={form.city || '—'} />
                <ConfirmRow label="Comandante" value={form.owner_name} />
                <ConfirmRow label="Email" value={form.owner_email} />
                <ConfirmRow label="WhatsApp" value={form.phone} />
                <ConfirmRow label="ID de numero WhatsApp" value={form.whatsapp_phone_id || 'Pendiente'} />
              </div>

              <div className="bg-surface border border-border rounded-md p-4">
                <p className="text-[12px] font-body text-text-muted leading-relaxed">
                  Al confirmar se creara: organizacion, horarios (Lun-Sab 8AM-6PM),
                  servicios de ejemplo, y el prompt personalizado para <strong className="text-white">{form.clinic_name}</strong>.
                </p>
              </div>

              {/* Turnstile */}
              {TURNSTILE_SITE_KEY && (
                <div className="flex justify-center">
                  <div ref={turnstileRef} />
                </div>
              )}

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-brand-purple"
                />
                <span className="text-[12px] font-body text-text-muted leading-relaxed group-hover:text-text-primary transition-colors">
                  Acepto los terminos de servicio y la politica de privacidad.
                  Datos procesados conforme a Ley 1581 de 2012.
                </span>
              </label>
            </div>
          )}

          {/* Hint text */}
          <p className="text-[12px] font-body text-text-dim mt-4 leading-relaxed italic">
            {narrative.hint}
          </p>

          {/* Error */}
          {error && (
            <div className="mt-3 px-3 py-2.5 rounded-md bg-surface border border-status-danger/20 text-status-danger text-xs font-body"
              style={{ background: 'rgba(239, 68, 68, 0.06)' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as Step)}
                className="px-4 py-2.5 rounded-md bg-surface border border-border text-text-muted text-xs font-body font-semibold flex items-center gap-2 hover:border-brand-purple/20 transition-colors"
              >
                <ArrowLeft size={14} /> Atras
              </button>
            )}
            <button
              onClick={() => step < 4 ? setStep((step + 1) as Step) : handleSubmit()}
              disabled={!canProceed() || loading}
              className="flex-1 py-2.5 rounded-md bg-brand-purple text-white font-semibold text-xs font-body flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : step < 4 ? (
                <>Siguiente <ArrowRight size={14} /></>
              ) : (
                <>Activar Portal <Check size={14} /></>
              )}
            </button>
          </div>

          {/* Footer */}
          <p className="text-[11px] font-body text-text-dim text-center mt-8">
            Ya tienes cuenta?{' '}
            <a href="/login" className="text-brand-purple hover:brightness-125 transition-colors">
              Iniciar sesion
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function SetupItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
        done ? 'text-status-success' : 'bg-surface-3 text-text-dim'
      }`} style={done ? { background: 'rgba(6, 214, 160, 0.1)' } : {}}>
        {done ? <Check size={10} /> : <span className="text-[8px]">—</span>}
      </div>
      <span className={`text-xs font-body ${done ? 'text-white' : 'text-text-dim'}`}>{label}</span>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] font-body text-text-dim uppercase tracking-wider">{label}</span>
      <span className="text-xs font-body text-white font-medium">{value}</span>
    </div>
  )
}
