'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import {
  Trophy, Flame, Star, Gift, Plus, X,
  RefreshCw, Users, TrendingUp, Zap,
} from 'lucide-react'
import {
  getLeaderboard,
  getTierDistribution,
  getGamificationInsights,
  getRewardsCatalog,
  createReward,
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [insights, setInsights] = useState<GamificationInsights | null>(null)
  const [tierDist, setTierDist] = useState<Record<string, number>>({})
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateReward, setShowCreateReward] = useState(false)
  const [newReward, setNewReward] = useState({ name: '', description: '', points_cost: 0 })
  const [creatingReward, setCreatingReward] = useState(false)

  const loadData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
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
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleCreateReward = async () => {
    if (!orgId || !newReward.name || newReward.points_cost <= 0) return
    setCreatingReward(true)
    try {
      const result = await createReward(orgId, newReward)
      if (result) {
        setRewards(prev => [...prev, result])
        setShowCreateReward(false)
        setNewReward({ name: '', description: '', points_cost: 0 })
      }
    } catch (err) {
      Sentry.captureException(err)
    }
    setCreatingReward(false)
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
          onClick={loadData}
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
              {insights.total_points_awarded.toLocaleString()}
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
              {Math.round(insights.avg_points_per_patient).toLocaleString()}
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
              {insights.most_common_action.replace(/_/g, ' ')}
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
              {(insights.engagement_rate * 100).toFixed(1)}%
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
                      {entry.total_points.toLocaleString()}
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
              onClick={() => setShowCreateReward(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[13px] font-body font-semibold hover:bg-brand-purple/15 transition-colors"
            >
              <Plus size={12} /> {t('createReward')}
            </button>
          </div>

          {/* Create reward modal */}
          {showCreateReward && (
            <div className="bg-surface-3/80 rounded-lg p-4 border border-border mb-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-body font-semibold text-text-primary">{t('newReward')}</h5>
                <button onClick={() => setShowCreateReward(false)} className="text-text-dim hover:text-text-primary">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newReward.name}
                  onChange={e => setNewReward(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('rewardNamePlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-sm placeholder:text-text-dim outline-none focus:border-brand-purple/40"
                />
                <input
                  type="text"
                  value={newReward.description}
                  onChange={e => setNewReward(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('rewardDescPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-sm placeholder:text-text-dim outline-none focus:border-brand-purple/40"
                />
                <input
                  type="number"
                  value={newReward.points_cost || ''}
                  onChange={e => setNewReward(prev => ({ ...prev, points_cost: parseInt(e.target.value) || 0 }))}
                  placeholder={t('rewardCostPlaceholder')}
                  min={1}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary text-sm placeholder:text-text-dim outline-none focus:border-brand-purple/40"
                />
                <button
                  onClick={handleCreateReward}
                  disabled={creatingReward || !newReward.name || newReward.points_cost <= 0}
                  className="w-full py-2 rounded-lg bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-sm font-mono font-semibold disabled:opacity-50 transition-opacity"
                >
                  {creatingReward ? t('creating') : t('createReward')}
                </button>
              </div>
            </div>
          )}

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
                      {reward.points_cost.toLocaleString()}
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
