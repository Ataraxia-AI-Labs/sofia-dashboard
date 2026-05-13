'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { mfaChallengeRequired } from '@/lib/mfa-api'
import { Eye, EyeOff, ArrowRight, Zap } from 'lucide-react'
import { AtaraxiaLogo, AtaraxiaLogoCompact } from '@/components/ataraxia-logo'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // --- Particle field ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = []

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.3 + 0.05,
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

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 80) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.04 * (1 - dist / 80)})`
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Email o contraseña incorrectos'
            : authError.message
        )
        setLoading(false)
        return
      }

      const rawRedirect = searchParams.get('redirect') || '/dashboard'
      const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'

      const needsMFA = await mfaChallengeRequired()
      if (needsMFA) {
        router.replace('/mfa')
        return
      }

      router.replace(redirect)
    } catch {
      setError('Error de conexion. Verifica tu internet e intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="brand min-h-screen flex bg-void relative overflow-hidden pt-12 lg:pt-16">
      {/* Particle canvas — purely decorative, hidden from screen readers (A11Y-021) */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.5 }}
      />

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', opacity: 0.03 }}
      />

      {/* ===== LEFT PANEL ===== */}
      <div className="hidden lg:flex lg:w-[45%] relative items-center justify-center">
        <div className="relative z-10 px-12 max-w-md">
          <div className="mb-10">
            <AtaraxiaLogo size={72} />
          </div>

          <h1 className="font-body text-3xl font-bold text-white leading-tight mb-3">
            Tu clínica opera sola.{' '}
            <span className="text-brand-purple">Siempre.</span>
          </h1>

          <p className="text-text-muted text-sm font-body leading-relaxed mb-10">
            SofIA gestiona pacientes, agenda citas, cobra anticipos y detecta oportunidades — 24/7, sin intervención humana.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { value: '<3s', label: 'Respuesta' },
              { value: '24/7', label: 'Disponible' },
              { value: '40%', label: 'Menos no-shows' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold font-mono text-brand-purple">{stat.value}</div>
                <div className="text-[12px] font-body text-text-dim mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Login ===== */}
      <div className="flex-1 flex items-center justify-center px-5 relative z-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-6">
            <AtaraxiaLogoCompact size={40} />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white font-body mb-1">Acceder al Nucleus</h2>
            <p className="text-text-muted text-xs font-body">Ingresa al centro de control de tu clínica</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@clinica.com"
                className="w-full px-3 py-2.5 rounded-md bg-surface border border-border text-white placeholder:text-text-dim text-xs font-body outline-none focus:border-brand-purple/50 transition-colors"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[12px] font-body font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-md bg-surface border border-border text-white placeholder:text-text-dim text-xs font-body outline-none focus:border-brand-purple/50 transition-colors"
                  required
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
            </div>

            <div className="flex justify-end -mt-1">
              <a
                href="/forgot-password"
                className="text-[12px] font-body text-brand-purple hover:brightness-125 transition-colors"
              >
                Olvidé mi contraseña
              </a>
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-md text-status-danger text-xs font-body"
                style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md bg-brand-purple text-white font-semibold text-xs font-body flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar al Nucleus
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Trial CTA */}
          <div className="mt-6 p-4 rounded-md bg-surface border border-border">
            <p className="text-text-muted text-xs font-body text-center mb-2.5">
              ¿Aún no tienes cuenta?
            </p>
            <Link
              href="/onboarding"
              className="w-full py-2.5 rounded-md bg-surface border border-brand-purple/30 text-brand-purple font-semibold text-xs font-body flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              style={{ background: 'rgba(139, 92, 246, 0.05)' }}
            >
              <Zap size={12} />
              Prueba gratis de 7 días
              <ArrowRight size={12} />
            </Link>
            <p className="text-center text-text-dim text-[11px] font-body mt-1.5">Sin tarjeta. Setup en 5 minutos.</p>
          </div>

          <p className="text-[11px] font-body text-text-dim text-center mt-6">
            Powered by SofIA — Ataraxia IA Labs
          </p>
        </div>
      </div>
    </div>
  )
}
