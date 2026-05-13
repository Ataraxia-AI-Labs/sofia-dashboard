'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { ShieldCheck, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react'
import { getMFAStatus, verifyMFA } from '@/lib/mfa-api'
import { AtaraxiaLogo } from '@/components/ataraxia-logo'

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
      setError(e instanceof Error ? e.message : 'Código incorrecto. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="brand min-h-screen flex items-center justify-center px-5 py-12 bg-void">
      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <AtaraxiaLogo size={56} />
        </div>

        {/* Card */}
        <div className="bg-brand-purple/8 border border-brand-purple/15 rounded-lg p-5">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center mb-3">
              <ShieldCheck size={20} className="text-brand-purple" />
            </div>
            <h1 className="text-xl font-semibold text-text-primary font-body">Verificación de dos pasos</h1>
            <p className="text-text-muted text-xs font-body mt-1.5 leading-relaxed">
              Abre tu app autenticadora e ingresa el código de 6 dígitos.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
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
                className="w-48 text-center text-3xl font-body tracking-[0.5em] px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-dim outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all disabled:opacity-50"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-body flex items-center gap-2">
                <AlertTriangle size={12} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="w-full py-3 rounded-lg bg-brand-purple text-white font-semibold text-xs font-body flex items-center justify-center gap-2 hover:bg-brand-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  Verificar
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-dim text-[12px] font-body mt-5">
          Problemas? Contacta soporte en{' '}
          <a href="mailto:soporte@ataraxiaialabs.ai" className="text-brand-purple hover:underline">
            soporte@ataraxiaialabs.ai
          </a>
        </p>
      </div>
    </div>
  )
}
