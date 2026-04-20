'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { getPriceSuggestions, applyPriceSuggestion, rejectPriceSuggestion, getPricingInsights } from '@/lib/api/pricing'
import { formatCurrency } from '@/lib/api/helpers'
import type { PriceSuggestion, PricingInsights } from '@/types'
import { DollarSign, Check, X, TrendingUp, TrendingDown, RefreshCw, BarChart3, Filter } from 'lucide-react'

interface PricingSuggestionsPanelProps {
  orgId: string
}

export default function PricingSuggestionsPanel({ orgId }: PricingSuggestionsPanelProps) {
  const t = useTranslations('pricing')
  const tCommon = useTranslations('common')

  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([])
  const [insights, setInsights] = useState<PricingInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [sugData, insData] = await Promise.all([
        getPriceSuggestions(orgId, statusFilter || undefined),
        getPricingInsights(orgId),
      ])
      setSuggestions(sugData)
      setInsights(insData)
    } catch {
      // Non-critical
    }
    setLoading(false)
  }, [orgId, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  const handleApply = async (id: string) => {
    const ok = await applyPriceSuggestion(orgId, id)
    if (ok) loadData()
  }

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return
    const ok = await rejectPriceSuggestion(orgId, id, rejectReason)
    if (ok) {
      setRejectingId(null)
      setRejectReason('')
      loadData()
    }
  }

  const handleBatchApprove = async () => {
    const pending = suggestions.filter(s => s.status === 'PENDING')
    for (const s of pending) {
      await applyPriceSuggestion(orgId, s.id)
    }
    loadData()
  }

  const pctChange = (base: number, suggested: number) => {
    if (base === 0) return 0
    return ((suggested - base) / base) * 100
  }

  const STATUS_FILTERS = ['PENDING', 'APPLIED', 'REJECTED']

  return (
    <div className="space-y-5">
      {/* Insights Cards */}
      {insights && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <InsightCard
            icon={<BarChart3 size={16} />}
            label={t('totalSuggestions')}
            value={insights.total_suggestions.toString()}
            gradient="from-brand-purple to-brand-purple-dark"
          />
          <InsightCard
            icon={<Check size={16} />}
            label={t('applied')}
            value={insights.applied_count.toString()}
            gradient="from-status-success to-status-success"
          />
          <InsightCard
            icon={<X size={16} />}
            label={t('rejected')}
            value={insights.rejected_count.toString()}
            gradient="from-status-danger to-status-danger"
          />
          <InsightCard
            icon={<TrendingDown size={16} />}
            label={t('avgDiscount')}
            value={`${insights.avg_discount_pct.toFixed(1)}%`}
            gradient="from-status-warning to-brand-gold"
          />
          <InsightCard
            icon={<DollarSign size={16} />}
            label={t('revenueImpact')}
            value={formatCurrency(insights.revenue_impact)}
            gradient="from-brand-cyan to-brand-cyan"
          />
        </div>
      )}

      {/* Most Adjusted Services */}
      {insights && insights.most_adjusted_services.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold font-mono text-text-primary mb-3">{t('mostAdjusted')}</h3>
          <div className="flex flex-wrap gap-2">
            {insights.most_adjusted_services.map((s, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-text-muted">
                {s.service} <span className="font-body text-brand-purple ml-1">{s.adjustments}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-text-dim" />
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                  : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
              }`}
            >
              {t(`statuses.${status}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {statusFilter === 'PENDING' && suggestions.length > 0 && (
            <button
              onClick={handleBatchApprove}
              className="px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs font-semibold hover:bg-status-success/20 transition-colors"
            >
              {t('batchApprove')}
            </button>
          )}
          <button
            onClick={loadData}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Suggestions Table */}
      {loading && suggestions.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
              <div className="h-4 bg-surface-3 rounded w-72" />
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <DollarSign size={32} className="mx-auto text-text-dim mb-3" />
          <p className="text-text-muted text-sm">{t('noSuggestions')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => {
            const change = pctChange(s.base_price, s.suggested_price)
            const isDiscount = change < 0
            return (
              <div key={s.id} className="glass-card p-4 hover:border-border-2 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-text-primary">{s.service_id}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        s.status === 'PENDING' ? 'bg-status-warning/10 border-status-warning/20 text-status-warning'
                        : s.status === 'APPLIED' ? 'bg-status-success/10 border-status-success/20 text-status-success'
                        : 'bg-surface-3 border-border text-text-dim'
                      }`}>
                        {t(`statuses.${s.status}`)}
                      </span>
                    </div>

                    {/* Price comparison */}
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-text-dim">{t('basePriceLabel')}: </span>
                        <span className="font-body text-text-muted">{formatCurrency(s.base_price)}</span>
                      </div>
                      <span className="text-text-dim">→</span>
                      <div>
                        <span className="text-text-dim">{t('suggestedPriceLabel')}: </span>
                        <span className={`font-body font-semibold ${isDiscount ? 'text-status-warning' : 'text-status-success'}`}>
                          {formatCurrency(s.suggested_price)}
                        </span>
                      </div>
                      <span className={`flex items-center gap-0.5 font-body text-[11px] ${isDiscount ? 'text-status-warning' : 'text-status-success'}`}>
                        {isDiscount ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                        {change > 0 ? '+' : ''}{change.toFixed(1)}%
                      </span>
                    </div>

                    {/* Factor breakdown */}
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-text-dim">
                      <span>D: {s.demand_factor.toFixed(2)}</span>
                      <span>S: {s.segment_factor.toFixed(2)}</span>
                      <span>T: {s.temporal_factor.toFixed(2)}</span>
                      <span className="text-text-muted">{t('confidence')}: {(s.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {s.status === 'PENDING' && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleApply(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-semibold hover:bg-status-success/20 transition-colors"
                      >
                        {t('approve')}
                      </button>
                      {rejectingId === s.id ? (
                        <div className="flex gap-1">
                          <input
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder={t('rejectReason')}
                            className="w-32 px-2 py-1 rounded-lg bg-surface-2 border border-border text-[10px] text-text-primary placeholder:text-text-dim"
                            onKeyDown={e => e.key === 'Enter' && handleReject(s.id)}
                          />
                          <button onClick={() => handleReject(s.id)} className="px-2 py-1 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-[10px]">
                            <Check size={10} />
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectReason('') }} className="px-2 py-1 rounded-lg bg-surface-3 border border-border text-text-dim text-[10px]">
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRejectingId(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-surface-3 border border-border text-text-dim text-[10px] font-semibold hover:text-text-muted transition-colors"
                        >
                          {t('reject')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InsightCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string; gradient: string }) {
  return (
    <div className="glass-card p-4">
      <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple mb-2">
        {icon}
      </div>
      <div className="text-lg font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[13px] font-body text-text-muted mt-0.5">{label}</div>
    </div>
  )
}
