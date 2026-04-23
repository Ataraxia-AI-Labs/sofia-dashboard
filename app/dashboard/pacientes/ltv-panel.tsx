'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import { useToast } from '@/components/ui/toast'
import {
  RefreshCw, TrendingDown, DollarSign,
  Users, AlertTriangle, Award, BarChart3, Sparkles,
} from 'lucide-react'
import {
  predictAllLTV, getLTVRankings, getLTVInsights, getCohortAnalysis, getAtRiskPatients,
} from '@/lib/api/ltv'
import { LTVTierInline, TIER_CONFIG, TREND_CONFIG } from '@/components/ltv-tier-badge'
import { formatCurrency } from '@/lib/api/helpers'
import type { LTVPrediction, LTVInsights, CohortData, LTVTier } from '@/types'

// ============================================================
// LTV PANEL (P5-12)
// Lifetime Value predictions, rankings, cohorts, at-risk
// ============================================================

interface LTVPanelProps {
  orgId: string
}

export default function LTVPanel({ orgId }: LTVPanelProps) {
  const t = useTranslations('ltv')
  const toast = useToast()

  const [rankings, setRankings] = useState<LTVPrediction[]>([])
  const [insights, setInsights] = useState<LTVInsights | null>(null)
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [atRisk, setAtRisk] = useState<LTVPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [rank, ins, coh, risk] = await Promise.allSettled([
        getLTVRankings(orgId),
        getLTVInsights(orgId),
        getCohortAnalysis(orgId),
        getAtRiskPatients(orgId),
      ])
      if (rank.status === 'fulfilled') setRankings(rank.value)
      if (ins.status === 'fulfilled') setInsights(ins.value)
      if (coh.status === 'fulfilled') setCohorts(coh.value)
      if (risk.status === 'fulfilled') setAtRisk(risk.value)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      const result = await predictAllLTV(orgId)
      if (result) {
        toast.success(t('recalcComplete', { count: result.predicted }))
      }
      loadData()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('recalcError'))
    }
    setRecalculating(false)
  }

  // Tier distribution for visualization
  const tierOrder: LTVTier[] = ['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE']
  const tierDist = insights?.tier_distribution ?? {} as Record<LTVTier, number>
  const totalDistribution = insights
    ? tierOrder.reduce((sum, tier) => sum + (tierDist[tier] || 0), 0)
    : 0

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-3 animate-pulse">
              <div className="h-8 bg-surface-3 rounded w-8 mb-2" />
              <div className="h-5 bg-surface-3 rounded w-20 mb-1" />
              <div className="h-3 bg-surface-3 rounded w-28" />
            </div>
          ))}
        </div>
        <div className="glass-card p-4 animate-pulse">
          <div className="h-48 bg-surface-3 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-body text-text-dim">{t('subtitle')}</p>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-xs font-body font-semibold hover:bg-brand-purple/15 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
          {recalculating ? t('recalculating') : t('recalculate')}
        </button>
      </div>

      {/* INSIGHT CARDS */}
      {insights && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <InsightCard
            icon={<DollarSign size={16} />}
            color="text-brand-gold"
            value={formatCurrency(insights.avg_ltv)}
            label={t('insights.avgLTV')}
          />
          <InsightCard
            icon={<Sparkles size={16} />}
            color="text-brand-purple"
            value={formatCurrency(insights.total_predicted_revenue)}
            label={t('insights.totalPredicted')}
          />
          <InsightCard
            icon={<Award size={16} />}
            color="text-status-success"
            value={insights.best_channel || '--'}
            label={t('insights.bestChannel')}
            subValue={formatCurrency(insights.best_channel_avg_ltv)}
          />
          <InsightCard
            icon={<Users size={16} />}
            color="text-brand-cyan"
            value={totalDistribution.toString()}
            label={t('insights.totalPredictions')}
          />
        </div>
      )}

      {/* TIER DISTRIBUTION */}
      {insights && totalDistribution > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-mono font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-brand-purple" />
            {t('tierDistribution')}
          </h3>
          {/* Visual bar */}
          <div className="flex rounded-md overflow-hidden h-8 mb-4">
            {tierOrder.map(tier => {
              const count = tierDist[tier] || 0
              const pct = totalDistribution > 0 ? (count / totalDistribution) * 100 : 0
              if (pct === 0) return null
              const cfg = TIER_CONFIG[tier]
              return (
                <div
                  key={tier}
                  className={`relative ${cfg.gradient.includes('from-') ? `bg-gradient-to-r ${cfg.gradient}` : cfg.gradient} flex items-center justify-center group cursor-default`}
                  style={{ width: `${pct}%`, minWidth: pct > 3 ? undefined : '24px' }}
                  title={`${cfg.label}: ${count}`}
                >
                  {pct > 8 && (
                    <span className="text-[10px] font-bold text-white/90 drop-shadow-sm">
                      {cfg.emoji} {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {tierOrder.map(tier => {
              const count = tierDist[tier] || 0
              const cfg = TIER_CONFIG[tier]
              return (
                <div key={tier} className="flex items-center gap-1.5">
                  <span className="text-xs">{cfg.emoji}</span>
                  <span className={`text-[11px] font-semibold ${cfg.textColor}`}>{cfg.label}</span>
                  <span className="text-[13px] font-body text-text-dim">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TOP 10 RANKINGS */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-mono font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Award size={14} className="text-brand-gold" />
          {t('topPatients')}
        </h3>
        {rankings.length === 0 ? (
          <div className="text-center py-8">
            <Award size={28} className="text-text-dim mx-auto mb-2" />
            <p className="text-xs font-body text-text-muted">{t('noRankings')}</p>
            <p className="text-[12px] font-body text-text-dim mt-1">{t('noRankingsHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2/50 border border-border/50 hover:border-border transition-colors group"
              >
                {/* Rank */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  idx === 0 ? 'bg-brand-gold/15 text-brand-gold border border-brand-gold/25' :
                  idx === 1 ? 'bg-text-muted/10 text-text-muted border border-text-muted/20' :
                  idx === 2 ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20' :
                  'bg-surface-3 text-text-dim border border-border'
                }`}>
                  #{idx + 1}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-text-primary truncate group-hover:text-brand-purple-light transition-colors">
                    {p.patient_name}
                  </p>
                </div>

                {/* Tier badge */}
                <LTVTierInline
                  tier={p.ltv_tier}
                  predictedValue={p.predicted_ltv_12m}
                  trend={p.trend}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AT-RISK PATIENTS */}
      {atRisk.length > 0 && (
        <div className="glass-card p-4 border-status-danger/20">
          <h3 className="text-sm font-mono font-semibold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-status-danger" />
            {t('atRisk')}
          </h3>
          <div className="space-y-2">
            {atRisk.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-status-danger/5 border border-status-danger/15 hover:border-status-danger/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center">
                  <TrendingDown size={14} className="text-status-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-text-primary truncate">{p.patient_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LTVTierInline tier={p.ltv_tier} />
                    <span className="text-[10px] text-status-danger font-semibold flex items-center gap-0.5">
                      <TrendingDown size={9} /> {t('declining')}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-body font-semibold text-text-primary">
                    {formatCurrency(p.predicted_ltv_12m)}
                  </span>
                  <p className="text-[9px] text-text-dim">{t('predicted12m')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COHORT ANALYSIS */}
      {cohorts.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-mono font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-brand-cyan" />
            {t('cohortAnalysis')}
          </h3>
          {/* Visual bar chart */}
          <div className="space-y-2">
            {(() => {
              const maxLtv = Math.max(...cohorts.map(c => c.avg_ltv), 1)
              return cohorts.map((c) => {
                const barWidth = (c.avg_ltv / maxLtv) * 100
                return (
                  <div key={c.cohort_month} className="flex items-center gap-3">
                    <span className="text-[11px] text-text-dim w-16 flex-shrink-0 font-body">
                      {c.cohort_month}
                    </span>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-surface-3 rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-md bg-brand-purple/40 transition-all duration-700 flex items-center px-2"
                          style={{ width: `${Math.max(barWidth, 4)}%` }}
                        >
                          {barWidth > 20 && (
                            <span className="text-[9px] font-bold text-white/90 whitespace-nowrap">
                              {formatCurrency(c.avg_ltv)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right w-20">
                      <span className="text-[13px] font-body text-text-muted">
                        {barWidth <= 20 ? formatCurrency(c.avg_ltv) : ''}
                      </span>
                      <span className="text-[9px] text-text-dim ml-1">({c.patient_count})</span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Empty state when no data at all */}
      {!insights && rankings.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-brand-purple" />
          </div>
          <h3 className="text-sm font-mono font-semibold text-text-primary mb-1">{t('noData')}</h3>
          <p className="text-xs font-body text-text-dim max-w-xs mx-auto">{t('noDataHint')}</p>
        </div>
      )}
    </div>
  )
}

function InsightCard({ icon, color, value, label, subValue }: {
  icon: React.ReactNode
  color: string
  value: string
  label: string
  subValue?: string
}) {
  return (
    <div className="glass-card p-3">
      <div className={`w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center ${color} mb-2`}>
        {icon}
      </div>
      <div className="text-base font-bold font-mono text-text-primary leading-tight">{value}</div>
      {subValue && <div className="text-[12px] font-body text-text-dim">{subValue}</div>}
      <div className="text-[12px] font-body text-text-muted mt-0.5">{label}</div>
    </div>
  )
}
