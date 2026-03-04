'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchSubscription, fetchUsage, fetchWompiConfig } from '@/lib/api/subscriptions'
import { CheckoutModal } from '@/components/checkout-modal'
import { Check, X, Gem, Crown, Zap, Clock } from 'lucide-react'
import type { Subscription, UsageData, WompiConfig } from '@/types'

/* ------------------------------------------------------------------ */
/*  Plan configuration                                                 */
/* ------------------------------------------------------------------ */

type BillingCycle = 'MONTHLY' | 'ANNUAL'
type PlanId = 'BASIC' | 'PRO' | 'ENTERPRISE'

const PRICES: Record<string, number> = {
  BASIC_MONTHLY: 149_000,
  BASIC_ANNUAL: 1_490_000,
  PRO_MONTHLY: 349_000,
  PRO_ANNUAL: 3_490_000,
}

function formatCOP(amount: number): string {
  return '$' + amount.toLocaleString('es-CO')
}

function monthlyEquivalent(annual: number): string {
  return formatCOP(Math.round(annual / 12))
}

interface PlanDef {
  id: PlanId
  name: string
  icon: typeof Zap
  color: string
  popular?: boolean
  features: { name: string; included: boolean }[]
}

const PLANS: PlanDef[] = [
  {
    id: 'BASIC',
    name: 'Basic',
    icon: Zap,
    color: 'brand-cyan',
    features: [
      { name: 'WhatsApp AI (SofIA)', included: true },
      { name: 'Agenda inteligente', included: true },
      { name: 'Pipeline de pacientes', included: true },
      { name: 'Analytics basico', included: true },
      { name: 'Bots automaticos (3)', included: true },
      { name: 'Voice AI', included: false },
      { name: 'Multi-sede', included: false },
      { name: 'API & integraciones', included: false },
      { name: 'Data Lake & fine-tuning', included: false },
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    icon: Crown,
    color: 'brand-purple',
    popular: true,
    features: [
      { name: 'WhatsApp AI (SofIA)', included: true },
      { name: 'Agenda inteligente', included: true },
      { name: 'Pipeline de pacientes', included: true },
      { name: 'Analytics avanzado', included: true },
      { name: 'Todos los bots (7)', included: true },
      { name: 'Voice AI', included: true },
      { name: 'Multi-sede (hasta 3)', included: true },
      { name: 'API & integraciones', included: false },
      { name: 'Data Lake & fine-tuning', included: false },
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    icon: Gem,
    color: 'status-warning',
    features: [
      { name: 'WhatsApp AI (SofIA)', included: true },
      { name: 'Agenda inteligente', included: true },
      { name: 'Pipeline de pacientes', included: true },
      { name: 'Analytics avanzado', included: true },
      { name: 'Todos los bots (7)', included: true },
      { name: 'Voice AI', included: true },
      { name: 'Multi-sede (ilimitadas)', included: true },
      { name: 'API & integraciones', included: true },
      { name: 'Data Lake & fine-tuning', included: true },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PlanesPage() {
  const { org, orgId, user } = useOrg()

  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [wompi, setWompi] = useState<WompiConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Checkout modal state
  const [checkoutPlan, setCheckoutPlan] = useState<'BASIC' | 'PRO' | null>(null)

  const currentPlan = org?.plan || 'TRIAL'
  const isActive = subscription?.status === 'ACTIVE'

  // Trial days calculation
  let trialDaysLeft: number | null = null
  if (currentPlan === 'TRIAL' && org?.trial_ends_at) {
    const diff = new Date(org.trial_ends_at).getTime() - Date.now()
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  /* Fetch data on mount */
  const loadData = useCallback(async () => {
    setLoading(true)
    const [sub, usg, cfg] = await Promise.all([
      fetchSubscription(orgId),
      fetchUsage(orgId),
      fetchWompiConfig(),
    ])
    setSubscription(sub)
    setUsage(usg)
    setWompi(cfg)
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  /* Price helpers */
  function getPriceDisplay(planId: PlanId) {
    if (planId === 'ENTERPRISE') return { main: 'Contactar', sub: '' }
    const key = `${planId}_${cycle}`
    const price = PRICES[key]
    if (cycle === 'ANNUAL') {
      return { main: formatCOP(price) + '/ano', sub: monthlyEquivalent(price) + '/mes' }
    }
    return { main: formatCOP(price) + '/mes', sub: '' }
  }

  /* CTA logic */
  function handleActivate(planId: PlanId) {
    if (planId === 'ENTERPRISE') {
      window.open('mailto:hola@ataraxiaialabs.ai?subject=Plan%20Enterprise', '_blank')
      return
    }
    setCheckoutPlan(planId)
  }

  function getCtaLabel(planId: PlanId): string {
    if (isActive && subscription?.plan === planId) return 'Plan actual'
    if (isActive) return 'Cambiar plan'
    if (planId === 'ENTERPRISE') return 'Contactar ventas'
    return 'Activar plan'
  }

  function isCtaDisabled(planId: PlanId): boolean {
    return isActive && subscription?.plan === planId
  }

  /* Next billing date formatted */
  const nextBilling = subscription?.next_billing_date
    ? new Date(subscription.next_billing_date).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Planes</h2>
        <p className="text-text-dim text-xs mt-0.5">Elige el plan que mejor se adapte a tu clinica</p>
      </div>

      {/* Current plan card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center">
              <Gem size={20} className="text-brand-purple" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Plan actual: {currentPlan}
              </h3>
              {currentPlan === 'TRIAL' && trialDaysLeft !== null && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={11} className={trialDaysLeft <= 2 ? 'text-status-danger' : 'text-status-warning'} />
                  <span className={`text-[10px] font-semibold ${trialDaysLeft <= 2 ? 'text-status-danger' : 'text-status-warning'}`}>
                    {trialDaysLeft === 0
                      ? 'Tu prueba expira hoy -- activa un plan para no perder acceso'
                      : `${trialDaysLeft} dias restantes de prueba`}
                  </span>
                </div>
              )}
              {isActive && nextBilling && (
                <p className="text-[10px] text-text-dim mt-0.5">
                  Proxima facturacion: {nextBilling}
                </p>
              )}
              {currentPlan !== 'TRIAL' && !isActive && (
                <p className="text-[10px] text-text-dim mt-0.5">Tu plan esta activo</p>
              )}
            </div>
          </div>
        </div>

        {/* Usage bar for BASIC plan */}
        {currentPlan === 'BASIC' && usage && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-text-muted font-medium">Mensajes utilizados</span>
              <span className="text-[10px] text-text-secondary font-semibold">
                {usage.message_count} / {usage.message_limit ?? 500}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-brand-purple/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-purple transition-all duration-500"
                style={{ width: `${Math.min(usage.percent, 100)}%` }}
              />
            </div>
            {usage.percent >= 80 && (
              <p className="text-[10px] text-status-warning mt-1">
                Estas cerca del limite. Considera actualizar a Pro para mensajes ilimitados.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => setCycle('MONTHLY')}
          className={`px-4 py-2 rounded-l-xl text-xs font-semibold transition-all ${
            cycle === 'MONTHLY'
              ? 'bg-brand-purple text-white'
              : 'bg-surface-3 text-text-muted hover:text-text-secondary'
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => setCycle('ANNUAL')}
          className={`px-4 py-2 rounded-r-xl text-xs font-semibold transition-all relative ${
            cycle === 'ANNUAL'
              ? 'bg-brand-purple text-white'
              : 'bg-surface-3 text-text-muted hover:text-text-secondary'
          }`}
        >
          Anual
          <span className="absolute -top-2.5 -right-2 px-1.5 py-0.5 rounded-full bg-status-success text-white text-[8px] font-bold whitespace-nowrap">
            Ahorra 2 meses
          </span>
        </button>
      </div>

      {/* Plan comparison grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-40 bg-surface-3 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const price = getPriceDisplay(plan.id)
            const disabled = isCtaDisabled(plan.id)

            return (
              <div
                key={plan.id}
                className={`glass-card p-5 relative transition-all ${
                  plan.popular ? 'border-brand-purple/30 ring-1 ring-brand-purple/20' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-purple text-white text-[9px] font-bold uppercase tracking-wider">
                    Popular
                  </div>
                )}

                <div className="text-center mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-${plan.color}/10 border border-${plan.color}/20 flex items-center justify-center mx-auto mb-3`}>
                    <Icon size={24} className={`text-${plan.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-text-primary">{price.main}</span>
                  </div>
                  {price.sub && (
                    <p className="text-[10px] text-text-muted mt-0.5">equiv. {price.sub}</p>
                  )}
                </div>

                <div className="space-y-2 mb-5">
                  {plan.features.map((feat) => (
                    <div key={feat.name} className="flex items-center gap-2">
                      {feat.included ? (
                        <Check size={14} className="text-status-success flex-shrink-0" />
                      ) : (
                        <X size={14} className="text-text-dim flex-shrink-0" />
                      )}
                      <span className={`text-xs ${feat.included ? 'text-text-secondary' : 'text-text-dim'}`}>
                        {feat.name}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={disabled}
                  onClick={() => !disabled && handleActivate(plan.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    disabled
                      ? 'bg-surface-3 text-text-dim cursor-default'
                      : plan.popular
                      ? 'bg-brand-purple text-white hover:bg-brand-purple-dark'
                      : 'bg-surface-3 border border-border text-text-primary hover:border-brand-purple/30 hover:text-brand-purple'
                  }`}
                >
                  {getCtaLabel(plan.id)}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Contact CTA */}
      <div className="glass-card p-5 text-center">
        <p className="text-text-muted text-xs">
          Necesitas un plan personalizado o tienes preguntas?
        </p>
        <p className="text-text-dim text-[10px] mt-1">
          Escribenos a <span className="text-brand-purple font-semibold">hola@ataraxiaialabs.ai</span> y te ayudamos.
        </p>
      </div>

      {/* Checkout modal */}
      {checkoutPlan && wompi && (
        <CheckoutModal
          isOpen={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          plan={checkoutPlan}
          billingCycle={cycle}
          orgId={orgId}
          customerEmail={user.email ?? ''}
          wompiPublicKey={wompi.public_key}
          wompiSandbox={wompi.sandbox}
          acceptanceToken={wompi.acceptance_token}
          onSuccess={() => {
            setCheckoutPlan(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
