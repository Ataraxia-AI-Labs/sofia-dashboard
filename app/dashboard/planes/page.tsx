'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchSubscription, fetchUsage, fetchWompiConfig } from '@/lib/api/subscriptions'
import { CheckoutModal } from '@/components/checkout-modal'
import { Check, X, Gem, Crown, Zap, Clock, Rocket, Building2 } from 'lucide-react'
import type { Subscription, UsageData, WompiConfig } from '@/types'
import { formatCOP } from '@/lib/api'
import { useTranslations } from 'next-intl'

/* ------------------------------------------------------------------ */
/*  Plan configuration                                                 */
/* ------------------------------------------------------------------ */

type BillingCycle = 'MONTHLY' | 'ANNUAL'
type PlanId = 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE'

const PRICES: Record<string, number> = {
  STARTER_MONTHLY: 119_000,
  STARTER_ANNUAL: 1_190_000,
  PRO_MONTHLY: 319_000,
  PRO_ANNUAL: 3_190_000,
  BUSINESS_MONTHLY: 549_000,
  BUSINESS_ANNUAL: 5_490_000,
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
  features: { key: string; included: boolean }[]
}

const PLANS: PlanDef[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    icon: Zap,
    color: 'brand-cyan',
    features: [
      { key: 'whatsappAI', included: true },
      { key: 'smartSchedule', included: true },
      { key: 'basicDashboard', included: true },
      { key: 'conversations500', included: true },
      { key: 'autoBots2', included: true },
      { key: 'oneLocation', included: true },
      { key: 'voiceAI', included: false },
      { key: 'paymentLinks', included: false },
      { key: 'pipelineCRM', included: false },
      { key: 'outboundCalls', included: false },
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    icon: Crown,
    color: 'brand-purple',
    popular: true,
    features: [
      { key: 'allInStarter', included: true },
      { key: 'voiceAI100', included: true },
      { key: 'unlimitedConversations', included: true },
      { key: 'allBots5', included: true },
      { key: 'paymentLinksWompi', included: true },
      { key: 'basicPipelineCRM', included: true },
      { key: 'upTo3Locations', included: true },
      { key: 'outboundCalls', included: false },
      { key: 'revenueEngine', included: false },
      { key: 'dataLakeExport', included: false },
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    icon: Rocket,
    color: 'status-success',
    features: [
      { key: 'allInPro', included: true },
      { key: 'unlimitedOutbound', included: true },
      { key: 'unlimitedVoiceAI', included: true },
      { key: 'allBots7', included: true },
      { key: 'fullRevenueEngine', included: true },
      { key: 'dataLakeExport', included: true },
      { key: 'upTo10Locations', included: true },
      { key: 'prioritySupport', included: true },
      { key: 'apiAccess', included: true },
      { key: 'fineTuningAI', included: false },
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    icon: Building2,
    color: 'status-warning',
    features: [
      { key: 'allInBusiness', included: true },
      { key: 'unlimitedLocations', included: true },
      { key: 'customAPIIntegrations', included: true },
      { key: 'proprietaryFineTuning', included: true },
      { key: 'advancedABTesting', included: true },
      { key: 'dedicatedAccountManager', included: true },
      { key: 'guaranteedSLA', included: true },
      { key: 'assistedOnboarding', included: true },
    ],
  },
]

/** Static Tailwind class map — dynamic `bg-${color}` won't survive purge */
const PLAN_COLOR_CLASSES: Record<string, { bg: string; border: string; text: string }> = {
  'brand-cyan': { bg: 'bg-brand-cyan/10', border: 'border-brand-cyan/20', text: 'text-brand-cyan' },
  'brand-purple': { bg: 'bg-brand-purple/10', border: 'border-brand-purple/20', text: 'text-brand-purple' },
  'status-success': { bg: 'bg-status-success/10', border: 'border-status-success/20', text: 'text-status-success' },
  'status-warning': { bg: 'bg-status-warning/10', border: 'border-status-warning/20', text: 'text-status-warning' },
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function PlanesPage() {
  const { org, orgId, user } = useOrg()
  const t = useTranslations('plans')

  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [wompi, setWompi] = useState<WompiConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Checkout modal state
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null)

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
    try {
      const [sub, usg, cfg] = await Promise.all([
        fetchSubscription(orgId),
        fetchUsage(orgId),
        fetchWompiConfig(),
      ])
      setSubscription(sub)
      setUsage(usg)
      setWompi(cfg)
    } catch {
      // Non-critical — page still renders with plan cards
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  /* Price helpers */
  function getPriceDisplay(planId: PlanId) {
    if (planId === 'ENTERPRISE') return { main: t('contact'), sub: '' }
    const key = `${planId}_${cycle}`
    const price = PRICES[key]
    if (cycle === 'ANNUAL') {
      return { main: formatCOP(price) + t('perYear'), sub: monthlyEquivalent(price) + t('perMonth') }
    }
    return { main: formatCOP(price) + t('perMonth'), sub: '' }
  }

  /* CTA logic */
  function handleActivate(planId: PlanId) {
    if (planId === 'ENTERPRISE') {
      window.open('mailto:gestion@ataraxiaialabs.ai?subject=Plan%20Enterprise', '_blank')
      return
    }
    setCheckoutPlan(planId)
  }

  function getCtaLabel(planId: PlanId): string {
    if (isActive && subscription?.plan === planId) return t('currentPlanLabel')
    if (isActive) return t('changePlan')
    if (planId === 'ENTERPRISE') return t('contactSales')
    return t('activate')
  }

  function isCtaDisabled(planId: PlanId): boolean {
    return isActive && subscription?.plan === planId
  }

  /* Next billing date formatted */
  const nextBilling = subscription?.next_billing_date
    ? new Date(subscription.next_billing_date).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null

  return (
    <div className="max-w-[1200px] mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
        <p className="text-text-dim text-[9px] font-mono mt-0.5">{t('subtitle')}</p>
      </div>

      {/* Current plan card */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
              <Gem size={18} className="text-brand-purple" />
            </div>
            <div>
              <h3 className="text-[10px] font-mono font-semibold text-text-primary">
                {t('currentPlan')}: {currentPlan}
              </h3>
              {currentPlan === 'TRIAL' && trialDaysLeft !== null && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={10} className={trialDaysLeft <= 2 ? 'text-status-danger' : 'text-status-warning'} />
                  <span className={`text-[9px] font-mono font-semibold ${trialDaysLeft <= 2 ? 'text-status-danger' : 'text-status-warning'}`}>
                    {trialDaysLeft === 0
                      ? t('trialExpiresToday')
                      : t('trialDaysLeft', { days: trialDaysLeft })}
                  </span>
                </div>
              )}
              {isActive && nextBilling && (
                <p className="text-[9px] font-mono text-text-dim mt-0.5">
                  {t('nextBilling', { date: nextBilling })}
                </p>
              )}
              {currentPlan !== 'TRIAL' && !isActive && (
                <p className="text-[9px] font-mono text-text-dim mt-0.5">{t('planActive')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Usage bar for STARTER plan */}
        {currentPlan === 'STARTER' && usage && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-text-muted font-medium">{t('messagesUsed')}</span>
              <span className="text-[9px] font-mono text-text-secondary font-semibold">
                {usage.message_count} / {usage.message_limit ?? 500}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-brand-purple/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-purple transition-all duration-500"
                style={{ width: `${Math.min(usage.percent, 100)}%` }}
              />
            </div>
            {usage.percent >= 80 && (
              <p className="text-[9px] font-mono text-status-warning mt-1">
                {t('nearLimit')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => setCycle('MONTHLY')}
          className={`px-3 py-1.5 rounded-l-lg text-[10px] font-mono font-semibold transition-all ${
            cycle === 'MONTHLY'
              ? 'bg-brand-purple text-white'
              : 'bg-surface-3 text-text-muted hover:text-text-secondary'
          }`}
        >
          {t('monthly')}
        </button>
        <button
          onClick={() => setCycle('ANNUAL')}
          className={`px-3 py-1.5 rounded-r-lg text-[10px] font-mono font-semibold transition-all relative ${
            cycle === 'ANNUAL'
              ? 'bg-brand-purple text-white'
              : 'bg-surface-3 text-text-muted hover:text-text-secondary'
          }`}
        >
          {t('annual')}
          <span className="absolute -top-2.5 -right-2 px-1.5 py-0.5 rounded-full bg-status-success text-white text-[7px] font-mono font-bold whitespace-nowrap">
            {t('save2months')}
          </span>
        </button>
      </div>

      {/* Plan comparison grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-36 bg-surface-3 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const price = getPriceDisplay(plan.id)
            const disabled = isCtaDisabled(plan.id)

            return (
              <div
                key={plan.id}
                className={`glass-card p-4 relative transition-all ${
                  plan.popular ? 'border-brand-purple/30 ring-1 ring-brand-purple/20' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-brand-purple text-white text-[8px] font-mono font-bold uppercase tracking-wider">
                    {t('recommended')}
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className={`w-10 h-10 rounded-md ${PLAN_COLOR_CLASSES[plan.color]?.bg ?? ''} border ${PLAN_COLOR_CLASSES[plan.color]?.border ?? ''} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={20} className={PLAN_COLOR_CLASSES[plan.color]?.text ?? ''} />
                  </div>
                  <h3 className="text-sm font-mono font-bold text-text-primary">{plan.name}</h3>
                  <p className="text-[9px] font-mono text-text-muted mt-0.5">{t(`descriptions.${plan.id}`)}</p>
                  <div className="mt-2">
                    <span className="text-xl font-mono font-bold text-text-primary">{price.main}</span>
                  </div>
                  {price.sub && (
                    <p className="text-[9px] font-mono text-text-muted mt-0.5">{t('equiv')} {price.sub}</p>
                  )}
                </div>

                <div className="space-y-1.5 mb-4">
                  {plan.features.map((feat) => (
                    <div key={feat.key} className="flex items-center gap-2">
                      {feat.included ? (
                        <Check size={12} className="text-status-success flex-shrink-0" strokeWidth={2.5} />
                      ) : (
                        <X size={12} className="text-status-danger/60 flex-shrink-0" strokeWidth={2.5} />
                      )}
                      <span className={`text-[10px] font-mono ${
                        feat.included ? 'text-text-secondary' : 'text-text-dim line-through opacity-60'
                      }`}>
                        {t(`features.${feat.key}`)}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={disabled}
                  onClick={() => !disabled && handleActivate(plan.id)}
                  className={`w-full py-2 rounded-lg text-[10px] font-mono font-semibold transition-all ${
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
      <div className="glass-card p-4 text-center">
        <p className="text-text-muted text-[10px] font-mono">
          {t('customPlanQuestion')}
        </p>
        <p className="text-text-dim text-[9px] font-mono mt-1">
          {t('customPlanHelp', { email: 'gestion@ataraxiaialabs.ai' })}
        </p>
      </div>

      {/* Checkout modal */}
      {checkoutPlan && checkoutPlan !== 'ENTERPRISE' && wompi && (
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
