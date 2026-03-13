'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { ShieldCheck, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react'
import { SofiaLogo } from '@/components/sofia-logo'
import { getMFAStatus, verifyMFA } from '@/lib/mfa-api'

export default function MFAPage() {
  return (
    <Suspense>
      <MFAForm />
    </Suspense>
  )
}

function MFAForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return

    setLoading(true)
    setError('')

    try {
      // Get the verified TOTP factor id
      const status = await getMFAStatus()
      const factor = status.factors.find((f) => f.status === 'verified')

      if (!factor) {
        // No MFA factor found — go to dashboard anyway
        router.replace('/dashboard')
        return
      }

      await verifyMFA(factor.id, code)
      router.replace('/dashboard')
    } catch (e) {
      Sentry.captureException(e)
      setError(e instanceof Error ? e.message : 'Codigo incorrecto. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      {/* Background orbs */}
      <div className="fixed top-1/4 -left-40 w-96 h-96 bg-brand-purple/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-0 w-96 h-96 bg-brand-cyan/6 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SofiaLogo size="md" variant="full" />
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center mb-4">
              <ShieldCheck size={24} className="text-brand-purple" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary">Verificacion de dos pasos</h1>
            <p className="text-text-muted text-sm mt-2 leading-relaxed">
              Abre tu app autenticadora e ingresa el codigo de 6 digitos.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <div className="flex justify-center">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                disabled={loading}
                className="w-48 text-center text-3xl font-mono tracking-[0.5em] px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all disabled:opacity-50"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-sm flex items-center gap-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Verificar
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-dim text-xs mt-6">
          ¿Problemas? Contacta soporte en{' '}
          <a href="mailto:soporte@ataraxiaialabs.ai" className="text-brand-purple hover:underline">
            soporte@ataraxiaialabs.ai
          </a>
        </p>
      </div>
    </div>
  )
}
