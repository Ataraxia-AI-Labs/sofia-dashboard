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
import {
  CreditCard,
  CalendarDays,
  Receipt,
  AlertTriangle,
  ArrowRight,
  X,
  Loader2,
} from 'lucide-react'

/* ── Helpers ── */

function formatCOP(amount: number): string {
  return '$' + amount.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Activa', cls: 'bg-status-success/15 text-status-success' },
  PAST_DUE: { label: 'Pago pendiente', cls: 'bg-status-warning/15 text-status-warning' },
  GRACE_PERIOD: { label: 'Periodo de gracia', cls: 'bg-status-danger/15 text-status-danger' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-text-dim/15 text-text-dim' },
  EXPIRED: { label: 'Expirada', cls: 'bg-text-dim/15 text-text-dim' },
}

const INVOICE_BADGE: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Pagada', cls: 'bg-status-success/15 text-status-success' },
  PENDING: { label: 'Pendiente', cls: 'bg-status-warning/15 text-status-warning' },
  FAILED: { label: 'Fallida', cls: 'bg-status-danger/15 text-status-danger' },
  REFUNDED: { label: 'Reembolsada', cls: 'bg-status-info/15 text-status-info' },
  VOID: { label: 'Anulada', cls: 'bg-text-dim/15 text-text-dim' },
}

/* ── Component ── */

export default function FacturacionPage() {
  const { orgId } = useOrg()
  const router = useRouter()

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

  /* ── Handlers ── */

  const handleCardTokenized = async (token: string) => {
    if (!wompiCfg?.acceptance_token) return
    setActionError(null)
    const res = await updatePaymentMethod(orgId, token, wompiCfg.acceptance_token)
    if (res.exito) {
      setShowCardModal(false)
      load()
    } else {
      setActionError(res.error || 'Error actualizando metodo de pago')
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
      setActionError(res.error || 'Error cancelando suscripcion')
    }
    setCancelling(false)
  }

  /* ── Loading skeleton ── */

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-4 bg-surface-3 rounded w-40 mb-4" />
            <div className="h-3 bg-surface-3 rounded w-64 mb-2" />
            <div className="h-3 bg-surface-3 rounded w-48" />
          </div>
        ))}
      </div>
    )
  }

  /* ── No subscription CTA ── */

  if (!sub) {
    return (
      <div className="max-w-[900px] mx-auto space-y-6">
        <div className="glass-card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center mx-auto mb-4">
            <CreditCard size={28} className="text-brand-purple" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            No tienes una suscripcion activa
          </h3>
          <p className="text-xs text-text-dim mb-5">
            Elige un plan para desbloquear todas las funcionalidades de SofIA.
          </p>
          <button
            onClick={() => router.push('/dashboard/planes')}
            className="px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple-dark transition-colors inline-flex items-center gap-1.5"
          >
            Ver planes <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  /* ── Derived values ── */

  const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.ACTIVE
  const billingLabel = sub.billing_cycle === 'ANNUAL' ? 'anual' : 'mensual'
  const paymentLabel = sub.payment_method_brand && sub.payment_method_last_four
    ? `${sub.payment_method_brand} ****${sub.payment_method_last_four}`
    : 'No registrado'
  const isBasic = sub.plan === 'BASIC'
  const usagePercent = usage?.percent ?? 0
  const usageWarning = usagePercent > 80

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {/* ── Section 1: Plan actual ── */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Plan actual</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Plan</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-text-primary">{sub.plan}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Precio</p>
            <p className="text-sm font-semibold text-text-primary mt-1">
              {formatCOP(sub.amount_cop)} <span className="text-text-dim font-normal">/ {billingLabel}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Proximo cobro</p>
            <p className="text-sm font-semibold text-text-primary mt-1 flex items-center gap-1.5">
              <CalendarDays size={13} className="text-text-dim" />
              {formatDate(sub.next_billing_date)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Metodo de pago</p>
            <p className="text-sm font-semibold text-text-primary mt-1 flex items-center gap-1.5">
              <CreditCard size={13} className="text-text-dim" />
              {paymentLabel}
            </p>
          </div>
        </div>

        {sub.cancel_at_period_end && (
          <div className="mt-4 px-3 py-2 rounded-xl bg-status-warning/10 border border-status-warning/20 text-xs text-status-warning flex items-center gap-2">
            <AlertTriangle size={14} />
            Se cancelara el {formatDate(sub.current_period_end)}
          </div>
        )}
      </div>

      {/* ── Section 2: Uso del mes (BASIC only) ── */}
      {isBasic && usage && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Uso del mes</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {usage.message_count.toLocaleString('es-CO')} de{' '}
                {usage.message_limit?.toLocaleString('es-CO') ?? 'ilimitados'} mensajes usados
              </span>
              <span className={`text-xs font-semibold ${usageWarning ? 'text-status-warning' : 'text-text-dim'}`}>
                {usagePercent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usageWarning ? 'bg-status-warning' : 'bg-brand-purple'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {usageWarning && (
              <p className="text-[10px] text-status-warning flex items-center gap-1">
                <AlertTriangle size={11} />
                Estas cerca del limite. Considera actualizar tu plan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Section 3: Actions ── */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Acciones</h3>
        {actionError && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger">
            {actionError}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/dashboard/planes')}
            className="px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple-dark transition-colors"
          >
            Cambiar plan
          </button>
          <button
            onClick={() => { setActionError(null); setShowCardModal(true) }}
            className="px-4 py-2 rounded-xl bg-surface-3 border border-border text-text-primary text-xs font-semibold hover:border-brand-purple/30 transition-colors"
          >
            Actualizar tarjeta
          </button>
          {!sub.cancel_at_period_end && sub.status !== 'CANCELLED' && (
            <button
              onClick={() => { setActionError(null); setShowCancelModal(true) }}
              className="px-4 py-2 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-semibold hover:bg-status-danger/20 transition-colors"
            >
              Cancelar suscripcion
            </button>
          )}
        </div>
      </div>

      {/* ── Section 4: Historial de facturas ── */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Receipt size={15} className="text-text-dim" />
          Historial de facturas
        </h3>
        {invoices.length === 0 ? (
          <p className="text-xs text-text-dim py-4 text-center">No hay facturas registradas.</p>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-4 gap-3 pb-2 border-b border-border">
              {['Fecha', 'Monto', 'Estado', 'Periodo'].map(h => (
                <span key={h} className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {h}
                </span>
              ))}
            </div>
            {/* Rows */}
            {invoices.map(inv => {
              const invBadge = INVOICE_BADGE[inv.status] || INVOICE_BADGE.PENDING
              return (
                <div key={inv.id} className="grid grid-cols-4 gap-3 py-2.5 border-b border-border last:border-0 items-center">
                  <span className="text-xs text-text-primary">{formatDate(inv.created_at)}</span>
                  <span className="text-xs font-semibold text-text-primary">{formatCOP(inv.amount_cop)}</span>
                  <span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${invBadge.cls}`}>
                      {invBadge.label}
                    </span>
                  </span>
                  <span className="text-xs text-text-dim">
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

      {/* ── Modal: Actualizar tarjeta ── */}
      {showCardModal && wompiCfg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Actualizar tarjeta</h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
              >
                <X size={14} />
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

      {/* ── Modal: Cancelar suscripcion ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-status-danger" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Estas seguro?</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-5">
              Tu suscripcion permanecera activa hasta el final del periodo actual
              ({formatDate(sub.current_period_end)}). Despues de esa fecha perderas acceso
              a las funcionalidades del plan {sub.plan}.
            </p>
            {actionError && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-status-danger/10 border border-status-danger/20 text-xs text-status-danger">
                {actionError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-3 border border-border text-text-primary text-xs font-semibold hover:border-brand-purple/30 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-semibold hover:bg-status-danger/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {cancelling && <Loader2 size={13} className="animate-spin" />}
                Confirmar cancelacion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
