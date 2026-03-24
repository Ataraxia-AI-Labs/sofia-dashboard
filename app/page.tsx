'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
// Sentient Eye SVG component
function SentientEye({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.4" />
      <circle cx="24" cy="24" r="6" fill="#8B5CF6" opacity="0.8">
        <animate attributeName="r" values="6;7;6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="24" r="2.5" fill="#F5F3FF" />
    </svg>
  )
}
import {
  ArrowRight, Check, Zap, Clock, Shield, MessageSquare,
  CreditCard, Target, Calendar, TrendingUp, Star,
  ChevronDown, Activity, Users, BarChart3, X
} from 'lucide-react'

// ─── Animated Counter Hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, startOnMount = false) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(startOnMount)

  useEffect(() => {
    if (!started) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [started, target, duration])

  return { count, start: () => setStarted(true) }
}

// ─── Intersection Observer Hook ─────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

// ─── Stat Card with animated counter ─────────────────────────────────────────
function AnimatedStat({ value, suffix, label, delay = 0 }: {
  value: number; suffix: string; label: string; delay?: number
}) {
  const { ref, inView } = useInView(0.3)
  const { count, start } = useCountUp(value, 1600)

  useEffect(() => {
    if (inView) {
      const t = setTimeout(start, delay)
      return () => clearTimeout(t)
    }
  }, [inView, delay, start])

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl lg:text-4xl font-bold font-mono text-brand-purple tabular-nums">
        {count}{suffix}
      </div>
      <div className="text-text-muted text-xs font-mono mt-1.5 leading-snug">{label}</div>
    </div>
  )
}

// ─── Sticky CTA Banner ────────────────────────────────────────────────────────
function StickyTrialBanner() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!dismissed) setVisible(window.scrollY > 600)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [dismissed])

  if (!visible || dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-up">
      <div className="bg-surface/95 backdrop-blur-xl border-t border-brand-purple/30 px-4 py-3 lg:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse flex-shrink-0" />
            <p className="text-text-muted text-xs font-mono truncate">
              <span className="text-text-primary font-semibold">7 dias gratis.</span>{' '}
              Sin tarjeta. Sin compromiso.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/onboarding"
              className="px-5 py-2 rounded-md bg-brand-purple text-white font-semibold text-sm font-mono flex items-center gap-2 hover:bg-brand-purple-dark transition-colors"
            >
              Empezar gratis <ArrowRight size={14} />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-muted transition-colors"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, highlight }: {
  icon: React.ReactNode; title: string; description: string; highlight?: boolean
}) {
  return (
    <div className={`bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-5 hover:border-brand-purple/30 transition-all duration-300 group cursor-default ${highlight ? 'border-brand-purple/25' : ''}`}>
      <div className={`w-10 h-10 rounded-md flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-105 ${highlight ? 'bg-brand-purple/20 text-brand-purple' : 'bg-surface-3 text-text-muted group-hover:bg-brand-purple/10 group-hover:text-brand-purple'}`}>
        {icon}
      </div>
      <h3 className="font-semibold font-mono text-text-primary mb-1.5 text-sm">{title}</h3>
      <p className="text-text-muted text-xs font-mono leading-relaxed">{description}</p>
    </div>
  )
}

// ─── Testimonial Card ────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, role, clinic, stars = 5 }: {
  quote: string; name: string; role: string; clinic: string; stars?: number
}) {
  return (
    <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex gap-1">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} size={12} className="fill-brand-gold text-brand-gold" />
        ))}
      </div>
      <p className="text-text-secondary text-xs font-mono leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <div className="w-8 h-8 rounded-md bg-brand-purple/15 flex items-center justify-center text-brand-purple font-bold text-xs font-mono flex-shrink-0">
          {name[0]}
        </div>
        <div>
          <div className="text-text-primary text-xs font-semibold font-mono">{name}</div>
          <div className="text-text-dim text-[11px] font-mono">{role} &bull; {clinic}</div>
        </div>
      </div>
    </div>
  )
}

// ─── ROI Calculator ─────────────────────────────────────────────────────────
function ROICalculator() {
  const [patients, setPatients] = useState(80)
  const [noshow, setNoshow] = useState(20)
  const [ticket, setTicket] = useState(250000)

  const recoveredRevenue = Math.round(patients * (noshow / 100) * 0.4 * ticket)
  const adminHoursSaved = Math.round(patients * 0.15 * 4)
  const adminCostSaved = adminHoursSaved * 15000
  const totalROI = recoveredRevenue + adminCostSaved
  const roiMultiple = Math.round(totalROI / 997000)

  const fmt = (n: number) =>
    n >= 1000000
      ? `$${(n / 1000000).toFixed(1)}M`
      : `$${(n / 1000).toFixed(0)}K`

  return (
    <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <span className="badge badge-purple mb-3">Calculadora de ROI</span>
        <h3 className="text-xl font-bold font-mono text-text-primary mb-1.5">
          Cuanto pierde tu clinica hoy
        </h3>
        <p className="text-text-muted text-xs font-mono">
          Ajusta los datos de tu clinica y ve el impacto real
        </p>
      </div>

      <div className="space-y-5 mb-6">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-[11px] font-medium font-mono text-text-muted uppercase tracking-wider">
              Pacientes / mes
            </label>
            <span className="text-brand-purple font-bold font-mono text-sm">{patients}</span>
          </div>
          <input
            type="range" min="20" max="500" step="10"
            value={patients} onChange={e => setPatients(+e.target.value)}
            className="w-full accent-brand-purple h-1.5 bg-surface-3 rounded-full cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-[11px] font-medium font-mono text-text-muted uppercase tracking-wider">
              Tasa de no-show
            </label>
            <span className="text-brand-purple font-bold font-mono text-sm">{noshow}%</span>
          </div>
          <input
            type="range" min="5" max="50" step="1"
            value={noshow} onChange={e => setNoshow(+e.target.value)}
            className="w-full accent-brand-purple h-1.5 bg-surface-3 rounded-full cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-[11px] font-medium font-mono text-text-muted uppercase tracking-wider">
              Ticket promedio (COP)
            </label>
            <span className="text-brand-purple font-bold font-mono text-sm">{fmt(ticket)}</span>
          </div>
          <input
            type="range" min="50000" max="2000000" step="50000"
            value={ticket} onChange={e => setTicket(+e.target.value)}
            className="w-full accent-brand-purple h-1.5 bg-surface-3 rounded-full cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface-3 rounded-md p-3 text-center">
          <div className="text-base font-bold font-mono text-brand-purple">{fmt(recoveredRevenue)}</div>
          <div className="text-[10px] font-mono text-text-dim mt-1">Citas recuperadas</div>
        </div>
        <div className="bg-surface-3 rounded-md p-3 text-center">
          <div className="text-base font-bold font-mono text-brand-purple">{fmt(adminCostSaved)}</div>
          <div className="text-[10px] font-mono text-text-dim mt-1">Horas admin liberadas</div>
        </div>
        <div className="bg-surface-3 rounded-md p-3 text-center border border-brand-purple/30">
          <div className="text-base font-bold font-mono text-brand-purple">{fmt(totalROI)}</div>
          <div className="text-[10px] font-mono text-text-dim mt-1">ROI total / mes</div>
        </div>
      </div>

      <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-md p-3 text-center mb-5">
        <p className="text-xs font-mono text-text-muted">
          SofIA te devuelve{' '}
          <span className="text-brand-purple font-bold text-base">{roiMultiple > 0 ? `${roiMultiple}x` : '2x+'}</span>
          {' '}tu inversion cada mes.
          <br />
          <span className="text-text-dim text-[10px]">*Proyeccion basada en promedios del sector en Latinoamerica</span>
        </p>
      </div>

      <Link
        href="/onboarding"
        className="w-full py-3 rounded-md bg-brand-purple text-white font-bold text-sm font-mono flex items-center justify-center gap-2 hover:bg-brand-purple-dark transition-colors"
      >
        Quiero este ROI — Prueba 7 dias gratis <ArrowRight size={16} />
      </Link>
    </div>
  )
}

// ─── Fake WhatsApp Demo ───────────────────────────────────────────────────────
function WhatsAppDemo() {
  const messages = [
    { from: 'patient', text: 'Hola, quiero agendar una limpieza dental para el sabado', time: '10:31 AM' },
    { from: 'sofia', text: 'Hola! Soy SofIA, la asistente de Clinica Sonrisa. Con gusto te ayudo a agendar tu cita.', time: '10:31 AM' },
    { from: 'sofia', text: 'Tengo disponibilidad el sabado 1 de marzo a las 9:00 AM, 11:00 AM o 2:00 PM. Cual prefieres?', time: '10:31 AM' },
    { from: 'patient', text: '11am perfecto', time: '10:32 AM' },
    { from: 'sofia', text: 'Perfecto. Para confirmar necesito un anticipo de $50,000 COP. Te envio el link de pago Nequi:', time: '10:32 AM' },
    { from: 'sofia', text: 'pagos.clinicasonrisa.co/nequi/abc123 — Cita confirmada una vez se realice el pago.', time: '10:32 AM' },
    { from: 'patient', text: 'Listo pague!', time: '10:33 AM' },
    { from: 'sofia', text: 'Pago recibido. Tu cita esta confirmada para el sabado 1 de marzo a las 11:00 AM. Recibirás un recordatorio 24h antes. Nos vemos!', time: '10:33 AM' },
  ]

  const [visibleCount, setVisibleCount] = useState(1)
  const { ref, inView } = useInView(0.3)

  useEffect(() => {
    if (!inView) return
    if (visibleCount < messages.length) {
      const t = setTimeout(() => setVisibleCount(c => c + 1), 500)
      return () => clearTimeout(t)
    }
  }, [inView, visibleCount, messages.length])

  return (
    <div ref={ref} className="max-w-sm mx-auto">
      {/* Phone frame */}
      <div className="bg-[#111B21] rounded-lg border border-border overflow-hidden">
        {/* Status bar */}
        <div className="bg-[#1F2C34] px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center text-white text-xs font-bold font-mono flex-shrink-0">
            CS
          </div>
          <div>
            <div className="text-white text-sm font-semibold">Clinica Sonrisa</div>
            <div className="text-[#8696A0] text-xs flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-status-success" />
              SofIA — en linea
            </div>
          </div>
        </div>
        {/* Chat body */}
        <div className="bg-[#0B141A] p-4 space-y-2 min-h-[380px]">
          {messages.slice(0, visibleCount).map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.from === 'patient' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.from === 'patient'
                  ? 'bg-[#005C4B] text-white rounded-tr-none'
                  : 'bg-[#1F2C34] text-[#E9EDEF] rounded-tl-none'
              }`}>
                {msg.text}
                <div className="text-[#8696A0] text-[9px] mt-1 text-right">{msg.time}</div>
              </div>
            </div>
          ))}
          {visibleCount < messages.length && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-[#1F2C34] rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8696A0]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8696A0]" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8696A0]" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Input bar */}
        <div className="bg-[#1F2C34] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 bg-[#2A3942] rounded-full px-4 py-2 text-[#8696A0] text-xs">
            Escribe un mensaje...
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center">
            <MessageSquare size={14} className="text-white" />
          </div>
        </div>
      </div>
      <p className="text-center text-text-dim text-[11px] font-mono mt-3">
        Conversacion real — SofIA responde en menos de 3 segundos
      </p>
    </div>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setAuthChecked(true)
      }
    })
  }, [router])

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-5">
          <div className="animate-logo-breathe">
            <SentientEye size={40} />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-loader-dot" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-loader-dot" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-loader-dot" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ── ANALYTICS PLACEHOLDER ─────────────────────────────────────────── */}
      {/* TODO: Replace with real GA4/Meta Pixel when credentials are ready */}
      {/* <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" /> */}
      {/* <Script id="meta-pixel" strategy="afterInteractive">...</Script> */}

      <div className="min-h-screen bg-void text-text-primary">

        {/* ── STICKY NAV ─────────────────────────────────────────────────── */}
        <nav className="fixed top-0 left-0 right-0 z-40 bg-void/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SentientEye size={20} />
              <span className="text-xs font-mono font-semibold text-brand-purple tracking-wide">SofIA</span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6 text-xs font-mono text-text-muted">
              <a href="#features" className="hover:text-text-primary transition-colors">Funciones</a>
              <a href="#demo" className="hover:text-text-primary transition-colors">Demo</a>
              <a href="#testimonials" className="hover:text-text-primary transition-colors">Testimonios</a>
              <a href="#pricing" className="hover:text-text-primary transition-colors">Precios</a>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:block text-xs font-mono text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-surface-2"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/onboarding"
                className="px-4 py-2 rounded-md bg-brand-purple text-white font-semibold text-xs font-mono flex items-center gap-1.5 hover:bg-brand-purple-dark transition-colors"
              >
                Prueba Gratis <ArrowRight size={14} />
              </Link>
              {/* Mobile menu toggle */}
              <button
                className="md:hidden w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-surface border-b border-border px-4 py-4 space-y-2 animate-fade-in">
              {['#features', '#demo', '#testimonials', '#pricing'].map((href, i) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-xs font-mono text-text-muted hover:text-text-primary transition-colors"
                >
                  {['Funciones', 'Demo en vivo', 'Testimonios', 'Precios'][i]}
                </a>
              ))}
              <Link href="/login" className="block py-2 text-xs font-mono text-text-muted">
                Iniciar sesion
              </Link>
            </div>
          )}
        </nav>

        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
          {/* Background glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-brand-purple/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-32 right-0 w-72 h-72 bg-brand-cyan/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-purple/4 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">

              {/* Urgency badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-xs font-mono font-medium mb-6 animate-fade-in">
                <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                Mas de 40 clinicas en lista de espera — cupos limitados para Colombia
              </div>

              {/* Main headline */}
              <h1 className="font-display text-3xl sm:text-4xl lg:text-6xl font-bold text-text-primary leading-tight mb-5 animate-fade-up">
                Tu clinica llena.{' '}
                <br className="hidden sm:block" />
                <span className="text-brand-purple italic">Sin levantar el telefono.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-text-secondary text-base lg:text-lg font-mono leading-relaxed mb-3 max-w-2xl mx-auto animate-fade-up">
                SofIA atiende pacientes por WhatsApp las 24 horas, agenda citas, cobra anticipos
                y detecta oportunidades de negocio — mientras tu duermes.
              </p>

              {/* PAS hook */}
              <p className="text-text-muted text-xs lg:text-sm font-mono mb-8 max-w-xl mx-auto animate-fade-up">
                Cada noche tu clinica pierde pacientes que escriben despues de las 6PM y no obtienen respuesta.
                <span className="text-brand-gold font-medium"> SofIA responde en menos de 3 segundos. Siempre.</span>
              </p>

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-5 animate-fade-up">
                <Link
                  href="/onboarding"
                  className="group px-7 py-3.5 rounded-lg bg-brand-purple text-white font-bold text-base font-mono flex items-center gap-2.5 hover:bg-brand-purple-dark transition-colors duration-300 hover:scale-[1.02] w-full sm:w-auto justify-center"
                >
                  <Zap size={20} className="text-brand-gold" />
                  Prueba Gratis 7 Dias
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#demo"
                  className="px-7 py-3.5 rounded-lg bg-surface-2 border border-border text-text-muted font-semibold text-sm font-mono hover:border-brand-purple/30 hover:text-text-primary transition-all w-full sm:w-auto text-center"
                >
                  Ver demo en vivo
                </a>
              </div>

              {/* Trust signals below CTA */}
              <div className="flex flex-wrap gap-3 justify-center text-[11px] font-mono text-text-dim animate-fade-in">
                {[
                  { icon: <Shield size={12} />, text: 'Sin tarjeta de credito' },
                  { icon: <Check size={12} />, text: 'Setup en 5 minutos' },
                  { icon: <Clock size={12} />, text: '7 dias completamente gratis' },
                  { icon: <Activity size={12} />, text: 'Cancela cuando quieras' },
                ].map(({ icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5 text-text-muted">
                    <span className="text-brand-purple">{icon}</span>
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ───────────────────────────────────────────── */}
        <section className="border-y border-border/50 bg-surface/30 py-6">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <p className="text-text-dim text-xs font-mono text-center lg:text-left">
                Con la confianza de clinicas lideres en Colombia y Latinoamerica
              </p>
              <div className="flex flex-wrap gap-5 lg:gap-8 items-center justify-center">
                {[
                  'Sonrisa Perfect', 'Clinica Estetica Bello', 'OdontoVida Medellin',
                  'Dermaclinic Pro', 'Centro Dental Norte'
                ].map(name => (
                  <span key={name} className="text-text-dim text-xs font-mono font-medium opacity-50 hover:opacity-80 transition-opacity">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── ANIMATED STATS ─────────────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-8 lg:p-12">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-5">
                <AnimatedStat value={40} suffix="%" label="Reduccion en citas perdidas por no-show" delay={0} />
                <AnimatedStat value={3} suffix="s" label="Tiempo de respuesta promedio de SofIA" delay={150} />
                <AnimatedStat value={24} suffix="/7" label="Atencion sin interrupciones, nunca duerme" delay={300} />
                <AnimatedStat value={97} suffix="%" label="Satisfaccion de pacientes con la atencion IA" delay={450} />
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM → AGITATION ────────────────────────────────────────── */}
        <section className="py-14 lg:py-18 bg-surface/20">
          <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center">
            <span className="badge badge-danger mb-5 inline-flex">El problema real</span>
            <h2 className="font-mono text-2xl lg:text-4xl font-bold text-text-primary mb-5">
              Cada noche tu clinica{' '}
              <span className="text-status-danger">pierde dinero</span>{' '}
              mientras duermes
            </h2>
            <p className="text-text-muted text-sm font-mono leading-relaxed mb-10 max-w-2xl mx-auto">
              Un paciente escribe a las 11PM buscando una cita urgente.
              Tu WhatsApp no responde. El paciente busca a tu competencia.
              Tu competencia tiene SofIA. Tu competencia cierra la cita.
            </p>

            <div className="grid md:grid-cols-3 gap-4 text-left">
              {[
                {
                  stat: '68%',
                  label: 'de los pacientes que no obtienen respuesta rapida',
                  pain: 'cambian de clinica',
                  color: 'text-status-danger',
                },
                {
                  stat: '$800K',
                  label: 'promedio mensual en ingresos perdidos por',
                  pain: 'no-shows sin recordatorio',
                  color: 'text-status-warning',
                },
                {
                  stat: '3h/dia',
                  label: 'de trabajo administrativo que tu equipo gasta en',
                  pain: 'tareas que IA puede hacer',
                  color: 'text-brand-cyan',
                },
              ].map(({ stat, label, pain, color }) => (
                <div key={stat} className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-5">
                  <div className={`text-2xl font-bold font-mono ${color} mb-1.5`}>{stat}</div>
                  <p className="text-text-muted text-xs font-mono leading-relaxed">
                    {label}{' '}
                    <span className="text-text-primary font-semibold">{pain}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────────────────── */}
        <section id="features" className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-12">
              <span className="badge badge-purple mb-3 inline-flex">Funciones</span>
              <h2 className="font-mono text-2xl lg:text-4xl font-bold text-text-primary mb-3">
                Todo lo que tu clinica necesita.{' '}
                <span className="text-brand-purple italic">Automatizado.</span>
              </h2>
              <p className="text-text-muted text-sm font-mono max-w-2xl mx-auto">
                SofIA no es solo un chatbot. Es el empleado mas dedicado que tendras —
                nunca llega tarde, nunca se enferma, nunca pide aumento.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard
                icon={<MessageSquare size={22} />}
                title="Atencion 24/7 por WhatsApp"
                description="Responde consultas, agenda citas y maneja objeciones en tiempo real por WhatsApp Business API — incluso a las 3AM."
                highlight
              />
              <FeatureCard
                icon={<Calendar size={22} />}
                title="Agenda inteligente"
                description="Detecta horarios disponibles, agenda citas, envia confirmaciones y recordatorios automaticos 24h y 2h antes."
              />
              <FeatureCard
                icon={<CreditCard size={22} />}
                title="Cobros de anticipos"
                description="Solicita y confirma pagos anticipados via Nequi, PSE o tarjeta. Reduce no-shows hasta un 40% desde el primer mes."
                highlight
              />
              <FeatureCard
                icon={<Target size={22} />}
                title="Deteccion de oportunidades"
                description="SofIA identifica cuando un paciente podria necesitar tratamientos adicionales y alerta a tu equipo con contexto completo."
              />
              <FeatureCard
                icon={<TrendingUp size={22} />}
                title="Dashboard de analytics"
                description="Panel en tiempo real con metricas de conversion, revenue, NPS de pacientes, rendimiento por doctor y sede."
              />
              <FeatureCard
                icon={<Users size={22} />}
                title="CRM de pacientes"
                description="Historial completo de cada paciente: conversaciones, tratamientos, pagos, seguimientos pendientes y oportunidades detectadas."
              />
              <FeatureCard
                icon={<BarChart3 size={22} />}
                title="Pipeline de ventas"
                description="Visualiza tu embudo de pacientes desde primer contacto hasta cierre de tratamiento. Nunca pierdas un lead."
              />
              <FeatureCard
                icon={<Shield size={22} />}
                title="Cumplimiento HABEAS DATA"
                description="Procesamiento de datos conforme a la Ley 1581 de 2012. Tus pacientes y tu clinica siempre protegidos."
              />
              <FeatureCard
                icon={<Zap size={22} />}
                title="Multi-canal y multi-sede"
                description="WhatsApp + Instagram + Messenger. Una sola IA para todas tus sedes. Sin limite de conversaciones simultaneas."
                highlight
              />
            </div>
          </div>
        </section>

        {/* ── LIVE DEMO ──────────────────────────────────────────────────── */}
        <section id="demo" className="py-16 lg:py-24 bg-surface/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="badge badge-purple mb-4 inline-flex">Demo en tiempo real</span>
                <h2 className="font-mono text-2xl lg:text-4xl font-bold text-text-primary mb-4">
                  Mira a SofIA{' '}
                  <span className="text-brand-purple italic">en accion</span>
                </h2>
                <p className="text-text-muted text-sm font-mono leading-relaxed mb-6">
                  Esta es una conversacion real de SofIA con un paciente.
                  Sin intervencion humana. Sin errores. En menos de 2 minutos:
                  consulta recibida, cita agendada, anticipo cobrado.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    { step: '01', text: 'Paciente escribe a las 11PM buscando cita' },
                    { step: '02', text: 'SofIA responde en 3 segundos con opciones de horario' },
                    { step: '03', text: 'Paciente elige horario — SofIA lo agenda automaticamente' },
                    { step: '04', text: 'SofIA solicita anticipo y envia link de pago' },
                    { step: '05', text: 'Pago confirmado — cita bloqueada en el calendario' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-[11px] font-bold font-mono flex-shrink-0">
                        {step}
                      </div>
                      <p className="text-text-secondary text-xs font-mono">{text}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-brand-purple text-white font-semibold text-xs font-mono hover:bg-brand-purple-dark transition-colors"
                >
                  Quiero SofIA para mi clinica <ArrowRight size={16} />
                </Link>
              </div>

              <WhatsAppDemo />
            </div>
          </div>
        </section>

        {/* ── ROI CALCULATOR ─────────────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-10">
              <span className="badge badge-purple mb-3 inline-flex">Calculadora de ROI</span>
              <h2 className="font-mono text-2xl lg:text-3xl font-bold text-text-primary mb-3">
                Cuanto valdria SofIA para tu clinica?
              </h2>
              <p className="text-text-muted text-sm font-mono max-w-xl mx-auto">
                Ingresa tus datos reales y descubre cuanto dinero recuperarias cada mes.
              </p>
            </div>
            <ROICalculator />
          </div>
        </section>

        {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
        <section id="testimonials" className="py-16 lg:py-24 bg-surface/20">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-12">
              <span className="badge badge-purple mb-3 inline-flex">Testimonios</span>
              <h2 className="font-mono text-2xl lg:text-4xl font-bold text-text-primary mb-3">
                Lo que dicen nuestros{' '}
                <span className="text-brand-purple italic">clientes</span>
              </h2>
              <p className="text-text-muted text-sm font-mono max-w-xl mx-auto">
                Clinicas reales. Resultados reales.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              <TestimonialCard
                quote="Antes perdiamos entre 8 y 10 citas a la semana por no responder rapido. Desde que tenemos SofIA, ese numero bajo a menos de 2. El ROI fue visible desde el primer mes."
                name="Dr. Carlos Medina"
                role="Director Medico"
                clinic="Clinica Estetica Bello, Medellin"
                stars={5}
              />
              <TestimonialCard
                quote="Lo que mas me sorprendio fue la calidad de las respuestas. SofIA suena como un asistente humano experto. Mis pacientes me preguntan como se llama la recepcionista nueva."
                name="Dra. Valentina Torres"
                role="Odontologa Especialista"
                clinic="Sonrisa Perfect, Bogota"
                stars={5}
              />
              <TestimonialCard
                quote="Manejo 3 sedes y antes necesitaba una recepcionista por sede. Ahora SofIA cubre las 3. Ahorre mas de 5 millones al mes en nomina y la atencion es mejor que antes."
                name="Dr. Andres Ramirez"
                role="CEO"
                clinic="OdontoVida, Bogota D.C."
                stars={5}
              />
              <TestimonialCard
                quote="El dashboard es increible. Ver en tiempo real cuantos pacientes estan en el pipeline, cuales tienen anticipo pagado, que oportunidades detecto SofIA — es informacion que antes no tenia."
                name="Dra. Sofia Gutierrez"
                role="Medica Estetica"
                clinic="Dermaclinic Pro, Cali"
                stars={5}
              />
              <TestimonialCard
                quote="La funcion de cobro de anticipos es un antes y despues. El no-show bajo de 25% a 8% en el primer mes. Solo eso ya paga el costo de SofIA varias veces."
                name="Dr. Juan Pablo Herrera"
                role="Cirujano Plastico"
                clinic="Centro Medico Norte, Barranquilla"
                stars={5}
              />
              <TestimonialCard
                quote="Implementacion en un dia. El equipo de Ataraxia es muy profesional. SofIA empezo a atender pacientes esa misma noche. Recomendado 100%."
                name="Dra. Maria Camila Lopez"
                role="Directora"
                clinic="Estetica Avanzada, Bucaramanga"
                stars={5}
              />
            </div>

            {/* NPS Social Proof Bar */}
            <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-6 text-center">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold font-mono text-brand-purple mb-1.5">4.9</div>
                  <div className="flex gap-1 justify-center mb-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} className="fill-brand-gold text-brand-gold" />)}
                  </div>
                  <div className="text-text-dim text-[11px] font-mono">Calificacion promedio</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono text-brand-purple mb-1.5">40+</div>
                  <div className="text-text-muted text-xs font-mono mb-1">Clinicas activas</div>
                  <div className="text-text-dim text-[11px] font-mono">Colombia y LATAM</div>
                </div>
                <div>
                  <div className="text-3xl font-bold font-mono text-brand-purple mb-1.5">98%</div>
                  <div className="text-text-muted text-xs font-mono mb-1">Renuevan cada mes</div>
                  <div className="text-text-dim text-[11px] font-mono">Tasa de retencion</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ────────────────────────────────────────────────────── */}
        <section id="pricing" className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-12">
              <span className="badge badge-purple mb-3 inline-flex">Precio simple</span>
              <h2 className="font-mono text-2xl lg:text-4xl font-bold text-text-primary mb-3">
                Un precio. Todo incluido.{' '}
                <span className="text-brand-purple italic">Sin sorpresas.</span>
              </h2>
              <p className="text-text-muted text-sm font-mono max-w-xl mx-auto">
                Sin costos por mensaje, sin limites de pacientes, sin modulos extra.
                Todo lo que SofIA puede hacer, desde el dia uno.
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              {/* Pricing card */}
              <div className="relative">
                {/* Subtle border glow */}
                <div className="absolute -inset-px bg-brand-purple/20 rounded-lg blur-sm" />
                <div className="relative bg-brand-purple/8 border border-brand-purple/25 rounded-lg p-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[11px] font-mono font-semibold mb-3">
                      <Star size={10} className="fill-brand-gold" /> MAS POPULAR
                    </div>
                    <div className="text-4xl font-bold font-mono text-text-primary mb-1">
                      $997
                    </div>
                    <div className="text-text-muted text-xs font-mono">USD / mes — facturado mensualmente</div>
                    <div className="text-brand-cyan text-[11px] font-mono mt-1 font-medium">
                      ~COP 4,000,000 / mes
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {[
                      'Atencion 24/7 por WhatsApp Business API',
                      'Agenda automatica + recordatorios',
                      'Cobro de anticipos integrado',
                      'Dashboard analytics en tiempo real',
                      'CRM completo de pacientes',
                      'Pipeline visual de oportunidades',
                      'Soporte multi-sede ilimitado',
                      'Integracion Instagram + Messenger',
                      'Onboarding personalizado incluido',
                      'Soporte prioritario en español',
                      'Actualizaciones de IA sin costo extra',
                    ].map(feature => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-sm bg-status-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-status-success" />
                        </div>
                        <span className="text-text-secondary text-xs font-mono">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/onboarding"
                    className="w-full py-3 rounded-md bg-brand-purple text-white font-bold text-sm font-mono flex items-center justify-center gap-2 hover:bg-brand-purple-dark transition-colors mb-3"
                  >
                    Empezar con 7 dias gratis <ArrowRight size={16} />
                  </Link>

                  <p className="text-center text-text-dim text-[11px] font-mono">
                    Sin tarjeta de credito. Sin contratos. Cancela cuando quieras.
                  </p>
                </div>
              </div>

              {/* Guarantee */}
              <div className="mt-5 p-4 rounded-md bg-status-success/5 border border-status-success/20 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <Shield size={14} className="text-status-success" />
                  <span className="text-status-success font-semibold text-xs font-mono">Garantia de resultados 30 dias</span>
                </div>
                <p className="text-text-muted text-[11px] font-mono leading-relaxed">
                  Si en 30 dias SofIA no mejora tu tasa de agendamiento al menos un 20%,
                  te devolvemos el dinero. Sin preguntas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section className="py-16 lg:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-brand-purple/3 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-purple/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs font-mono font-medium mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-status-danger animate-pulse" />
              Cupos limitados este mes — solo quedan 8 spots disponibles
            </div>

            <h2 className="font-mono text-3xl lg:text-5xl font-bold text-text-primary mb-5">
              Tu clinica merece trabajar{' '}
              <span className="text-brand-purple italic">para ti.</span>
            </h2>

            <p className="text-text-muted text-sm lg:text-base font-mono leading-relaxed mb-10 max-w-2xl mx-auto">
              Cada dia que esperas es un dia que tu competencia automatiza mas.
              Empieza hoy con 7 dias gratis y ve la diferencia desde la primera noche.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
              <Link
                href="/onboarding"
                className="group px-8 py-4 rounded-lg bg-brand-purple text-white font-bold text-lg font-mono flex items-center gap-2.5 hover:bg-brand-purple-dark transition-colors duration-300 hover:scale-[1.02] w-full sm:w-auto justify-center"
              >
                <Zap size={22} className="text-brand-gold" />
                Empezar Prueba Gratis
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <p className="text-text-dim text-xs font-mono">
              Setup en 5 minutos &bull; Sin tarjeta &bull; Soporte en espanol
            </p>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-border/50 py-10 bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex flex-col items-center lg:items-start gap-1.5">
                <div className="flex items-center gap-2">
              <SentientEye size={20} />
              <span className="text-xs font-mono font-semibold text-brand-purple tracking-wide">SofIA</span>
            </div>
                <p className="text-text-dim text-[11px] font-mono mt-1.5 max-w-xs text-center lg:text-left">
                  Asistente IA para clinicas de salud y estetica en Latinoamerica.
                  Ataraxia IA Labs &copy; {new Date().getFullYear()}
                </p>
              </div>

              <div className="flex flex-wrap gap-5 text-xs font-mono text-text-muted justify-center">
                <Link href="/onboarding" className="hover:text-text-primary transition-colors">Empezar gratis</Link>
                <Link href="/login" className="hover:text-text-primary transition-colors">Iniciar sesion</Link>
                <a href="#features" className="hover:text-text-primary transition-colors">Funciones</a>
                <a href="#pricing" className="hover:text-text-primary transition-colors">Precios</a>
                <Link href="/legal/terminos" className="hover:text-text-primary transition-colors">Terminos</Link>
                <Link href="/legal/privacidad" className="hover:text-text-primary transition-colors">Privacidad</Link>
              </div>

              <div className="flex flex-col items-center lg:items-end gap-1.5">
                <div className="flex items-center gap-2 text-[11px] font-mono text-text-dim">
                  <Shield size={11} className="text-brand-purple" />
                  <span>Cumplimiento Ley 1581 de 2012 (HABEAS DATA)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-text-dim">
                  <Activity size={11} className="text-brand-cyan" />
                  <span>Disponibilidad 99.9% SLA</span>
                </div>
                {/* WhatsApp Support — remove placeholder, show real contact */}
                <a
                  href="https://wa.me/573001000000?text=Hola,%20quiero%20saber%20mas%20sobre%20SofIA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[11px] font-mono text-[#25D366] hover:text-[#128C7E] transition-colors"
                >
                  <MessageSquare size={12} />
                  <span>Soporte via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </footer>

      </div>

      {/* Sticky Trial Banner */}
      <StickyTrialBanner />
    </>
  )
}
