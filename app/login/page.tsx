'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
      router.replace(redirect)
    } catch {
      setError('Error de conexion. Verifica tu internet e intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface items-center justify-center">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-purple/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-brand-cyan/8 rounded-full blur-[120px]" />

        <div className="relative z-10 px-16 max-w-lg">
          {/* Logo */}
          <div className="mb-12">
            <SofiaLogo size="lg" variant="full" />
          </div>

          <h1 className="font-display text-4xl font-bold text-text-primary leading-tight mb-4">
            Tu clinica opera sola.{' '}
            <span className="gradient-text italic">Siempre.</span>
          </h1>

          <p className="text-text-muted text-lg leading-relaxed mb-10">
            SofIA gestiona pacientes, agenda citas, cobra anticipos y detecta oportunidades de negocio — 24/7, sin intervencion humana.
          </p>

          {/* Stats teaser */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {[
              { value: '<3s', label: 'Tiempo de respuesta' },
              { value: '24/7', label: 'Disponibilidad' },
              { value: '40%', label: 'Menos no-shows' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold font-mono gradient-text">{stat.value}</div>
                <div className="text-xs text-text-dim mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Social proof mini */}
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} size={12} className="fill-brand-gold text-brand-gold" />)}
            </div>
            <p className="text-text-muted text-xs leading-relaxed">
              <span className="text-text-primary font-medium">40+ clinicas</span> confian en SofIA — Calificacion 4.9/5
            </p>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-purple/30 to-transparent" />
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <SofiaLogo size="md" variant="full" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-2">Bienvenido</h2>
            <p className="text-text-muted text-sm">Ingresa a tu panel de control</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@clinica.com"
                className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                  aria-label={showPw ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-1">
              <a
                href="/forgot-password"
                className="text-xs text-brand-purple hover:text-brand-purple-light transition-colors"
              >
                Olvide mi contrasena
              </a>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar al Dashboard
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Trial CTA — convert browsers into customers */}
          <div className="mt-6 p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/20">
            <p className="text-text-muted text-sm text-center mb-3">
              Aun no tienes cuenta?
            </p>
            <Link
              href="/onboarding"
              className="w-full py-3 rounded-xl bg-surface-2 border border-brand-purple/30 text-brand-purple font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-purple/10 transition-all"
            >
              <Zap size={14} />
              Empieza tu prueba gratis de 7 dias
              <ArrowRight size={14} />
            </Link>
            <p className="text-center text-text-dim text-xs mt-2">Sin tarjeta. Setup en 5 minutos.</p>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-text-dim text-xs justify-center">
              <Zap size={12} className="text-brand-purple" />
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
