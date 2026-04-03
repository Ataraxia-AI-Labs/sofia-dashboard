'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import * as Sentry from '@sentry/nextjs'
import { fetchPayments as apiFetchPayments, fetchRevenueAttribution } from '@/lib/api/payments'
import { formatCOP, timeAgo } from '@/lib/api'
import type { Payment, RevenueAttribution } from '@/types'
import {
  DollarSign, CreditCard, TrendingUp, Clock,
  RefreshCw, ExternalLink, BarChart3, Zap
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Pagado', color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20' },
  PENDING: { label: 'Pendiente', color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/20' },
  DECLINED: { label: 'Rechazado', color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20' },
  ERROR: { label: 'Error', color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/20' },
  EXPIRED: { label: 'Expirado', color: 'text-text-dim', bg: 'bg-surface-3 border-border' },
  VOIDED: { label: 'Anulado', color: 'text-text-dim', bg: 'bg-surface-3 border-border' },
}

export default function PagosPage() {
  const { orgId, branchId } = useOrg()
  const toast = useToast()
  const t = useTranslations('payments')
  const tCommon = useTranslations('common')
  const [payments, setPayments] = useState<Payment[]>([])
  const [attribution, setAttribution] = useState<RevenueAttribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pagos' | 'attribution'>('pagos')
  const [statusFilter, setStatusFilter] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [paymentsData, attrData] = await Promise.all([
        apiFetchPayments(orgId, { status: statusFilter || undefined, branchId }),
        fetchRevenueAttribution(orgId, 30, branchId),
      ])
      setPayments(paymentsData)
      setAttribution(attrData)
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('loadError'))
    }
    setLoading(false)
  }, [orgId, statusFilter, branchId])

  useEffect(() => { loadData() }, [loadData])

  const resumen = attribution?.resumen ?? {} as RevenueAttribution['resumen']
  const attr = attribution?.attribution ?? {} as RevenueAttribution['attribution']

  return (
    <div className="space-y-4 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')} & Revenue</h2>
          <p className="text-[9px] font-mono text-text-dim">{payments.length} transacciones</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-lg border border-border p-0.5">
            <button onClick={() => setActiveTab('pagos')} className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors ${activeTab === 'pagos' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'}`}>
              <CreditCard size={12} className="inline mr-1" />Pagos
            </button>
            <button onClick={() => setActiveTab('attribution')} className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors ${activeTab === 'attribution' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'}`}>
              <BarChart3 size={12} className="inline mr-1" />Attribution
            </button>
          </div>
          <button onClick={loadData} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
              <DollarSign size={16} className="text-brand-purple" />
            </div>
            <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">Revenue Total</span>
          </div>
          <div className="text-xs font-bold text-status-success font-mono">{formatCOP(resumen.total_revenue || 0)}</div>
          <div className="text-[10px] text-text-dim mt-1">{resumen.total_pagos || 0} pagos</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
              <Clock size={16} className="text-brand-purple" />
            </div>
            <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">Pendiente</span>
          </div>
          <div className="text-sm font-bold text-status-warning font-mono">{formatCOP(resumen.total_pending || 0)}</div>
          <div className="text-[10px] text-text-dim mt-1">{resumen.pagos_pendientes || 0} pendientes</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-brand-purple" />
            </div>
            <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">Ticket Promedio</span>
          </div>
          <div className="text-xs font-bold text-brand-purple font-mono">{formatCOP(resumen.ticket_promedio || 0)}</div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
              <Zap size={16} className="text-brand-purple" />
            </div>
            <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">ROI</span>
          </div>
          <div className="text-xs font-bold text-status-info font-mono">{resumen.roi_estimado || 0}x</div>
          <div className="text-[10px] text-text-dim mt-1">IA: ${resumen.costo_ia_usd || 0} USD</div>
        </div>
      </div>

      {/* TAB: PAGOS */}
      {activeTab === 'pagos' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none">
              <option value="">Todos los estados</option>
              <option value="PAID">Pagados</option>
              <option value="PENDING">Pendientes</option>
              <option value="DECLINED">Rechazados</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] font-mono font-semibold text-text-muted uppercase px-5 py-3">Paciente</th>
                  <th className="text-left text-[10px] font-mono font-semibold text-text-muted uppercase px-5 py-3">Servicio</th>
                  <th className="text-right text-[10px] font-mono font-semibold text-text-muted uppercase px-5 py-3">Monto</th>
                  <th className="text-center text-[10px] font-mono font-semibold text-text-muted uppercase px-5 py-3">Estado</th>
                  <th className="text-center text-[10px] font-mono font-semibold text-text-muted uppercase px-5 py-3">Método</th>
                  <th className="text-right text-[10px] font-mono font-semibold text-text-muted uppercase px-5 py-3">Fecha</th>
                  <th className="text-center text-[10px] font-mono font-semibold text-text-muted uppercase px-5 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {loading && payments.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-3"><div className="h-4 bg-surface-3 rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-text-dim text-[10px] font-mono">{t('noPayments')}</td></tr>
                ) : payments.map((p) => {
                  const status = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-surface-3/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-xs font-mono font-medium text-text-primary">{p.patients?.full_name || 'Sin nombre'}</span>
                        <div className="text-[10px] text-text-dim font-mono">{p.patients?.phone || ''}</div>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-text-muted">{p.service_name}</td>
                      <td className="px-5 py-3 text-right text-xs font-semibold font-mono text-text-primary">{formatCOP(p.amount_cop)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg} ${status.color}`}>{status.label}</span>
                      </td>
                      <td className="px-5 py-3 text-center text-[10px] font-mono text-text-dim">{p.payment_method_type || '—'}</td>
                      <td className="px-5 py-3 text-right text-[10px] font-mono text-text-dim">{timeAgo(p.created_at)}</td>
                      <td className="px-5 py-3 text-center">
                        {p.link_url && (
                          <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:text-brand-purple-light">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ATTRIBUTION */}
      {activeTab === 'attribution' && attribution && (
        <div className="space-y-4">
          {/* Revenue por Canal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">Revenue por Canal</h3>
              {Object.keys(attr.por_canal || {}).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(attr.por_canal || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([canal, amount]) => {
                    const max = Math.max(...Object.values(attr.por_canal || {}) as number[])
                    const pct = max > 0 ? (amount / max) * 100 : 0
                    return (
                      <div key={canal}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted">{canal}</span>
                          <span className="text-text-primary font-semibold font-mono">{formatCOP(amount)}</span>
                        </div>
                        <div className="h-2 bg-void rounded-full overflow-hidden">
                          <div className="h-full bg-brand-purple rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-text-dim text-[10px] font-mono">Sin datos de attribution aun</p>
              )}
            </div>

            <div className="glass-card p-4">
              <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">Revenue por Servicio</h3>
              {Object.keys(attr.por_servicio || {}).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(attr.por_servicio || {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([svc, amount]) => {
                    const max = Math.max(...Object.values(attr.por_servicio || {}) as number[])
                    const pct = max > 0 ? (amount / max) * 100 : 0
                    return (
                      <div key={svc}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted">{svc}</span>
                          <span className="text-text-primary font-semibold font-mono">{formatCOP(amount)}</span>
                        </div>
                        <div className="h-2 bg-void rounded-full overflow-hidden">
                          <div className="h-full bg-status-success rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-text-dim text-[10px] font-mono">Sin datos aun</p>
              )}
            </div>
          </div>

          {/* Revenue por Dia + Time to Payment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">Revenue por Día de la Semana</h3>
              <div className="flex items-end gap-2 h-32">
                {Object.entries(attr.por_dia || {}).map(([day, amount]) => {
                  const max = Math.max(...Object.values(attr.por_dia || {}) as number[], 1)
                  const pct = (amount / max) * 100
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-void rounded-t-md overflow-hidden flex flex-col justify-end" style={{ height: '100px' }}>
                        <div className="bg-brand-purple rounded-t-md transition-all" style={{ height: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-[9px] text-text-dim">{day}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="glass-card p-4">
              <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">Métricas de Attribution</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-text-muted">Tiempo promedio a pago</span>
                  <span className="text-xs font-bold text-text-primary font-mono">{resumen.tiempo_promedio_a_pago_horas || 0}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-text-muted">Costo IA (período)</span>
                  <span className="text-xs font-bold text-status-info font-mono">${resumen.costo_ia_usd || 0} USD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-text-muted">ROI estimado</span>
                  <span className="text-xs font-bold text-status-success font-mono">{resumen.roi_estimado || 0}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-text-muted">Ticket promedio</span>
                  <span className="text-xs font-bold text-brand-purple font-mono">{formatCOP(resumen.ticket_promedio || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Conversaciones */}
          {(attribution.top_conversaciones?.length ?? 0) > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider mb-3">🎯 Conversaciones que Generaron Revenue</h3>
              <div className="space-y-2">
                {attribution.top_conversaciones!.map((conv, i) => (
                  <div key={i} className="bg-void/50 rounded-md px-3 py-2.5 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-text-primary">{conv.patient}</span>
                        <span className="text-[9px] font-mono text-text-dim">-- {conv.service}</span>
                      </div>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5 truncate">{`"${conv.conversation_snippet}"`}</p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="text-xs font-bold text-status-success font-mono">{formatCOP(conv.payment_amount)}</div>
                      <div className="text-[9px] text-text-dim">{conv.paid_at ? timeAgo(conv.paid_at) : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
