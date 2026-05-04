'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  getVoiceAnalytics, getCallHistory, getCallDetail, getCallEvents,
} from '@/lib/api/voice'
import { SentimentBadge, SENTIMENT_CONFIG } from '@/components/sentiment-badge'
import { CallStatusBadge } from '@/components/call-status-badge'
import { timeAgo } from '@/lib/api/helpers'
import type {
  VoiceAnalytics, CallRecord, TranscriptionSegment,
  CallEvent, SentimentType,
} from '@/types'
import {
  Phone, TrendingUp, TrendingDown, Clock, Calendar, Users,
  RefreshCw, X, Bot, User, MessageCircle,
  ArrowRightLeft, PhoneCall,
} from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// ============================================================
// VOICE AI PANEL (P5-10)
// ============================================================

interface VoicePanelProps {
  orgId: string
}

export default function VoicePanel({ orgId }: VoicePanelProps) {
  const t = useTranslations('voice')
  const tCommon = useTranslations('common')

  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null)
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([])
  const [events, setEvents] = useState<CallEvent[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [a, c] = await Promise.all([
        getVoiceAnalytics(orgId),
        getCallHistory(orgId),
      ])
      setAnalytics(a)
      setCalls(c)
    } catch (err) {
      Sentry.captureException(err)
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadData() }, [loadData])

  const handleSelectCall = async (call: CallRecord) => {
    setSelectedCall(call)
    setShowModal(true)
    setDetailLoading(true)
    try {
      const [detail, ev] = await Promise.all([
        getCallDetail(orgId, call.id),
        getCallEvents(orgId, call.id),
      ])
      if (detail) {
        setTranscription(detail.transcription || [])
        // Only update call data if backend returned it — don't overwrite with undefined
        if (detail.call) setSelectedCall(detail.call)
      }
      setEvents(ev || [])
    } catch (err) {
      Sentry.captureException(err)
    }
    setDetailLoading(false)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCall(null)
    setTranscription([])
    setEvents([])
  }

  // Format duration (null-safe)
  const formatDuration = (seconds?: number | null): string => {
    if (seconds == null || isNaN(seconds) || seconds === 0) return '\u2014'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-surface-3 rounded w-20 mb-3" />
              <div className="h-7 bg-surface-3 rounded w-14" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Sentiment distribution for donut
  const sentimentEntries = analytics?.sentiment_distribution
    ? Object.entries(analytics.sentiment_distribution) as [SentimentType, number][]
    : []
  const totalSentiment = sentimentEntries.reduce((sum, [, v]) => sum + v, 0)

  // Donut chart CSS conic-gradient
  let conicGradient = ''
  if (sentimentEntries.length > 0 && totalSentiment > 0) {
    const SENTIMENT_COLORS_HEX: Record<SentimentType, string> = {
      POSITIVE: '#34d399',
      NEUTRAL: '#9ca3af',
      FRUSTRATED: '#f87171',
      CONFUSED: '#fb923c',
      ENTHUSIASTIC: '#c084fc',
    }
    let accumulated = 0
    const segments: string[] = []
    for (const [sentiment, count] of sentimentEntries) {
      const pct = (count / totalSentiment) * 100
      const color = SENTIMENT_COLORS_HEX[sentiment] || '#9ca3af'
      segments.push(`${color} ${accumulated}% ${accumulated + pct}%`)
      accumulated += pct
    }
    conicGradient = `conic-gradient(${segments.join(', ')})`
  }

  return (
    <div className="space-y-4">
      {/* ANALYTICS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnalyticsCard
          icon={<Phone size={16} />}
          label={t('totalCalls')}
          value={(analytics?.total_calls ?? 0).toString()}
          trend={analytics?.calls_trend ?? 0}
          gradient="from-brand-purple to-brand-purple-dark"
        />
        <AnalyticsCard
          icon={<Clock size={16} />}
          label={t('avgDuration')}
          value={formatDuration(analytics?.avg_duration_seconds ?? 0)}
          gradient="from-brand-cyan to-brand-cyan"
        />
        <AnalyticsCard
          icon={<ArrowRightLeft size={16} />}
          label={t('handoffRate')}
          value={`${((analytics?.handoff_rate ?? 0) * 100).toFixed(1)}%`}
          gradient="from-status-warning to-brand-gold"
        />
        <AnalyticsCard
          icon={<Calendar size={16} />}
          label={t('appointmentsBooked')}
          value={(analytics?.appointments_booked ?? 0).toString()}
          gradient="from-status-success to-status-success"
        />
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-text-muted" />
            <span className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider">
              {t('sentimentDistribution')}
            </span>
          </div>
          {conicGradient ? (
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex-shrink-0"
                style={{
                  background: conicGradient,
                  mask: 'radial-gradient(circle at center, transparent 40%, black 41%)',
                  WebkitMask: 'radial-gradient(circle at center, transparent 40%, black 41%)',
                }}
              />
              <div className="flex flex-wrap gap-1">
                {sentimentEntries.map(([sentiment, count]) => (
                  <span key={sentiment} className="text-[8px] text-text-dim flex items-center gap-0.5">
                    <SentimentBadge sentiment={sentiment} compact />
                    {count}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-text-dim">{t('noData')}</span>
          )}
        </div>
      </div>

      {/* RECENT CALLS */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold font-mono text-text-primary flex items-center gap-2">
            <PhoneCall size={14} className="text-brand-purple" />
            {t('recentCalls')}
          </h3>
          <button
            onClick={loadData}
            className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            aria-label={tCommon('refresh')}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {calls.length === 0 ? (
          <div className="p-8 text-center">
            <Phone size={28} className="mx-auto text-text-dim mb-2" />
            <p className="text-text-muted text-xs font-medium">{t('noCalls')}</p>
            <p className="text-text-dim text-[10px] mt-1">{t('noCallsHint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {calls.map(call => (
              <button
                key={call.id}
                onClick={() => handleSelectCall(call)}
                className="w-full text-left px-5 py-3 hover:bg-surface-2 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {/* Patient avatar */}
                  <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center text-[10px] font-bold text-text-muted group-hover:bg-brand-purple/10 group-hover:text-brand-purple transition-colors flex-shrink-0">
                    {call.patient_name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {call.patient_name}
                      </span>
                      <CallStatusBadge status={call.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-text-dim flex items-center gap-1">
                        <Clock size={8} /> {formatDuration(call.duration_seconds)}
                      </span>
                      <span className="text-[10px] text-text-dim">
                        {call.started_at ? timeAgo(call.started_at) : ''}
                      </span>
                    </div>
                  </div>

                  {/* Sentiment */}
                  <SentimentBadge sentiment={call.sentiment_overall} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CALL DETAIL MODAL — S138/S139:
          - Tight spacing (no separator borders between sections, just gap)
          - Defensive patient_name guard (UUID prefix → "Sin identificar")
          - Stat pills + summary buckets + transcript chat thread.
          Closes on Escape (handled by the dialog) and overlay click. */}
      {showModal && selectedCall && (() => {
        // S139: detect UUID-prefix-as-name (legacy data + paranoid fallback).
        // Backend now returns "Sin identificar" but old rows still have hex
        // garbage in patient_name. Normalize at render time.
        const rawName = (selectedCall.patient_name || '').trim()
        const looksLikeIdPrefix = /^[a-f0-9]{6,}$/i.test(rawName)
        const displayName = (!rawName || looksLikeIdPrefix) ? t('unknownPatient') : rawName
        const initial = (!rawName || looksLikeIdPrefix) ? '?' : rawName[0].toUpperCase()
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="call-detail-title">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeModal} />
          <div className="relative w-full max-w-2xl max-h-[88vh] bg-surface border border-border rounded-xl flex flex-col overflow-hidden animate-fade-in shadow-[0_24px_56px_-16px_rgba(0,0,0,0.7),0_0_0_1px_rgba(139,92,246,0.08)]">

            {/* Header: avatar + name + close. Compact: pb-2 instead of pb-3
                so the stats grid below sits closer. */}
            <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-[13px] font-bold font-body flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 id="call-detail-title" className="text-[14px] font-semibold font-mono text-text-primary truncate">
                      {displayName}
                    </h3>
                    <CallStatusBadge status={selectedCall.status} />
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {selectedCall.started_at
                      ? new Date(selectedCall.started_at).toLocaleString('es-CO', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })
                      : timeAgo(selectedCall.started_at || '')}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                aria-label={tCommon('close')}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Stat pills row — 3 metrics inline, no border separator above
                or below to keep the modal feeling continuous. */}
            <div className="px-5 pb-3 grid grid-cols-3 gap-2 flex-shrink-0">
              <StatPill
                icon={<Clock size={11} aria-hidden="true" />}
                label={t('duration')}
                value={formatDuration(selectedCall.duration_seconds)}
              />
              <StatPill
                icon={<PhoneCall size={11} aria-hidden="true" />}
                label={t('direction')}
                value={selectedCall.direction === 'INBOUND' ? t('inbound') : t('outbound')}
              />
              <StatPill
                icon={<MessageCircle size={11} aria-hidden="true" />}
                label={t('sentiment')}
                value={<SentimentBadge sentiment={selectedCall.sentiment_overall} compact />}
              />
            </div>

            {/* Summary card (topics + action items + follow ups), shown only
                when the backend returned at least one bucket. Empty state
                doesn't render this so we don't burn vertical real estate. */}
            {(() => {
              const s = selectedCall.summary || {}
              const hasTopics = Array.isArray(s.topics) && s.topics.length > 0
              const hasActions = Array.isArray(s.action_items) && s.action_items.length > 0
              const hasFollowUps = Array.isArray(s.follow_ups) && s.follow_ups.length > 0
              if (!hasTopics && !hasActions && !hasFollowUps) return null
              return (
                <div className="px-5 pb-3 flex-shrink-0 grid gap-2 sm:grid-cols-2">
                  {hasTopics && (
                    <SummaryBucket label={t('topics')} items={s.topics as string[]} accent="purple" />
                  )}
                  {hasActions && (
                    <SummaryBucket label={t('actionItems')} items={s.action_items as string[]} accent="cyan" />
                  )}
                  {hasFollowUps && (
                    <SummaryBucket label={t('followUps')} items={s.follow_ups as string[]} accent="amber" />
                  )}
                </div>
              )
            })()}

            {/* Transcript — single hairline divider above so it visually
                separates from the metadata above without adding extra padding. */}
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4 border-t border-border/20">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageCircle size={12} className="text-brand-purple" aria-hidden="true" />
                <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                  {t('transcription')}
                </h4>
                {transcription.length > 0 && (
                  <span className="text-[10px] text-text-dim ml-auto">
                    {transcription.length} {transcription.length === 1 ? t('turn') : t('turns')}
                  </span>
                )}
              </div>
              {detailLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className="w-3/4 h-10 bg-surface-3 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : transcription.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle size={20} className="mx-auto text-text-dim mb-2" aria-hidden="true" />
                  <p className="text-[12px] text-text-muted">{t('noTranscription')}</p>
                  <p className="text-[10px] text-text-dim mt-1">{t('noTranscriptionHint')}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transcription.map((seg, idx) => {
                    const isSofia = seg.speaker === 'SOFIA'
                    const crossModalEvent = events.find(e =>
                      e.event_type === 'CROSS_MODAL' &&
                      Math.abs(new Date(e.created_at).getTime() - new Date(seg.timestamp).getTime()) < 30000
                    )

                    return (
                      <div key={idx}>
                        <div className={`flex ${isSofia ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[82%] ${
                            isSofia
                              ? 'bg-brand-purple/12 border border-brand-purple/20 rounded-2xl rounded-br-md'
                              : 'bg-surface-2 border border-border rounded-2xl rounded-bl-md'
                          } px-3 py-2`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              {isSofia ? (
                                <Bot size={10} className="text-brand-purple" aria-hidden="true" />
                              ) : (
                                <User size={10} className="text-text-muted" aria-hidden="true" />
                              )}
                              <span className={`text-[10px] font-semibold ${isSofia ? 'text-brand-purple' : 'text-text-muted'}`}>
                                {isSofia ? 'SofIA' : t('patient')}
                              </span>
                              <SentimentBadge sentiment={seg.sentiment} compact />
                            </div>
                            <p className={`text-[12px] leading-relaxed ${isSofia ? 'text-text-secondary' : 'text-text-primary'}`}>
                              {seg.text}
                            </p>
                            <span className="text-[9px] text-text-dim mt-1 block">
                              {new Date(seg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {crossModalEvent && (
                          <div className="flex items-center gap-2 my-2">
                            <div className="flex-1 h-px bg-brand-cyan/20" />
                            <span className="text-[9px] text-brand-cyan font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-cyan/8 border border-brand-cyan/15">
                              <ArrowRightLeft size={8} aria-hidden="true" />
                              {String(crossModalEvent.content?.description || t('crossModalEvent'))}
                            </span>
                            <div className="flex-1 h-px bg-brand-cyan/20" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}

// ============================================================
// ANALYTICS CARD
// ============================================================

function AnalyticsCard({
  icon,
  label,
  value,
  trend,
  gradient,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number
  gradient: string
}) {
  return (
    <div className="glass-card p-4">
      <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple mb-2">
        {icon}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xl font-bold font-mono text-text-primary">{value}</span>
        {trend != null && trend !== 0 && (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
            trend > 0 ? 'text-status-success' : 'text-status-danger'
          }`}>
            {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
        )}
      </div>
      <span className="text-[12px] font-body text-text-muted mt-0.5 block">{label}</span>
    </div>
  )
}

// ============================================================
// CALL DETAIL MODAL HELPERS (S138)
// ============================================================

function StatPill({
  icon, label, value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 flex flex-col gap-0.5 min-w-0">
      <span className="text-[9.5px] font-mono uppercase tracking-wider text-text-dim flex items-center gap-1">
        <span className="text-text-muted" aria-hidden="true">{icon}</span>
        {label}
      </span>
      <div className="text-[12px] font-body font-semibold text-text-primary truncate">
        {value}
      </div>
    </div>
  )
}

function SummaryBucket({
  label, items, accent,
}: {
  label: string
  items: string[]
  accent: 'purple' | 'cyan' | 'amber'
}) {
  const accentClass = accent === 'cyan'
    ? 'text-brand-cyan'
    : accent === 'amber'
      ? 'text-status-warning'
      : 'text-brand-purple'
  return (
    <div className="rounded-lg border border-border/40 bg-surface-2/30 px-3 py-2">
      <span className={`text-[9.5px] font-mono uppercase tracking-wider font-semibold ${accentClass}`}>
        {label}
      </span>
      <ul className="mt-1.5 space-y-1 list-disc list-inside marker:text-text-dim">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="text-[11.5px] font-body text-text-secondary leading-snug">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
