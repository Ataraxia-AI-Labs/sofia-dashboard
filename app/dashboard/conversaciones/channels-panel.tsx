'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  getChannelMetrics, getChannelComparison, getChannelConfig,
  updateChannelConfig, getChannelInsights,
} from '@/lib/api/channels'
import { ChannelBadge, CHANNEL_CONFIG } from '@/components/channel-badge'
import { formatCurrency, timeAgo } from '@/lib/api/helpers'
import type { ChannelMetrics, ChannelComparison, ChannelConfig, ChannelInsight, ChannelType } from '@/types'
import {
  RefreshCw, Sparkles, Trophy, MessageCircle, Users, TrendingUp,
  DollarSign, Clock, Settings2, Loader2,
} from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// ============================================================
// CHANNEL MANAGEMENT PANEL (P5-07)
// ============================================================

interface ChannelsPanelProps {
  orgId: string
}

export default function ChannelsPanel({ orgId }: ChannelsPanelProps) {
  const t = useTranslations('channels')
  const tCommon = useTranslations('common')

  const [metrics, setMetrics] = useState<ChannelMetrics[]>([])
  const [comparison, setComparison] = useState<ChannelComparison | null>(null)
  const [config, setConfig] = useState<ChannelConfig[]>([])
  const [insights, setInsights] = useState<ChannelInsight | null>(null)
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load core data first (fast) — insights loaded separately (GPT call, slow)
      const [mRes, compRes, cfgRes] = await Promise.allSettled([
        getChannelMetrics(orgId),
        getChannelComparison(orgId),
        getChannelConfig(orgId),
      ])
      if (mRes.status === 'fulfilled') setMetrics(mRes.value)
      if (compRes.status === 'fulfilled') setComparison(compRes.value)
      if (cfgRes.status === 'fulfilled') setConfig(cfgRes.value)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)

    // Load AI insights in background (GPT-4o-mini, can be slow)
    setInsightsLoading(true)
    try {
      const ins = await getChannelInsights(orgId)
      setInsights(ins)
    } catch (err) {
      Sentry.captureException(err)
    }
    setInsightsLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleChannel = async (channel: ChannelType, enabled: boolean) => {
    try {
      await updateChannelConfig(orgId, channel, { is_enabled: enabled })
      setConfig(prev => prev.map(c =>
        c.channel === channel ? { ...c, is_enabled: enabled } : c
      ))
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  const handleRefreshInsights = async () => {
    setInsightsLoading(true)
    try {
      const ins = await getChannelInsights(orgId)
      setInsights(ins)
    } catch (err) {
      Sentry.captureException(err)
    }
    setInsightsLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 bg-surface-3 rounded w-24 mb-3" />
              <div className="h-8 bg-surface-3 rounded w-16 mb-2" />
              <div className="h-3 bg-surface-3 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const CHANNEL_ORDER: ChannelType[] = ['WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'WEBCHAT', 'VOICE']

  // Build metrics map for easy lookup
  const metricsMap: Record<string, ChannelMetrics> = {}
  for (const m of metrics) metricsMap[m.channel] = m

  // Build config map
  const configMap: Record<string, ChannelConfig> = {}
  for (const c of config) configMap[c.channel] = c

  // Max values for bar chart
  const maxMessages = Math.max(1, ...metrics.map(m => m.message_count))
  const maxConversion = Math.max(1, ...metrics.map(m => m.conversion_rate))
  const maxRevenue = Math.max(1, ...metrics.map(m => m.revenue || 0))
  const maxResponseTime = Math.max(1, ...metrics.map(m => m.avg_response_time_sec))

  return (
    <div className="space-y-4">
      {/* CHANNEL OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CHANNEL_ORDER.map(channel => {
          const m = metricsMap[channel]
          const cfg = configMap[channel]
          const channelCfg = CHANNEL_CONFIG[channel]
          const Icon = channelCfg.icon
          // Channel is "active" if explicitly enabled OR has messages (no config yet = infer from data)
          const isEnabled = cfg?.is_enabled ?? m?.is_enabled ?? (m?.message_count ?? 0) > 0

          return (
            <div
              key={channel}
              className={`glass-card p-4 relative overflow-hidden transition-all ${
                !isEnabled ? 'opacity-60' : ''
              }`}
            >
              {/* Status indicator */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {isEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title={t('active')} />
                )}
                <button
                  onClick={() => handleToggleChannel(channel, !isEnabled)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    isEnabled ? 'bg-emerald-500/30' : 'bg-surface-3'
                  }`}
                  aria-label={isEnabled ? t('disable') : t('enable')}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                    isEnabled
                      ? 'right-0.5 bg-emerald-400'
                      : 'left-0.5 bg-text-dim'
                  }`} />
                </button>
              </div>

              {/* Channel icon + name */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-lg ${channelCfg.bg} border ${channelCfg.border} flex items-center justify-center`}>
                  <Icon size={18} className={channelCfg.color} />
                </div>
                <div>
                  <span className={`text-sm font-semibold font-mono ${channelCfg.color}`}>{channelCfg.label}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-dim flex items-center gap-1">
                    <MessageCircle size={9} /> {t('messages')}
                  </span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {(m?.message_count ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-dim flex items-center gap-1">
                    <Users size={9} /> {t('patients')}
                  </span>
                  <span className="text-xs font-bold font-mono text-text-primary">
                    {m?.unique_patients ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-dim flex items-center gap-1">
                    <TrendingUp size={9} /> {t('conversion')}
                  </span>
                  <span className="text-xs font-bold font-mono text-brand-purple">
                    {((m?.conversion_rate ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Last message time */}
              {m?.last_message_at && (
                <div className="mt-3 pt-2 border-t border-border">
                  <span className="text-[9px] font-mono text-text-dim flex items-center gap-1">
                    <Clock size={8} /> {t('lastMessage')}: {timeAgo(m.last_message_at)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CHANNEL COMPARISON */}
      {comparison && comparison.channels.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold font-mono text-text-primary mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-brand-gold" />
            {t('comparison')}
          </h3>

          <div className="space-y-4">
            {/* Messages comparison */}
            <ComparisonRow
              label={t('messages')}
              icon={<MessageCircle size={12} />}
              metrics={metrics}
              getValue={m => m.message_count}
              max={maxMessages}
              winner={comparison.best_by_messages}
              format={v => v.toLocaleString()}
            />
            {/* Conversion comparison */}
            <ComparisonRow
              label={t('conversion')}
              icon={<TrendingUp size={12} />}
              metrics={metrics}
              getValue={m => m.conversion_rate * 100}
              max={maxConversion * 100}
              winner={comparison.best_by_conversion}
              format={v => `${v.toFixed(1)}%`}
            />
            {/* Revenue comparison */}
            <ComparisonRow
              label={t('revenue')}
              icon={<DollarSign size={12} />}
              metrics={metrics}
              getValue={m => m.revenue}
              max={maxRevenue}
              winner={comparison.best_by_revenue}
              format={v => formatCurrency(v)}
            />
            {/* Response time comparison */}
            <ComparisonRow
              label={t('responseTime')}
              icon={<Clock size={12} />}
              metrics={metrics}
              getValue={m => m.avg_response_time_sec}
              max={maxResponseTime}
              winner={null}
              format={v => `${v.toFixed(0)}s`}
            />
          </div>
        </div>
      )}

      {/* AI INSIGHTS */}
      <div className="glass-card p-4 border-brand-purple/15">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold font-mono text-text-primary flex items-center gap-2">
            <Sparkles size={14} className="text-brand-purple" />
            {t('aiInsights')}
          </h3>
          <button
            onClick={handleRefreshInsights}
            disabled={insightsLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors disabled:opacity-50"
          >
            {insightsLoading ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <RefreshCw size={10} />
            )}
            {t('refreshInsights')}
          </button>
        </div>
        {insights ? (
          <div>
            {insights.insights?.length > 0 ? (
              <div className="space-y-3">
                {insights.insights.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-surface-2 border border-border">
                    <p className="text-[11px] font-mono font-semibold text-text-primary mb-1">{item.title}</p>
                    <p className="text-[10px] text-text-muted leading-relaxed mb-1.5">{item.observation}</p>
                    {item.recommendation && (
                      <p className="text-[10px] text-brand-purple leading-relaxed">
                        → {item.recommendation}
                      </p>
                    )}
                    {item.impact && (
                      <p className="text-[9px] text-text-dim mt-1">{item.impact}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">
                {insights.insight}
              </p>
            )}
            <p className="text-[9px] text-text-dim mt-2">
              {timeAgo(insights.generated_at)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-dim">{t('noInsights')}</p>
        )}
      </div>

      {/* CHANNEL CONFIG */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold font-mono text-text-primary mb-3 flex items-center gap-2">
          <Settings2 size={14} className="text-text-muted" />
          {t('configuration')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHANNEL_ORDER.map(channel => {
            const cfg = configMap[channel]
            const m = metricsMap[channel]
            const channelCfg = CHANNEL_CONFIG[channel]
            const isEnabled = cfg?.is_enabled ?? (m?.message_count ?? 0) > 0

            return (
              <div
                key={channel}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-2 border border-border"
              >
                <div className="flex items-center gap-2.5">
                  <ChannelBadge channel={channel} compact />
                  <span className="text-xs font-semibold font-mono text-text-primary">{channelCfg.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-semibold font-mono ${isEnabled ? 'text-emerald-400' : 'text-text-dim'}`}>
                    {isEnabled ? tCommon('enabled') : tCommon('disabled')}
                  </span>
                  <button
                    onClick={() => handleToggleChannel(channel, !isEnabled)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      isEnabled ? 'bg-emerald-500/30' : 'bg-surface-3'
                    }`}
                    aria-label={`${isEnabled ? t('disable') : t('enable')} ${channelCfg.label}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                      isEnabled
                        ? 'right-0.5 bg-emerald-400'
                        : 'left-0.5 bg-text-dim'
                    }`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMPARISON ROW (horizontal bar chart)
// ============================================================

function ComparisonRow({
  label,
  icon,
  metrics,
  getValue,
  max,
  winner,
  format,
}: {
  label: string
  icon: React.ReactNode
  metrics: ChannelMetrics[]
  getValue: (m: ChannelMetrics) => number
  max: number
  winner: ChannelType | null
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-text-dim">{icon}</span>
        <span className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="space-y-1.5">
        {metrics.map(m => {
          const val = getValue(m)
          const pct = max > 0 ? (val / max) * 100 : 0
          const channelCfg = CHANNEL_CONFIG[m.channel]
          const isWinner = winner === m.channel

          return (
            <div key={m.channel} className="flex items-center gap-3">
              <div className="w-16 flex-shrink-0">
                <ChannelBadge channel={m.channel} compact />
              </div>
              <div className="flex-1 h-5 bg-surface-3 rounded-md overflow-hidden relative">
                <div
                  className={`h-full rounded-md transition-all duration-500 ${
                    isWinner
                      ? 'bg-gradient-to-r from-brand-purple to-brand-cyan'
                      : ''
                  }`}
                  style={{
                    width: `${Math.max(2, pct)}%`,
                    backgroundColor: isWinner ? undefined : `color-mix(in srgb, ${channelCfg.color === 'text-emerald-400' ? '#34d399' : channelCfg.color === 'text-fuchsia-400' ? '#e879f9' : channelCfg.color === 'text-blue-400' ? '#60a5fa' : '#fbbf24'} 60%, transparent)`,
                  }}
                />
              </div>
              <span className={`text-[11px] font-mono font-semibold w-20 text-right flex-shrink-0 ${
                isWinner ? 'text-brand-purple' : 'text-text-muted'
              }`}>
                {format(val)}
                {isWinner && <Trophy size={9} className="inline ml-1 text-brand-gold" />}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
