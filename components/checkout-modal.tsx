'use client'

import { useState, useCallback } from 'react'
import { X, Check, AlertCircle, ShieldCheck, CreditCard, Zap } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import CardTokenizationForm from '@/components/card-tokenization-form'
import { createSubscription } from '@/lib/api/subscriptions'
import { formatCOP } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  plan: 'STARTER' | 'PRO' | 'BUSINESS'
  billingCycle: 'MONTHLY' | 'ANNUAL'
  orgId: string
  customerEmail: string
  wompiPublicKey: string
  wompiSandbox: boolean
  acceptanceToken: string | null
  onSuccess: () => void
}

type Step = 'summary' | 'card' | 'confirm' | 'result'
const STEPS: Step[] = ['summary', 'card', 'confirm', 'result']

const PRICES: Record<string, number> = {
  STARTER_MONTHLY: 119_000,
  STARTER_ANNUAL: 1_190_000,
  PRO_MONTHLY: 319_000,
  PRO_ANNUAL: 3_190_000,
  BUSINESS_MONTHLY: 549_000,
  BUSINESS_ANNUAL: 5_490_000,
}

const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: [
    'WhatsApp AI (SofIA)',
    'Hasta 300 conversaciones/mes',
    'Agendamiento inteligente',
    'Dashboard basico',
    '1 sede',
  ],
  PRO: [
    'Todo en Starter, mas:',
    'Voice AI (100 llamadas/mes)',
    'Conversaciones ilimitadas',
    'Todos los bots (5)',
    'Links de pago',
    'Pipeline CRM',
    'Hasta 3 sedes',
  ],
  BUSINESS: [
    'Todo en Pro, mas:',
    'Outbound calls ilimitados',
    'Voice AI ilimitada',
    'Revenue engine completo',
    'Data Lake & export',
    'Hasta 10 sedes',
    'Soporte prioritario',
  ],
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  STARTER: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CheckoutModal({
  isOpen,
  onClose,
  plan,
  billingCycle,
  orgId,
  customerEmail,
  wompiPublicKey,
  wompiSandbox,
  acceptanceToken,
  onSuccess,
}: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('summary')
  const [cardToken, setCardToken] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const price = PRICES[`${plan}_${billingCycle}`]
  const stepIndex = STEPS.indexOf(step)
  const planName = PLAN_DISPLAY_NAMES[plan] || plan

  /* -- Reset state when modal opens/closes -- */
  const handleClose = useCallback(() => {
    if (loading) return
    setStep('summary')
    setCardToken(null)
    setTermsAccepted(false)
    setError(null)
    setSuccess(false)
    onClose()
  }, [loading, onClose])

  /* -- Card tokenization handlers -- */
  const handleTokenized = useCallback((token: string) => {
    setCardToken(token)
    setStep('confirm')
  }, [])

  const handleTokenError = useCallback((msg: string) => {
    setError(msg)
    setStep('result')
  }, [])

  /* -- Confirm payment -- */
  const handleConfirm = useCallback(async () => {
    if (!cardToken || !acceptanceToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await createSubscription(orgId, {
        plan,
        billing_cycle: billingCycle,
        card_token: cardToken,
        customer_email: customerEmail,
        acceptance_token: acceptanceToken,
      })
      if (res.exito) {
        setSuccess(true)
        setStep('result')
        onSuccess()
      } else {
        setError(res.error || 'No se pudo activar la suscripcion. Intenta de nuevo.')
        setStep('result')
      }
    } catch {
      setError('Error de conexion. Verifica tu red e intenta de nuevo.')
      setStep('result')
    } finally {
      setLoading(false)
    }
  }, [cardToken, acceptanceToken, orgId, plan, billingCycle, customerEmail, onSuccess])

  /* -- Retry from error -- */
  const handleRetry = useCallback(() => {
    setError(null)
    setSuccess(false)
    setCardToken(null)
    setTermsAccepted(false)
    setStep('card')
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="glass-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Checkout ${planName}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-mono text-text-primary font-semibold">Activar plan {planName}</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === stepIndex ? 'bg-brand-purple' : i < stepIndex ? 'bg-brand-purple/40' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>

        {/* ----- Step 1: Summary ----- */}
        {step === 'summary' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
              <div className="w-9 h-9 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                <Zap size={16} className="text-brand-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-mono font-semibold text-xs">Plan {planName}</p>
                <p className="text-text-muted font-mono text-[10px]">
                  {billingCycle === 'MONTHLY' ? 'Facturacion mensual' : 'Facturacion anual'}
                </p>
              </div>
              <p className="text-text-primary font-mono font-semibold text-sm">{formatCOP(price)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-text-muted text-[10px] font-mono font-semibold uppercase tracking-wider">Incluido</p>
              {PLAN_FEATURES[plan].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check size={12} className="text-brand-purple shrink-0" />
                  <span className="text-text-muted text-[10px] font-mono">{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('card')}
              className="w-full py-2.5 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors"
            >
              Continuar al pago
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-lg bg-surface-3 border border-border text-text-primary text-[10px] font-mono font-semibold hover:border-brand-purple/30 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ----- Step 2: Card form ----- */}
        {step === 'card' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={14} className="text-text-muted" />
              <p className="text-text-primary font-mono font-semibold text-xs">Datos de tu tarjeta</p>
            </div>
            <CardTokenizationForm
              wompiPublicKey={wompiPublicKey}
              wompiSandbox={wompiSandbox}
              onTokenized={handleTokenized}
              onError={handleTokenError}
            />
            <button
              onClick={() => setStep('summary')}
              className="w-full py-2.5 rounded-lg bg-surface-3 border border-border text-text-primary text-[10px] font-mono font-semibold hover:border-brand-purple/30 transition-colors"
            >
              Volver
            </button>
          </div>
        )}

        {/* ----- Step 3: Confirmation ----- */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-brand-purple" />
              <p className="text-text-primary font-mono font-semibold text-xs">Confirmar suscripcion</p>
            </div>

            <div className="p-3 rounded-lg bg-surface-2 border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[10px] font-mono">Plan</span>
                <span className="text-text-primary text-[10px] font-mono font-semibold">{planName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[10px] font-mono">Ciclo</span>
                <span className="text-text-primary text-[10px] font-mono font-semibold">
                  {billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-text-muted text-xs font-semibold">Total</span>
                <span className="text-text-primary text-xs font-mono font-semibold">{formatCOP(price)}</span>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer group">
              <input
                id="checkout-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 accent-brand-purple"
              />
              <span className="text-text-muted text-[10px] font-mono leading-relaxed">
                Acepto los{' '}
                <a
                  href="/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-purple underline hover:text-brand-purple-dark"
                >
                  terminos y condiciones
                </a>{' '}
                del servicio.
              </span>
            </label>

            <button
              onClick={handleConfirm}
              disabled={!termsAccepted || loading}
              className="w-full py-2 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Procesando...
                </>
              ) : (
                'Confirmar pago'
              )}
            </button>
            <button
              onClick={() => setStep('card')}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-surface-3 border border-border text-text-primary text-[10px] font-mono font-semibold hover:border-brand-purple/30 transition-colors disabled:opacity-40"
            >
              Volver
            </button>
          </div>
        )}

        {/* ----- Step 4: Result ----- */}
        {step === 'result' && (
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            {success ? (
              <>
                <div className="w-12 h-12 rounded-lg bg-status-success/10 border border-status-success/15 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                  <Check size={28} className="text-status-success" />
                </div>
                <div>
                  <p className="text-text-primary font-mono font-semibold text-xs">Plan activado</p>
                  <p className="text-text-muted text-[10px] font-mono mt-1">
                    Tu plan {planName} esta activo. Ya puedes disfrutar de todas las funcionalidades.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors"
                >
                  Entendido
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-lg bg-status-danger/10 border border-status-danger/15 flex items-center justify-center">
                  <AlertCircle size={28} className="text-status-danger" />
                </div>
                <div>
                  <p className="text-text-primary font-mono font-semibold text-xs">Error en el pago</p>
                  <p className="text-text-muted text-[10px] font-mono mt-1">{error}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="w-full py-2.5 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors"
                >
                  Reintentar
                </button>
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-lg bg-surface-3 border border-border text-text-primary text-[10px] font-mono font-semibold hover:border-brand-purple/30 transition-colors"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
