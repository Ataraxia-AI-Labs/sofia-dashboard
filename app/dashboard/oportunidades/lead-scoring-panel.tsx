'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Target, Zap, RefreshCw, Loader2,
  Flame, Sun, Snowflake, Skull,
  TrendingUp, User, Phone, BarChart3
} from 'lucide-react'
import { scoreAllLeads, getLeadScores, getLeadInsights, getTopLeads } from '@/lib/api/leads'
import { LeadScoreBadge } from '@/components/lead-score-badge'
import type { LeadScore, LeadInsights, LeadClassification } from '@/types'

// ============================================================
// LEAD SCORING PANEL (P4-02)
// Distribution chart, score all, top leads, insights
// ============================================================

interface LeadScoringPanelProps {
  orgId: string
}

const CLASSIFICATION_ICONS: Record<LeadClassification, { icon: typeof Flame; color: string; bg: string }> = {
  HOT:  { icon: Flame,     color: 'text-orange-400', bg: 'bg-orange-500/10' },
  WARM: { icon: Sun,       color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  COLD: { icon: Snowflake, color: 'text-status-info',   bg: 'bg-status-info/10' },
  DEAD: { icon: Skull,     color: 'text-text-dim',   bg: 'bg-surface-3' },
}

export default function LeadScoringPanel({ orgId }: LeadScoringPanelProps) {
  const t = useTranslations('leadScoring')
  const tCommon = useTranslations('common')

  const [insights, setInsights] = useState<LeadInsights | null>(null)
  const [topLeads, setTopLeads] = useState<LeadScore[]>([])
  const [loading, setLoading] = useState(true)
  const [scoringAll, setScoringAll] = useState(false)
  const [scoringResult, setScoringResult] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [insightsData, topData] = await Promise.all([
        getLeadInsights(orgId),
        getTopLeads(orgId, 10),
      ])
      setInsights(insightsData)
      setTopLeads(topData)
    } catch {
      // Load failed — empty state
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleScoreAll = async () => {
    setScoringAll(true)
    setScoringResult(null)
    try {
      const result = await scoreAllLeads(orgId)
      if (result) {
        setScoringResult(result.message)
        // Reload data after scoring
        loadData()
      }
    } catch {
      // Score all failed — user can retry
    }
    setScoringAll(false)
  }

  const totalScored = insights?.total_scored ?? 0
  const distribution = insights?.distribution ?? { HOT: 0, WARM: 0, COLD: 0, DEAD: 0 }
  const maxDist = Math.max(...Object.values(distribution), 1)

  return (
    <div className="space-y-4">
      {/* Header + Score All */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold font-mono text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Target size={14} className="text-brand-purple" />
            {t('title')}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
              aria-label={tCommon('refresh')}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleScoreAll}
              disabled={scoringAll}
              className="px-3 py-1.5 rounded-md bg-brand-purple text-white text-xs font-mono font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:bg-brand-purple-dark transition-colors"
            >
              {scoringAll ? (
                <><Loader2 size={12} className="animate-spin" /> {t('scoring')}</>
              ) : (
                <><Zap size={12} /> {t('scoreAll')}</>
              )}
            </button>
          </div>
        </div>

        {scoringResult && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs">
            {scoringResult}
          </div>
        )}

        {/* Distribution Chart */}
        {loading && !insights ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-surface-3 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">{t('distribution')}</span>
              <span className="text-[10px] text-text-dim font-mono">{totalScored} {t('leadsScored')}</span>
            </div>
            {(['HOT', 'WARM', 'COLD', 'DEAD'] as LeadClassification[]).map(cls => {
              const cfg = CLASSIFICATION_ICONS[cls]
              const Icon = cfg.icon
              const count = distribution[cls] || 0
              const pct = totalScored > 0 ? ((count / totalScored) * 100).toFixed(0) : '0'
              const barWidth = maxDist > 0 ? (count / maxDist) * 100 : 0

              return (
                <div key={cls}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-md ${cfg.bg} flex items-center justify-center`}>
                        <Icon size={12} className={cfg.color} />
                      </div>
                      <span className="text-xs text-text-muted font-medium">{t(`classifications.${cls}`)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-text-primary">{count}</span>
                      <span className="text-[10px] text-text-dim font-mono">({pct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-void rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cls === 'HOT'  ? 'bg-gradient-to-r from-orange-500/80 to-orange-400' :
                        cls === 'WARM' ? 'bg-gradient-to-r from-amber-500/80 to-amber-400' :
                        cls === 'COLD' ? 'bg-gradient-to-r from-status-info/80 to-status-info' :
                                         'bg-surface-3'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Insights: Top Converting Features */}
        {insights?.top_converting_features && insights.top_converting_features.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={11} className="text-status-success" />
              <span className="text-[10px] font-semibold text-text-muted uppercase">{t('topConvertingFeatures')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {insights.top_converting_features.map((feature, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-status-success/10 border border-status-success/20 text-status-success text-[10px] font-medium"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Average Score */}
        {insights && insights.avg_score > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-dim uppercase font-semibold">{t('avgScore')}</span>
            <span className={`text-sm font-bold font-mono ${
              insights.avg_score >= 75 ? 'text-orange-400' :
              insights.avg_score >= 50 ? 'text-amber-400' :
              insights.avg_score >= 25 ? 'text-status-info' :
              'text-text-dim'
            }`}>
              {insights.avg_score.toFixed(0)}/100
            </span>
          </div>
        )}
      </div>

      {/* Top 10 Hottest Leads */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold font-mono text-text-muted uppercase tracking-wider flex items-center gap-2 mb-3">
          <Flame size={14} className="text-orange-400" />
          {t('topLeads')}
        </h3>

        {loading && topLeads.length === 0 ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-surface-3 rounded-lg" />
            ))}
          </div>
        ) : topLeads.length === 0 ? (
          <div className="text-center py-8">
            <Target size={24} className="text-text-dim mx-auto mb-2" />
            <p className="text-text-dim text-xs">{t('noLeadsScored')}</p>
            <p className="text-text-dim text-[10px] mt-1">{t('noLeadsScoredHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topLeads.map((lead, index) => (
              <div
                key={lead.patient_id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-void/50 border border-border hover:border-border-2 transition-colors"
              >
                {/* Rank */}
                <span className={`text-xs font-bold font-mono w-5 text-center ${
                  index === 0 ? 'text-brand-gold' :
                  index === 1 ? 'text-text-muted' :
                  index === 2 ? 'text-orange-700' :
                  'text-text-dim'
                }`}>
                  {index + 1}
                </span>

                {/* Badge */}
                <LeadScoreBadge
                  score={lead.score}
                  classification={lead.classification}
                  compact
                />

                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User size={10} className="text-text-dim flex-shrink-0" />
                    <span className="text-xs text-text-primary font-medium truncate">
                      {lead.patients?.full_name || t('unknownPatient')}
                    </span>
                  </div>
                  {lead.patients?.phone && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone size={9} className="text-text-dim flex-shrink-0" />
                      <span className="text-[10px] text-text-dim font-mono">{lead.patients.phone}</span>
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className={`text-sm font-bold font-mono ${
                    lead.score >= 75 ? 'text-orange-400' :
                    lead.score >= 50 ? 'text-amber-400' :
                    'text-status-info'
                  }`}>
                    {lead.score}
                  </div>
                  <div className="text-[9px] text-text-dim">/100</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
