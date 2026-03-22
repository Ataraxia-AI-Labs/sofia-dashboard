'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOrg } from '@/lib/org-context'
import {
  fetchSubscription,
  fetchInvoices,
  fetchUsage,
  updatePaymentMethod,
  cancelSubscription,
  fetchWompiConfig,
} from '@/lib/api/subscriptions'
import CardTokenizationForm from '@/components/card-tokenization-form'
import type { Subscription, Invoice, UsageData, WompiConfig } from '@/types'
import { formatCOP } from '@/lib/api'
import {
  CreditCard,
  CalendarDays,
  Receipt,
  AlertTriangle,
  ArrowRight,
  X,
  Loader2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-status-success/15 text-status-success',
  PAST_DUE: 'bg-status-warning/15 text-status-warning',
  GRACE_PERIOD: 'bg-status-danger/15 text-status-danger',
  CANCELLED: 'bg-text-dim/15 text-text-dim',
  EXPIRED: 'bg-text-dim/15 text-text-dim',
}

const INVOICE_STYLE: Record<string, string> = {
  PAID: 'bg-status-success/15 text-status-success',
  PENDING: 'bg-status-warning/15 text-status-warning',
  FAILED: 'bg-status-danger/15 text-status-danger',
  REFUNDED: 'bg-status-info/15 text-status-info',
  VOID: 'bg-text-dim/15 text-text-dim',
}

/* -- Component -- */

export default function FacturacionPage() {
  const { orgId } = useOrg()
  const router = useRouter()
  const t = useTranslations('billing')
  const tCommon = useTranslations('common')

  const [sub, setSub] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [wompiCfg, setWompiCfg] = useState<WompiConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const [showCardModal, setShowCardModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, inv, u, w] = await Promise.all([
        fetchSubscription(orgId),
        fetchInvoices(orgId),
        fetchUsage(orgId),
        fetchWompiConfig(),
      ])
      setSub(s)
      setInvoices(inv)
      setUsage(u)
      setWompiCfg(w)
    } catch {
      /* silently degrade — sections show empty states */
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  /* -- Handlers -- */

  const handleCardTokenized = async (token: string) => {
    if (!wompiCfg?.acceptance_token) return
    setActionError(null)
    const res = await updatePaymentMethod(orgId, token, wompiCfg.acceptance_token)
    if (res.exito) {
      setShowCardModal(false)
      load()
    } else {
      setActionError(res.error || t('updatePaymentError'))
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setActionError(null)
    const res = await cancelSubscription(orgId)
    if (res.exito) {
      setShowCancelModal(false)
      load()
    } else {
      setActionError(res.error || t('cancelError'))
    }
    setCancelling(false)
  }

  /* -- Loading skeleton -- */

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-3 bg-surface-3 rounded w-40 mb-3" />
            <div className="h-2.5 bg-surface-3 rounded w-64 mb-2" />
            <div className="h-2.5 bg-surface-3 rounded w-48" />
          </div>
        ))}
      </div>
    )
  }

  /* -- No subscription CTA -- */

  if (!sub) {
    return (
      <div className="max-w-[900px] mx-auto space-y-4">
        <div className="glass-card p-5 text-center">
          <div className="w-12 h-12 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center mx-auto mb-3">
            <CreditCard size={24} className="text-brand-purple" />
          </div>
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-1">
            {t('noSubscription')}
          </h3>
          <p className="text-[9px] font-mono text-text-dim mb-4">
            {t('noSubscriptionDesc')}
          </p>
          <button
            onClick={() => router.push('/dashboard/planes')}
            className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors inline-flex items-center gap-1.5"
          >
            {t('viewPlans')} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    )
  }

  /* -- Derived values -- */

  const badgeCls = STATUS_STYLE[sub.status] || STATUS_STYLE.ACTIVE
  const badgeLabel = t(`subStatuses.${sub.status}`)
  const billingLabel = sub.billing_cycle === 'ANNUAL' ? t('annual') : t('monthly')
  const paymentLabel = sub.payment_method_brand && sub.payment_method_last_four
    ? `${sub.payment_method_brand} ****${sub.payment_method_last_four}`
    : t('notRegistered')
  const isStarter = sub.plan === 'STARTER'
  const usagePercent = usage?.percent ?? 0
  const usageWarning = usagePercent > 80

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      {/* -- Section 1: Plan actual -- */}
      <div className="glass-card p-4">
        <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3">{t('currentPlan')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[9px] font-mono font-semibold text-text-muted uppercase tracking-wider">{t('plan')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono font-semibold text-text-primary">{sub.plan}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${badgeCls}`}>
                {badgeLabel}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-mono font-semibold text-text-muted uppercase tracking-wider">{t('price')}</p>
            <p className="text-[10px] font-mono font-semibold text-text-primary mt-1">
              {formatCOP(sub.amount_cop)} <span className="text-text-dim font-normal">/ {billingLabel}</span>
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono font-semibold text-text-muted uppercase tracking-wider">{t('nextCharge')}</p>
            <p className="text-[10px] font-mono font-semibold text-text-primary mt-1 flex items-center gap-1.5">
              <CalendarDays size={11} className="text-text-dim" />
              {formatDate(sub.next_billing_date)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono font-semibold text-text-muted uppercase tracking-wider">{t('paymentMethod')}</p>
            <p className="text-[10px] font-mono font-semibold text-text-primary mt-1 flex items-center gap-1.5">
              <CreditCard size={11} className="text-text-dim" />
              {paymentLabel}
            </p>
          </div>
        </div>

        {sub.cancel_at_period_end && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-status-warning/10 border border-status-warning/20 text-[10px] font-mono text-status-warning flex items-center gap-2">
            <AlertTriangle size={12} />
            {t('cancelAt', { date: formatDate(sub.current_period_end) })}
          </div>
        )}
      </div>

      {/* -- Section 2: Uso del mes (STARTER only) -- */}
      {isStarter && usage && (
        <div className="glass-card p-4">
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3">{t('monthUsage')}</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-text-muted">
                {t('messagesUsed', { used: usage.message_count.toLocaleString(), limit: usage.message_limit?.toLocaleString() ?? '∞' })}
              </span>
              <span className={`text-[10px] font-mono font-semibold ${usageWarning ? 'text-status-warning' : 'text-text-dim'}`}>
                {usagePercent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usageWarning ? 'bg-status-warning' : 'bg-brand-purple'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {usageWarning && (
              <p className="text-[9px] font-mono text-status-warning flex items-center gap-1">
                <AlertTriangle size={10} />
                {t('nearLimit')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* -- Section 3: Actions -- */}
      <div className="glass-card p-4">
        <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3">{t('actions')}</h3>
        {actionError && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-status-danger/10 border border-status-danger/20 text-[10px] font-mono text-status-danger">
            {actionError}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/dashboard/planes')}
            className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors"
          >
            {t('changePlan')}
          </button>
          <button
            onClick={() => { setActionError(null); setShowCardModal(true) }}
            className="px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-[10px] font-mono font-semibold hover:border-brand-purple/30 transition-colors"
          >
            {t('updateCard')}
          </button>
          {!sub.cancel_at_period_end && sub.status !== 'CANCELLED' && (
            <button
              onClick={() => { setActionError(null); setShowCancelModal(true) }}
              className="px-3 py-1.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-[10px] font-mono font-semibold hover:bg-status-danger/20 transition-colors"
            >
              {t('cancelSubscription')}
            </button>
          )}
        </div>
      </div>

      {/* -- Section 4: Historial de facturas -- */}
      <div className="glass-card p-4">
        <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3 flex items-center gap-2">
          <Receipt size={13} className="text-text-dim" />
          {t('invoiceHistory')}
        </h3>
        {invoices.length === 0 ? (
          <p className="text-[10px] font-mono text-text-dim py-3 text-center">{t('noInvoices')}</p>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-border">
              {[t('invoiceDate'), t('invoiceAmount'), t('invoiceStatus'), t('invoicePeriod')].map(h => (
                <span key={h} className="text-[9px] font-mono font-semibold text-text-muted uppercase tracking-wider">
                  {h}
                </span>
              ))}
            </div>
            {/* Rows */}
            {invoices.map(inv => {
              const invCls = INVOICE_STYLE[inv.status] || INVOICE_STYLE.PENDING
              return (
                <div key={inv.id} className="grid grid-cols-4 gap-2 py-2 border-b border-border last:border-0 items-center">
                  <span className="text-[10px] font-mono text-text-primary">{formatDate(inv.created_at)}</span>
                  <span className="text-[10px] font-mono font-semibold text-text-primary">{formatCOP(inv.amount_cop)}</span>
                  <span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${invCls}`}>
                      {t(`invoiceStatuses.${inv.status}`)}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-text-dim">
                    {inv.period_start && inv.period_end
                      ? `${formatDate(inv.period_start)} - ${formatDate(inv.period_end)}`
                      : '-'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* -- Modal: Actualizar tarjeta -- */}
      {showCardModal && wompiCfg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary">{t('updateCard')}</h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="w-6 h-6 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <CardTokenizationForm
              wompiPublicKey={wompiCfg.public_key}
              wompiSandbox={wompiCfg.sandbox}
              onTokenized={handleCardTokenized}
              onError={(err) => setActionError(err)}
            />
          </div>
        </div>
      )}

      {/* -- Modal: Cancelar suscripcion -- */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-4 w-full max-w-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center">
                <AlertTriangle size={18} className="text-status-danger" />
              </div>
              <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary">{t('areYouSure')}</h3>
            </div>
            <p className="text-[10px] font-mono text-text-muted leading-relaxed mb-4">
              {t('cancelDesc', { date: formatDate(sub.current_period_end), plan: sub.plan })}
            </p>
            {actionError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-status-danger/10 border border-status-danger/20 text-[10px] font-mono text-status-danger">
                {actionError}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-text-primary text-[10px] font-mono font-semibold hover:border-brand-purple/30 transition-colors"
              >
                {tCommon('back')}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-3 py-1.5 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-[10px] font-mono font-semibold hover:bg-status-danger/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {cancelling && <Loader2 size={11} className="animate-spin" />}
                {t('confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
