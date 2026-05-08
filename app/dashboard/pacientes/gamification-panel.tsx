'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import { useToast } from '@/components/ui/toast'
import {
  Trophy, Flame, Star, Gift, Plus,
  RefreshCw, Users, TrendingUp, Zap,
} from 'lucide-react'
import {
  getLeaderboard,
  getTierDistribution,
  getGamificationInsights,
  getRewardsCatalog,
} from '@/lib/api/gamification'
import { GamificationTierInline } from '@/components/gamification-tier-badge'
import type {
  LeaderboardEntry,
  GamificationInsights,
  Reward,
  GamificationTier,
} from '@/types'

// ============================================================
// GAMIFICATION PANEL (P5-06)
// Tier distribution, leaderboard, insights, rewards catalog
// ============================================================

interface GamificationPanelProps {
  orgId: string
}

const TIER_COLORS: Record<GamificationTier, { bg: string; fill: string; text: string }> = {
  BRONZE: { bg: 'bg-brand-gold/15', fill: 'bg-brand-gold', text: 'text-brand-gold' },
  SILVER: { bg: 'bg-text-muted/15', fill: 'bg-text-muted', text: 'text-text-dim' },
  GOLD: { bg: 'bg-status-warning/15', fill: 'bg-status-warning', text: 'text-status-warning' },
  PLATINUM: { bg: 'bg-brand-purple/15', fill: 'bg-brand-purple', text: 'text-brand-purple' },
}

const TIER_ORDER: GamificationTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

const MEDAL_ICONS = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']

export default function GamificationPanel({ orgId }: GamificationPanelProps) {
  const t = useTranslations('gamification')
  const toast = useToast()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [insights, setInsights] = useState<GamificationInsights | null>(null)
  const [tierDist, setTierDist] = useState<Record<string, number>>({})
  const [rewards, setRewards] = useState<Reward[]>([])
  // S154: separamos `loading` (mount inicial) de `refreshing` (refresco
  // del botón) — antes ambos compartían `loading`, así que cualquier
  // refresh re-pintaba el skeleton completo y la UI parpadeaba durante
  // 200-400ms aunque ya teníamos datos en pantalla.
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async ({ initial = false }: { initial?: boolean } = {}) => {
    if (!orgId) return
    if (initial) setLoading(true)
    else setRefreshing(true)
    try {
      const [lb, dist, ins, rw] = await Promise.allSettled([
        getLeaderboard(orgId),
        getTierDistribution(orgId),
        getGamificationInsights(orgId),
        getRewardsCatalog(orgId),
      ])
      if (lb.status === 'fulfilled') setLeaderboard(lb.value)
      if (dist.status === 'fulfilled') setTierDist(dist.value)
      if (ins.status === 'fulfilled') setInsights(ins.value)
      if (rw.status === 'fulfilled') setRewards(rw.value)
      const rejected = [lb, dist, ins, rw].filter(p => p.status === 'rejected') as PromiseRejectedResult[]
      rejected.forEach(p => Sentry.captureException(p.reason, { tags: { context: 'gamification_panel_load' } }))
      if (rejected.length === 4) {
        toast.error(t('loadError'))
      }
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('loadError'))
    }
    setLoading(false)
    setRefreshing(false)
  }, [orgId, t, toast])

  useEffect(() => { loadData({ initial: true }) }, [loadData])

  // S154: el panel tenía un form local "Crear reward" muerto — los
  // handlers seguían en el código pero sin ningún botón ni JSX que
  // los activara. Ahora lo unificamos al patrón SofIA Console: un
  // botón visible que pre-forma el prompt y abre la consola, donde
  // SofIA valida nombre + puntos antes de escribir el reward.
  const launchCreateReward = () => {
    router.push(`/dashboard?ask=${encodeURIComponent('Crea un reward llamado ')}`)
  }

  // Calculate tier distribution total
  const totalPatients = Object.values(tierDist).reduce((sum, v) => sum + v, 0)

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-32 bg-surface-3 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-gold">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-lg font-mono font-semibold text-text-primary">{t('title')}</h3>
            <p className="text-xs font-body text-text-dim">{t('subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => loadData()}
          disabled={refreshing}
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Insights KPIs */}
      {insights && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
                <Star size={16} className="text-brand-gold" />
              </div>
              <span className="text-[10px] text-text-dim uppercase font-body font-semibold">{t('totalPoints')}</span>
            </div>
            <div className="text-xl font-bold text-brand-gold font-body">
              {(insights.total_points_awarded ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
                <Users size={16} className="text-brand-purple" />
              </div>
              <span className="text-[10px] text-text-dim uppercase font-body font-semibold">{t('avgPerPatient')}</span>
            </div>
            <div className="text-xl font-bold text-brand-purple font-body">
              {Math.round(insights.avg_points_per_patient ?? 0).toLocaleString()}
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
                <Zap size={16} className="text-status-success" />
              </div>
              <span className="text-[10px] text-text-dim uppercase font-body font-semibold">{t('topAction')}</span>
            </div>
            <div className="text-sm font-mono font-semibold text-status-success truncate">
              {(insights.most_common_action || '—').replace(/_/g, ' ')}
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
                <TrendingUp size={16} className="text-brand-cyan" />
              </div>
              <span className="text-[10px] text-text-dim uppercase font-body font-semibold">{t('engagementRate')}</span>
            </div>
            <div className="text-xl font-bold text-brand-cyan font-body">
              {/* S147: backend returns NaN for engagement_rate when no
                  patients have any points (division by zero). Guard so
                  the UI never renders "NaN%" — show 0% as a stable
                  zero-state for the empty leaderboard. */}
              {Number.isFinite(insights.engagement_rate)
                ? (insights.engagement_rate * 100).toFixed(1)
                : '0.0'}%
            </div>
          </div>
        </div>
      )}

      {/* Tier Distribution Bar */}
      {totalPatients > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider mb-4">
            {t('tierDistribution')}
          </h4>

          {/* Stacked bar */}
          <div className="h-6 rounded-md overflow-hidden flex bg-void">
            {TIER_ORDER.map(tier => {
              const count = tierDist[tier] || 0
              const pct = totalPatients > 0 ? (count / totalPatients) * 100 : 0
              if (pct === 0) return null
              return (
                <div
                  key={tier}
                  className={`${TIER_COLORS[tier].fill} transition-all duration-500 flex items-center justify-center`}
                  style={{ width: `${pct}%` }}
                  title={`${tier}: ${count} (${pct.toFixed(1)}%)`}
                >
                  {pct > 8 && (
                    <span className="text-[11px] font-body font-bold text-white/90">{count}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            {TIER_ORDER.map(tier => {
              const count = tierDist[tier] || 0
              return (
                <div key={tier} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${TIER_COLORS[tier].fill}`} />
                  <span className={`text-[10px] font-semibold ${TIER_COLORS[tier].text}`}>
                    {tier} ({count})
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leaderboard */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Trophy size={14} className="text-brand-gold" />
            {t('leaderboard')}
          </h4>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Trophy size={32} className="text-text-dim mx-auto mb-2 opacity-30" />
              <p className="text-sm font-body text-text-dim">{t('noLeaderboard')}</p>
              <p className="text-xs font-body text-text-dim mt-1">{t('noLeaderboardHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((entry, i) => (
                <div
                  key={entry.patient_id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                    i < 3 ? 'bg-surface-3/60' : 'hover:bg-surface-3/30'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-7 text-center flex-shrink-0">
                    {i < 3 ? (
                      <span className="text-lg">{MEDAL_ICONS[i]}</span>
                    ) : (
                      <span className="text-xs font-bold text-text-dim">#{i + 1}</span>
                    )}
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-text-primary truncate">
                      {entry.patient_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <GamificationTierInline tier={entry.tier} />
                      {entry.streak_months > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-status-warning font-semibold">
                          <Flame size={10} /> {entry.streak_months}m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold font-mono text-brand-gold">
                      {(entry.total_points ?? 0).toLocaleString()}
                    </span>
                    <p className="text-[9px] text-text-dim">pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rewards Catalog */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Gift size={14} className="text-brand-purple" />
              {t('rewardsCatalog')}
            </h4>
            <button
              onClick={launchCreateReward}
              title="Pídele a SofIA crear el reward — ella valida nombre + puntos antes de escribir"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[11px] font-body font-semibold hover:bg-brand-purple/12 transition-colors"
            >
              <Plus size={11} /> {t('createReward')}
            </button>
          </div>

          {rewards.length === 0 ? (
            <div className="text-center py-8">
              <Gift size={32} className="text-text-dim mx-auto mb-2 opacity-30" />
              <p className="text-sm font-body text-text-dim">{t('noRewards')}</p>
              <p className="text-xs font-body text-text-dim mt-1">{t('noRewardsHint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rewards.map(reward => (
                <div
                  key={reward.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-3/40 border border-border/50 hover:border-brand-purple/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                    <Gift size={16} className="text-brand-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-text-primary truncate">{reward.name}</p>
                    {reward.description && (
                      <p className="text-[12px] font-body text-text-dim truncate">{reward.description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold font-mono text-brand-gold">
                      {(reward.points_cost ?? 0).toLocaleString()}
                    </span>
                    <p className="text-[9px] text-text-dim">pts</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reward.is_active ? 'bg-status-success' : 'bg-text-dim'}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
