'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useOrg } from '@/lib/org-context'
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
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handlePublish = async () => {
    setPublishing(true)
    await publishMetrics(orgId, 30)
    setPublishing(false)
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 bg-surface-3 rounded w-64 animate-pulse mb-2" />
            <div className="h-4 bg-surface-3 rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-5 bg-surface-3 rounded w-32 mb-4" />
              <div className="h-8 bg-surface-3 rounded w-24 mb-3" />
              <div className="h-3 bg-surface-3 rounded" />
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
    <div className="max-w-[1400px] space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center text-white shadow-lg">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-text-primary">{t('title')}</h2>
            <p className="text-text-dim text-xs mt-0.5">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-xs font-semibold hover:bg-brand-purple/20 transition-colors disabled:opacity-50"
          >
            <Upload size={12} />
            {publishing ? tCommon('loading') : t('publish')}
          </button>
          <button
            onClick={loadData}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* NETWORK STATS — Social Proof */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatsCard icon={<Building2 size={16} />} value={stats.total_clinics.toLocaleString()} label={t('totalClinics')} gradient="from-brand-purple to-brand-purple-dark" />
          <StatsCard icon={<Globe size={16} />} value={stats.total_countries.toLocaleString()} label={t('totalCountries')} gradient="from-brand-cyan to-emerald-500" />
          <StatsCard icon={<MessageSquare size={16} />} value={formatCompact(stats.total_interactions)} label={t('totalInteractions')} gradient="from-status-warning to-amber-600" />
          <StatsCard icon={<Users size={16} />} value={formatCompact(stats.total_patients)} label={t('totalPatients')} gradient="from-status-success to-emerald-600" />
        </div>
      )}

      {/* NARRATIVE — AI-generated summary */}
      {narrative && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-brand-purple" />
            <h3 className="text-sm font-semibold text-text-primary">{t('narrative')}</h3>
          </div>
          <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">{narrative.narrative}</p>
          <p className="text-[10px] text-text-dim mt-2">{timeAgo(narrative.generated_at)}</p>
        </div>
      )}

      {/* BENCHMARKS */}
      {benchmarks && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-brand-purple" />
            {t('benchmarks')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-cyan" />
            {t('trends')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trends.map((tr, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2 border border-border">
                <div className="flex items-center gap-2.5">
                  {tr.trend === 'UP' ? (
                    <div className="w-7 h-7 rounded-lg bg-status-success/10 flex items-center justify-center">
                      <TrendingUp size={14} className="text-status-success" />
                    </div>
                  ) : tr.trend === 'DOWN' ? (
                    <div className="w-7 h-7 rounded-lg bg-status-danger/10 flex items-center justify-center">
                      <TrendingDown size={14} className="text-status-danger" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center">
                      <Minus size={14} className="text-text-dim" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-text-primary">{tr.service_name}</span>
                    <span className="text-[10px] text-text-dim ml-2">{tr.demand_count} {t('demands')}</span>
                  </div>
                </div>
                <span className={`text-xs font-mono font-semibold ${
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
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-brand-gold" />
            {t('conversionPatterns')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patterns.map((p, i) => (
              <div key={i} className="px-4 py-3.5 rounded-xl bg-surface-2 border border-border">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-text-primary">{p.pattern}</span>
                  <span className="text-[10px] font-mono text-brand-purple font-semibold">{p.impact_factor.toFixed(2)}x</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OPTIMAL HOURS HEATMAP */}
      {hours.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Clock size={14} className="text-status-info" />
            {t('optimalHours')}
          </h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header */}
              <div className="flex">
                <div className="w-12" />
                {HOURS_RANGE.map(h => (
                  <div key={h} className="flex-1 text-center text-[10px] text-text-dim font-mono pb-1.5">
                    {h}:00
                  </div>
                ))}
              </div>
              {/* Grid */}
              {DAYS.map(day => (
                <div key={day} className="flex items-center">
                  <div className="w-12 text-[11px] text-text-muted font-semibold pr-2 text-right">{day}</div>
                  {HOURS_RANGE.map(h => {
                    const score = heatmapData[day]?.[h] || 0
                    const intensity = score / maxScore
                    return (
                      <div key={h} className="flex-1 p-0.5">
                        <div
                          className="h-7 rounded-md transition-colors"
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
                <span className="text-[10px] text-text-dim">{t('low')}</span>
                <div className="flex gap-0.5">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
                    <div
                      key={v}
                      className="w-5 h-3 rounded-sm"
                      style={{ backgroundColor: `rgba(139, 92, 246, ${v * 0.8})` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-text-dim">{t('high')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Bell size={14} className="text-status-warning" />
            {t('alerts')}
          </h3>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                  alert.is_read ? 'bg-surface-2 border-border' : 'bg-surface border-border-2'
                }`}
              >
                <NetworkAlertBadge severity={alert.severity} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text-primary">{alert.title}</div>
                  <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{alert.description}</p>
                  <span className="text-[10px] text-text-dim mt-1 inline-block">{timeAgo(alert.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!benchmarks && !narrative && trends.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Brain size={40} className="mx-auto text-text-dim mb-4" />
          <h3 className="text-sm font-semibold text-text-primary mb-2">{t('noData')}</h3>
          <p className="text-xs text-text-muted">{t('noDataHint')}</p>
        </div>
      )}
    </div>
  )
}

function StatsCard({ icon, value, label, gradient }: { icon: React.ReactNode; value: string; label: string; gradient: string }) {
  return (
    <div className="glass-card p-4">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-2 shadow-lg`}>
        {icon}
      </div>
      <div className="text-xl font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}
