'use client'

/**
 * S141 Voice analytics panel — moved from /conversaciones (S140 cleanup)
 * to /inteligencia where aggregate metrics belong.
 *
 * The /voice/{org_id}/analytics endpoint stayed warm in the backend after
 * voice-panel.tsx was deleted; this panel surfaces it again as the
 * "Voz" tab inside Inteligencia. No listing here — individual calls now
 * live in the unified Transmisiones timeline.
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { getVoiceAnalytics } from '@/lib/api/voice'
import { SentimentBadge } from '@/components/sentiment-badge'
import type { VoiceAnalytics, SentimentType } from '@/types'
import {
  Phone, Clock, Calendar, Users, ArrowRightLeft, RefreshCw, TrendingUp, TrendingDown,
} from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  orgId: string
}

export function VoiceAnalyticsPanel({ orgId }: Props) {
  const t = useTranslations('voice')
  const tCommon = useTranslations('common')

  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null)
  const [period, setPeriod] = useState<7 | 30 | 60 | 90>(30)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getVoiceAnalytics(orgId, String(period))
      setAnalytics(data)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId, period])

  useEffect(() => { loadData() }, [loadData])

  const formatDuration = (seconds?: number | null): string => {
    if (seconds == null || isNaN(seconds) || seconds === 0) return '—'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Sentiment distribution donut
  const sentimentEntries = analytics?.sentiment_distribution
    ? (Object.entries(analytics.sentiment_distribution) as [SentimentType, number][])
    : []
  const totalSentiment = sentimentEntries.reduce((sum, [, v]) => sum + v, 0)

  let conicGradient = ''
  if (sentimentEntries.length > 0 && totalSentiment > 0) {
    const COLORS: Record<SentimentType, string> = {
      POSITIVE: '#34d399',
      NEUTRAL: '#9ca3af',
      FRUSTRATED: '#f87171',
      CONFUSED: '#fb923c',
      ENTHUSIASTIC: '#c084fc',
    }
    let acc = 0
    const segments: string[] = []
    for (const [s, c] of sentimentEntries) {
      const pct = (c / totalSentiment) * 100
      const color = COLORS[s] || '#9ca3af'
      segments.push(`${color} ${acc}% ${acc + pct}%`)
      acc += pct
    }
    conicGradient = `conic-gradient(${segments.join(', ')})`
  }

  return (
    <div className="space-y-3">
      {/* Period selector + refresh */}
      <div className="flex items-center justify-between">
        <div role="radiogroup" aria-label={t('period')} className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-surface-2/50 border border-border/40">
          {([7, 30, 60, 90] as const).map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                period === p
                  ? 'bg-brand-purple/15 text-brand-purple'
                  : 'text-text-dim hover:text-text-primary'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
        <button
          onClick={loadData}
          aria-label={tCommon('refresh')}
          className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw size={13} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 220px))' }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-surface-2/40 px-3 py-2.5 animate-pulse">
              <div className="h-3 bg-surface-3 rounded w-20 mb-2" />
              <div className="h-5 bg-surface-3 rounded w-14" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 220px))' }}
        >
          <AnalyticsCard
            icon={<Phone size={16} aria-hidden="true" />}
            label={t('totalCalls')}
            value={(analytics?.total_calls ?? 0).toString()}
            trend={analytics?.calls_trend ?? 0}
          />
          <AnalyticsCard
            icon={<Clock size={16} aria-hidden="true" />}
            label={t('avgDuration')}
            value={formatDuration(analytics?.avg_duration_seconds ?? 0)}
          />
          <AnalyticsCard
            icon={<ArrowRightLeft size={16} aria-hidden="true" />}
            label={t('handoffRate')}
            value={`${((analytics?.handoff_rate ?? 0) * 100).toFixed(1)}%`}
          />
          <AnalyticsCard
            icon={<Calendar size={16} aria-hidden="true" />}
            label={t('appointmentsBooked')}
            value={(analytics?.appointments_booked ?? 0).toString()}
          />
          <div className="rounded-lg border border-border/50 bg-surface-2/40 px-3 py-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-text-dim">
              <Users size={11} className="text-brand-purple" aria-hidden="true" />
              <span className="text-[10px] font-mono uppercase tracking-wider truncate">
                {t('sentimentDistribution')}
              </span>
            </div>
            {conicGradient ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  aria-hidden="true"
                  style={{
                    background: conicGradient,
                    mask: 'radial-gradient(circle at center, transparent 38%, black 40%)',
                    WebkitMask: 'radial-gradient(circle at center, transparent 38%, black 40%)',
                  }}
                />
                <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 min-w-0">
                  {sentimentEntries.map(([s, c]) => (
                    <span key={s} className="text-[9px] text-text-dim flex items-center gap-0.5">
                      <SentimentBadge sentiment={s} compact />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-text-dim">{t('noData')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsCard({
  icon, label, value, trend,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number
}) {
  // S142: tighter Hyprland card — smaller icon chip, smaller value type,
  // label moved to top so the card reads at a glance instead of feeling
  // monstrous. Was glass-card p-4 with text-xl value.
  return (
    <div className="rounded-lg border border-border/50 bg-surface-2/40 px-3 py-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-text-dim">
        <span className="text-brand-purple">{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-bold font-mono text-text-primary leading-none">{value}</span>
        {trend != null && trend !== 0 && (
          <span className={`text-[9.5px] font-semibold flex items-center gap-0.5 ${
            trend > 0 ? 'text-status-success' : 'text-status-danger'
          }`}>
            {trend > 0 ? <TrendingUp size={9} aria-hidden="true" /> : <TrendingDown size={9} aria-hidden="true" />}
            {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}
