'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  getChannelMetrics, getChannelComparison, getChannelConfig,
  updateChannelConfig,
} from '@/lib/api/channels'
import { ChannelBadge, CHANNEL_CONFIG } from '@/components/channel-badge'
import { timeAgo } from '@/lib/api/helpers'
import type { ChannelMetrics, ChannelComparison, ChannelConfig, ChannelType } from '@/types'
import {
  Trophy, MessageCircle, Users, TrendingUp,
  Clock, Settings2, Phone,
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

  const [metrics, setMetrics] = useState<ChannelMetrics[]>([])
  const [comparison, setComparison] = useState<ChannelComparison | null>(null)
  const [config, setConfig] = useState<ChannelConfig[]>([])
  const [loading, setLoading] = useState(true)

  // S145: AI Insights panel deleted (CEO directive). Generic GPT advice
  // ("invest in Instagram", "redirect voice traffic to WhatsApp") wasn't
  // tied to a specific patient or action — token spend without clinical
  // value. The patient-level proactive queue at /dashboard/inteligencia
  // already surfaces the actionable recommendations.

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
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
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleToggleChannel = async (channel: ChannelType, enabled: boolean) => {
    // Block toggle if channel has no real config
    const cfg = config.find(c => c.channel === channel)
    const hasRealConfig = cfg?.config && typeof cfg.config === 'object' && Object.keys(cfg.config).length > 0
    if (!hasRealConfig) return

    // Optimistic update
    setConfig(prev => prev.map(c =>
      c.channel === channel ? { ...c, is_enabled: enabled } : c
    ))
    try {
      const result = await updateChannelConfig(orgId, channel, { is_enabled: enabled })
      // If backend returned null or error, revert
      if (!result || ('error' in (result as unknown as Record<string, unknown>))) {
        setConfig(prev => prev.map(c =>
          c.channel === channel ? { ...c, is_enabled: !enabled } : c
        ))
      }
    } catch (err) {
      Sentry.captureException(err)
      // Revert on failure
      setConfig(prev => prev.map(c =>
        c.channel === channel ? { ...c, is_enabled: !enabled } : c
      ))
    }
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

  // S142: show a channel if any of these is true:
  //   - org-level flag is_enabled (operator turned it on, even if config blob is empty)
  //   - has a non-empty config blob (manual setup happened)
  //   - has any activity in the metrics window
  // Was hiding Instagram (1 msg outside 30d window + empty config blob even
  // though instagram_enabled=true on the org) and was hiding any channel
  // an operator just enabled but hasn't seen traffic on yet.
  const activeChannels = CHANNEL_ORDER.filter(ch => {
    const m = metricsMap[ch]
    const cfg = configMap[ch]
    const isEnabled = cfg?.is_enabled === true
    const hasConfig = cfg?.config && typeof cfg.config === 'object' && Object.keys(cfg.config).length > 0
    const hasActivity = m && (m.message_count > 0 || m.unique_patients > 0)
    return isEnabled || hasConfig || hasActivity
  })

  // Messaging channels only (exclude VOICE for message-based comparisons)
  const messagingMetrics = metrics.filter(m => m.channel !== 'VOICE')
  const voiceMetrics = metrics.filter(m => m.channel === 'VOICE')

  // Max values for bar chart (messaging only for messages)
  const maxMessages = Math.max(1, ...messagingMetrics.map(m => m.message_count))
  const maxConversion = Math.max(1, ...metrics.map(m => m.conversion_rate))
  const maxResponseTime = Math.max(1, ...metrics.map(m => m.avg_response_time_sec))

  return (
    <div className="space-y-4">
      {/* CHANNEL OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {activeChannels.map(channel => {
          const m = metricsMap[channel]
          const cfg = configMap[channel]
          const channelCfg = CHANNEL_CONFIG[channel]
          const Icon = channelCfg.icon
          // Channel is "active" only if explicitly enabled in config
          const isEnabled = cfg?.is_enabled ?? false
          // S153: Web Chat is special — the public widget uses org_id directly,
          // there is no per-org credential to gate "configured". Treat it as
          // always configurable so the operator can flip the toggle and the
          // tracking lines up with the widget's actual behavior.
          const hasConfigBlob = cfg?.config && typeof cfg.config === 'object' && Object.keys(cfg.config).length > 0
          const hasConfig = channel === 'WEBCHAT' ? true : hasConfigBlob
          // S142: data inconsistency — channel is OFF in config but is
          // receiving messages anyway. The widget/webhook acts on the
          // underlying credential, not the dashboard flag. Surface this
          // so the operator can flip the flag and align tracking.
          const hasActivityWhileDisabled = !isEnabled && (m?.message_count ?? 0) > 0
          // S153: pulse dot reflects "data flowing", not just is_enabled.
          // Web Chat receiving 81 messages while is_enabled=false should
          // still pulse — the operator's "is this thing live?" intuition
          // wants real activity, not the toggle state.
          const isLive = isEnabled || (m?.message_count ?? 0) > 0

          return (
            <div
              key={channel}
              className={`glass-card p-4 relative overflow-hidden transition-all ${
                !isEnabled && !hasActivityWhileDisabled ? 'opacity-60' : ''
              }`}
            >
              {/* Status indicator — pulse when channel has real activity OR
                  is explicitly enabled. Differentiated by color: brand-purple
                  for "enabled (intentionally tracking)" vs status-warning for
                  "data flowing despite toggle off" (a problem to fix). */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {isEnabled && (
                  <span
                    className="w-2 h-2 rounded-full bg-status-success animate-pulse"
                    title={t('active')}
                    aria-label={t('active')}
                  />
                )}
                {!isEnabled && isLive && (
                  <span
                    className="w-2 h-2 rounded-full bg-status-warning animate-pulse"
                    title="Hay actividad pero el canal está desactivado"
                    aria-label="Hay actividad sin trackear"
                  />
                )}
                <button
                  onClick={() => hasConfig && handleToggleChannel(channel, !isEnabled)}
                  disabled={!hasConfig}
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    !hasConfig ? 'bg-surface-3 opacity-40 cursor-not-allowed' :
                    isEnabled ? 'bg-status-success/30' : 'bg-surface-3'
                  }`}
                  aria-label={!hasConfig ? t('notConfigured') : isEnabled ? t('disable') : t('enable')}
                  title={!hasConfig ? t('notConfigured') : undefined}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                    isEnabled && hasConfig
                      ? 'right-0.5 bg-status-success'
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
                  <span className="text-[12px] font-body text-text-dim flex items-center gap-1">
                    <MessageCircle size={9} /> {channel === 'VOICE' ? t('calls') : t('messages')}
                  </span>
                  <span className="text-xs font-bold font-body text-text-primary">
                    {(m?.message_count ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-body text-text-dim flex items-center gap-1">
                    <Users size={9} /> {t('patients')}
                  </span>
                  <span className="text-xs font-bold font-body text-text-primary">
                    {m?.unique_patients ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-body text-text-dim flex items-center gap-1">
                    <TrendingUp size={9} /> {t('conversion')}
                  </span>
                  <span
                    className="text-xs font-bold font-body text-brand-purple"
                    title={(m?.message_count ?? 0) < 5 ? 'Muestra insuficiente (menos de 5 mensajes)' : undefined}
                  >
                    {(m?.message_count ?? 0) < 5
                      ? '—'
                      : `${((m?.conversion_rate ?? 0) * 100).toFixed(1)}%`}
                  </span>
                </div>
              </div>

              {/* Last message time */}
              {m?.last_message_at && (
                <div className="mt-3 pt-2 border-t border-border/30">
                  <span className="text-[11px] font-body text-text-dim flex items-center gap-1">
                    <Clock size={8} /> {t('lastMessage')}: {timeAgo(m.last_message_at)}
                  </span>
                </div>
              )}

              {/* S142 inconsistency ribbon — channel is OFF but receiving
                  messages. Suggests the operator should flip the toggle on
                  to align dashboard analytics with reality. */}
              {hasActivityWhileDisabled && (
                <div className="mt-3 pt-2 border-t border-status-warning/20">
                  <div className="flex items-start gap-1.5 text-[10.5px] font-body text-status-warning leading-snug">
                    <span className="mt-0.5" aria-hidden="true">⚠</span>
                    <span>
                      {t('disabledButReceiving', { count: m?.message_count ?? 0 })}
                    </span>
                  </div>
                  {hasConfig && (
                    <button
                      onClick={() => handleToggleChannel(channel, true)}
                      className="mt-1 text-[10.5px] font-body font-semibold text-brand-purple hover:underline"
                    >
                      {t('activateNow')}
                    </button>
                  )}
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
            {/* Messages comparison (messaging channels only — Voice excluded) */}
            {messagingMetrics.length > 0 && (
              <ComparisonRow
                label={t('messages')}
                icon={<MessageCircle size={12} />}
                metrics={messagingMetrics}
                getValue={m => m.message_count}
                max={maxMessages}
                winner={comparison.best_by_messages}
                format={v => v.toLocaleString()}
              />
            )}
            {/* Voice calls comparison (separate from messages) */}
            {voiceMetrics.length > 0 && voiceMetrics.some(m => m.message_count > 0) && (
              <ComparisonRow
                label={t('calls')}
                icon={<Phone size={12} />}
                metrics={voiceMetrics}
                getValue={m => m.message_count}
                max={Math.max(1, ...voiceMetrics.map(m => m.message_count))}
                winner={null}
                format={v => v.toLocaleString()}
              />
            )}
            {/* Conversion comparison (only channels with activity) */}
            {metrics.some(m => (m.message_count > 0 || m.unique_patients > 0) && m.conversion_rate > 0) && (
              <ComparisonRow
                label={t('conversion')}
                icon={<TrendingUp size={12} />}
                metrics={metrics.filter(m => m.message_count > 0 || m.unique_patients > 0)}
                getValue={m => m.conversion_rate * 100}
                max={maxConversion * 100}
                winner={comparison.best_by_conversion}
                format={v => `${v.toFixed(1)}%`}
              />
            )}
            {/* Response time comparison (only channels with data) */}
            {metrics.some(m => m.avg_response_time_sec > 0) && (
              <ComparisonRow
                label={t('responseTime')}
                icon={<Clock size={12} />}
                metrics={metrics.filter(m => m.avg_response_time_sec > 0)}
                getValue={m => m.avg_response_time_sec}
                max={maxResponseTime}
                winner={null}
                format={v => `${v.toFixed(0)}s`}
              />
            )}
          </div>
        </div>
      )}

      {/* LINK TO CHANNEL SETTINGS (if unconfigured channels exist) */}
      {CHANNEL_ORDER.some(ch => {
        const cfg = configMap[ch]
        return !cfg?.config || typeof cfg.config !== 'object' || Object.keys(cfg.config).length === 0
      }) && (
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings2 size={14} className="text-text-muted" />
            <span className="text-[13px] font-body text-text-muted">
              {t('unconfiguredChannelsHint')}
            </span>
          </div>
          <a
            href="/dashboard/ajustes?tab=channels"
            className="text-[12px] font-body font-semibold text-brand-purple hover:text-brand-purple-light transition-colors"
          >
            {t('goToSettings')} →
          </a>
        </div>
      )}
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
        <span className="text-[12px] font-body font-semibold text-text-muted uppercase tracking-wider">{label}</span>
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
                    backgroundColor: isWinner ? undefined : `color-mix(in srgb, ${
                      channelCfg.color === 'text-status-success' ? '#06d6a0' :
                      channelCfg.color === 'text-brand-purple' ? '#8b5cf6' :
                      channelCfg.color === 'text-brand-cyan' ? '#06d6a0' :
                      channelCfg.color === 'text-status-info' ? '#8b5cf6' :
                      channelCfg.color === 'text-brand-gold' ? '#f5c842' :
                      '#8b5cf6'
                    } 60%, transparent)`,
                  }}
                />
              </div>
              <span className={`text-[13px] font-body font-semibold w-20 text-right flex-shrink-0 ${
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
