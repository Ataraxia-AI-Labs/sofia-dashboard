'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { mfaChallengeRequired } from '@/lib/mfa-api'
import { SofiaLogo } from '@/components/sofia-logo'
import { Eye, EyeOff, ArrowRight, Zap, Star } from 'lucide-react'

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
            ? 'Email o contrasena incorrectos'
            : authError.message
        )
        setLoading(false)
        return
      }

      const rawRedirect = searchParams.get('redirect') || '/dashboard'
      // Prevent open redirect: only allow relative paths
      const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard'

      // Check if user has MFA enrolled and needs to complete challenge
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
    <div className="min-h-screen flex bg-void">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface items-center justify-center">
        <div className="relative z-10 px-12 max-w-lg">
          {/* Logo */}
          <div className="mb-10">
            <SofiaLogo size="lg" variant="full" />
          </div>

          <h1 className="font-display text-4xl font-bold text-text-primary leading-tight mb-3">
            Tu clinica opera sola.{' '}
            <span className="text-brand-purple italic">Siempre.</span>
          </h1>

          <p className="text-text-muted text-xs font-mono leading-relaxed mb-8">
            SofIA gestiona pacientes, agenda citas, cobra anticipos y detecta oportunidades de negocio — 24/7, sin intervencion humana.
          </p>

          {/* Stats teaser */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: '<3s', label: 'Tiempo de respuesta' },
              { value: '24/7', label: 'Disponibilidad' },
              { value: '40%', label: 'Menos no-shows' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold font-mono text-brand-purple">{stat.value}</div>
                <div className="text-[10px] font-mono text-text-dim mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Social proof mini */}
          <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-4 flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={12} className="fill-brand-gold text-brand-gold" />)}
            </div>
            <p className="text-text-muted text-[10px] font-mono leading-relaxed">
              <span className="text-text-primary font-medium">40+ clinicas</span> confian en SofIA — Calificacion 4.9/5
            </p>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-brand-purple/20" />
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <SofiaLogo size="md" variant="full" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-text-primary font-mono mb-1">Bienvenido</h2>
            <p className="text-text-muted text-xs font-mono">Ingresa a tu panel de control</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@clinica.com"
                className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-xs font-mono outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-medium text-text-dim mb-1.5 uppercase tracking-wider">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-xs font-mono outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                  aria-label={showPw ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-0.5">
              <a
                href="/forgot-password"
                className="text-[10px] font-mono text-brand-purple hover:text-brand-purple-light transition-colors"
              >
                Olvide mi contrasena
              </a>
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-brand-purple text-white font-semibold text-xs font-mono flex items-center justify-center gap-2 hover:bg-brand-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar al Dashboard
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Trial CTA */}
          <div className="mt-5 p-4 rounded-lg bg-brand-purple/8 border border-brand-purple/15">
            <p className="text-text-muted text-xs font-mono text-center mb-2.5">
              Aun no tienes cuenta?
            </p>
            <Link
              href="/onboarding"
              className="w-full py-2.5 rounded-lg bg-surface-2 border border-brand-purple/30 text-brand-purple font-semibold text-xs font-mono flex items-center justify-center gap-2 hover:bg-brand-purple/10 transition-all"
            >
              <Zap size={12} />
              Empieza tu prueba gratis de 7 dias
              <ArrowRight size={12} />
            </Link>
            <p className="text-center text-text-dim text-[10px] font-mono mt-1.5">Sin tarjeta. Setup en 5 minutos.</p>
          </div>

          <div className="mt-5 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-text-dim text-[10px] font-mono justify-center">
              <Zap size={10} className="text-brand-purple" />
              <span>
                Powered by <span className="text-text-muted font-medium">SofIA</span>{' '}
                &mdash; Ataraxia IA Labs
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
