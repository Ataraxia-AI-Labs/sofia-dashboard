'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import * as Sentry from '@sentry/nextjs'
import {
  getNetworkBenchmarks, getServiceTrends, getConversionPatterns,
  getOptimalHours, getNetworkAlerts, getNetworkNarrative, getNetworkStats, publishMetrics,
} from '@/lib/api/network'
import { NetworkBenchmarkCard } from '@/components/network-benchmark-card'
import { NetworkAlertBadge } from '@/components/network-alert-badge'
import type {
  NetworkBenchmarks, ServiceTrend, ConversionPattern,
  OptimalHour, NetworkAlert, NetworkNarrative, NetworkStats,
} from '@/types'
import {
  Brain, TrendingUp, TrendingDown, Minus, RefreshCw, Upload,
  Globe, Users, MessageSquare, Building2, Clock, Lightbulb, Bell,
  Sparkles, BarChart3,
} from 'lucide-react'
import { timeAgo } from '@/lib/api/helpers'

export default function NetworkPage() {
  const { orgId } = useOrg()
  const toast = useToast()
  const t = useTranslations('network')
  const tCommon = useTranslations('common')

  const [benchmarks, setBenchmarks] = useState<NetworkBenchmarks | null>(null)
  const [trends, setTrends] = useState<ServiceTrend[]>([])
  const [patterns, setPatterns] = useState<ConversionPattern[]>([])
  const [hours, setHours] = useState<OptimalHour[]>([])
  const [alerts, setAlerts] = useState<NetworkAlert[]>([])
  const [narrative, setNarrative] = useState<NetworkNarrative | null>(null)
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [bm, tr, pat, hr, al, nar, st] = await Promise.all([
        getNetworkBenchmarks(orgId),
        getServiceTrends(orgId),
        getConversionPatterns(orgId),
        getOptimalHours(orgId),
        getNetworkAlerts(orgId),
        getNetworkNarrative(orgId),
        getNetworkStats(),
      ])
      setBenchmarks(bm)
      setTrends(tr)
      setPatterns(pat)
      setHours(hr)
      setAlerts(al)
      setNarrative(nar)
      setStats(st)
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('loadError'))
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await publishMetrics(orgId, 30)
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('publishError'))
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1200px] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 bg-surface-3 rounded w-64 animate-pulse mb-2" />
            <div className="h-3 bg-surface-3 rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-surface-3 rounded w-32 mb-3" />
              <div className="h-7 bg-surface-3 rounded w-24 mb-2" />
              <div className="h-2 bg-surface-3 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Build heatmap grid from optimal hours
  const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
  const HOURS_RANGE = Array.from({ length: 13 }, (_, i) => i + 7) // 7-19
  const heatmapData: Record<string, Record<number, number>> = {}
  for (const d of DAYS) heatmapData[d] = {}
  for (const h of hours) {
    if (heatmapData[h.day]) {
      heatmapData[h.day][h.hour] = h.score
    }
  }
  const maxScore = Math.max(1, ...hours.map(h => h.score))

  return (
    <div className="max-w-[1200px] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple">
            <Brain size={18} />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
            <p className="text-text-dim text-[9px] font-mono mt-0.5">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors disabled:opacity-50"
          >
            <Upload size={11} />
            {publishing ? tCommon('loading') : t('publish')}
          </button>
          <button
            onClick={loadData}
            className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* NETWORK STATS — Social Proof */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatsCard icon={<Building2 size={14} />} value={(stats.total_clinics ?? 0).toLocaleString()} label={t('totalClinics')} />
          <StatsCard icon={<Globe size={14} />} value={(stats.total_countries ?? 0).toLocaleString()} label={t('totalCountries')} />
          <StatsCard icon={<MessageSquare size={14} />} value={formatCompact(stats.total_interactions ?? 0)} label={t('totalInteractions')} />
          <StatsCard icon={<Users size={14} />} value={formatCompact(stats.total_patients ?? 0)} label={t('totalPatients')} />
        </div>
      )}

      {/* NARRATIVE — AI-generated summary */}
      {narrative && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-brand-purple" />
            <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary">{t('narrative')}</h3>
          </div>
          <p className="text-[10px] font-mono text-text-muted leading-relaxed whitespace-pre-line">{narrative.narrative}</p>
          <p className="text-[9px] font-mono text-text-dim mt-2">{timeAgo(narrative.generated_at)}</p>
        </div>
      )}

      {/* BENCHMARKS */}
      {benchmarks && (
        <div>
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3 flex items-center gap-2">
            <BarChart3 size={13} className="text-brand-purple" />
            {t('benchmarks')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <NetworkBenchmarkCard
              metricName={t('metrics.conversionRate')}
              yours={benchmarks.conversion_rate.yours}
              marketAvg={benchmarks.conversion_rate.market_avg}
              percentile={benchmarks.conversion_rate.percentile}
              format="percent"
            />
            <NetworkBenchmarkCard
              metricName={t('metrics.avgTicket')}
              yours={benchmarks.avg_ticket.yours}
              marketAvg={benchmarks.avg_ticket.market_avg}
              percentile={benchmarks.avg_ticket.percentile}
              format="currency"
            />
            <NetworkBenchmarkCard
              metricName={t('metrics.satisfaction')}
              yours={benchmarks.satisfaction.yours}
              marketAvg={benchmarks.satisfaction.market_avg}
              percentile={benchmarks.satisfaction.percentile}
              format="percent"
            />
            <NetworkBenchmarkCard
              metricName={t('metrics.responseTime')}
              yours={benchmarks.response_time.yours}
              marketAvg={benchmarks.response_time.market_avg}
              percentile={benchmarks.response_time.percentile}
              format="time"
              higherIsBetter={false}
            />
          </div>
        </div>
      )}

      {/* SERVICE TRENDS */}
      {trends.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3 flex items-center gap-2">
            <TrendingUp size={13} className="text-brand-cyan" />
            {t('trends')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {trends.map((tr, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-md bg-surface-2 border border-border">
                <div className="flex items-center gap-2">
                  {tr.trend === 'UP' ? (
                    <div className="w-6 h-6 rounded-md bg-status-success/10 flex items-center justify-center">
                      <TrendingUp size={12} className="text-status-success" />
                    </div>
                  ) : tr.trend === 'DOWN' ? (
                    <div className="w-6 h-6 rounded-md bg-status-danger/10 flex items-center justify-center">
                      <TrendingDown size={12} className="text-status-danger" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-surface-3 flex items-center justify-center">
                      <Minus size={12} className="text-text-dim" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-text-primary">{tr.service_name}</span>
                    <span className="text-[9px] font-mono text-text-dim ml-2">{tr.demand_count} {t('demands')}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-semibold ${
                  tr.trend === 'UP' ? 'text-status-success' : tr.trend === 'DOWN' ? 'text-status-danger' : 'text-text-dim'
                }`}>
                  {tr.change_pct > 0 ? '+' : ''}{tr.change_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONVERSION PATTERNS */}
      {patterns.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3 flex items-center gap-2">
            <Lightbulb size={13} className="text-brand-gold" />
            {t('conversionPatterns')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patterns.map((p, i) => (
              <div key={i} className="px-3 py-3 rounded-md bg-surface-2 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-semibold text-text-primary">{p.pattern}</span>
                  <span className="text-[9px] font-mono text-brand-purple font-semibold">{p.impact_factor.toFixed(2)}x</span>
                </div>
                <p className="text-[10px] font-mono text-text-muted leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OPTIMAL HOURS HEATMAP */}
      {hours.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3 flex items-center gap-2">
            <Clock size={13} className="text-status-info" />
            {t('optimalHours')}
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header */}
              <div className="flex">
                <div className="w-12" />
                {HOURS_RANGE.map(h => (
                  <div key={h} className="flex-1 text-center text-[9px] text-text-dim font-mono pb-1.5">
                    {h}:00
                  </div>
                ))}
              </div>
              {/* Grid */}
              {DAYS.map(day => (
                <div key={day} className="flex items-center">
                  <div className="w-12 text-[10px] font-mono text-text-muted font-semibold pr-2 text-right">{day}</div>
                  {HOURS_RANGE.map(h => {
                    const score = heatmapData[day]?.[h] || 0
                    const intensity = score / maxScore
                    return (
                      <div key={h} className="flex-1 p-0.5">
                        <div
                          className="h-6 rounded-sm transition-colors"
                          style={{
                            backgroundColor: intensity > 0
                              ? `rgba(139, 92, 246, ${Math.max(0.08, intensity * 0.8)})`
                              : 'var(--color-surface-2)',
                          }}
                          title={`${day} ${h}:00 — ${(score * 100).toFixed(0)}%`}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-2">
                <span className="text-[9px] font-mono text-text-dim">{t('low')}</span>
                <div className="flex gap-0.5">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                    <div
                      key={v}
                      className="w-4 h-2.5 rounded-sm"
                      style={{ backgroundColor: `rgba(139, 92, 246, ${v * 0.8})` }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-text-dim">{t('high')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-3 flex items-center gap-2">
            <Bell size={13} className="text-status-warning" />
            {t('alerts')}
          </h3>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-md border ${
                  alert.is_read ? 'bg-surface-2 border-border' : 'bg-surface border-border-2'
                }`}
              >
                <NetworkAlertBadge severity={alert.severity} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono font-semibold text-text-primary">{alert.title}</div>
                  <p className="text-[10px] font-mono text-text-muted mt-0.5 line-clamp-2">{alert.description}</p>
                  <span className="text-[9px] font-mono text-text-dim mt-1 inline-block">{timeAgo(alert.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!benchmarks && !narrative && trends.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Brain size={36} className="mx-auto text-text-dim mb-3" />
          <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary mb-2">{t('noData')}</h3>
          <p className="text-[10px] font-mono text-text-muted">{t('noDataHint')}</p>
        </div>
      )}
    </div>
  )
}

function StatsCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass-card p-3">
      <div className="w-7 h-7 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple mb-2">
        {icon}
      </div>
      <div className="text-lg font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[9px] font-mono text-text-muted mt-0.5">{label}</div>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}
