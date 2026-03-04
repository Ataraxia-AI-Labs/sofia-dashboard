'use client'

import { useOrg } from '@/lib/org-context'
import { Check, X, Gem, Crown, Zap, Clock } from 'lucide-react'

const PLANS = [
  {
    id: 'BASIC',
    name: 'Basic',
    price: '$149.000',
    period: '/mes',
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
    price: '$349.000',
    period: '/mes',
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
    price: 'Contactar',
    period: '',
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

export default function PlanesPage() {
  const { org } = useOrg()

  const currentPlan = org?.plan || 'TRIAL'
  const trialEndsAt = org?.trial_ends_at

  let trialDaysLeft: number | null = null
  if (currentPlan === 'TRIAL' && trialEndsAt) {
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

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
              <h3 className="text-sm font-semibold text-text-primary">Plan actual: {currentPlan}</h3>
              {currentPlan === 'TRIAL' && trialDaysLeft !== null && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={11} className={trialDaysLeft <= 2 ? 'text-status-danger' : 'text-status-warning'} />
                  <span className={`text-[10px] font-semibold ${trialDaysLeft <= 2 ? 'text-status-danger' : 'text-status-warning'}`}>
                    {trialDaysLeft === 0 ? 'Expira hoy' : `${trialDaysLeft} dias restantes`}
                  </span>
                </div>
              )}
              {currentPlan !== 'TRIAL' && (
                <p className="text-[10px] text-text-dim mt-0.5">Tu plan esta activo</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Plan comparison grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isCurrent = currentPlan === plan.id

          return (
            <div
              key={plan.id}
              className={`glass-card p-5 relative ${
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
                  <span className="text-2xl font-bold text-text-primary">{plan.price}</span>
                  {plan.period && <span className="text-xs text-text-dim">{plan.period}</span>}
                </div>
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
                disabled={isCurrent}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-surface-3 text-text-dim cursor-default'
                    : plan.popular
                    ? 'bg-brand-purple text-white hover:bg-brand-purple-dark'
                    : 'bg-surface-3 border border-border text-text-primary hover:border-brand-purple/30 hover:text-brand-purple'
                }`}
              >
                {isCurrent ? 'Plan actual' : plan.id === 'ENTERPRISE' ? 'Contactar ventas' : 'Activar plan'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Contact CTA */}
      <div className="glass-card p-5 text-center">
        <p className="text-text-muted text-xs">
          ¿Necesitas un plan personalizado o tienes preguntas?
        </p>
        <p className="text-text-dim text-[10px] mt-1">
          Escribenos a <span className="text-brand-purple font-semibold">hola@ataraxiaialabs.ai</span> y te ayudamos.
        </p>
      </div>
    </div>
  )
}
