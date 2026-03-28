'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  getVoiceAnalytics, getCallHistory, getCallDetail,
  generateCallSummary, getCallEvents,
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
  RefreshCw, X, Loader2, Bot, User, MessageCircle, FileText,
  ArrowRightLeft, Sparkles, PhoneCall,
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
  const [summaryLoading, setSummaryLoading] = useState(false)
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

  const handleGenerateSummary = async () => {
    if (!selectedCall) return
    setSummaryLoading(true)
    try {
      const updated = await generateCallSummary(orgId, selectedCall.id)
      if (updated) setSelectedCall(updated)
    } catch (err) {
      Sentry.captureException(err)
    }
    setSummaryLoading(false)
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
            <span className="text-[10px] font-mono text-text-dim font-semibold uppercase tracking-wider">
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
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
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
          <div className="divide-y divide-border">
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

      {/* CALL DETAIL MODAL */}
      {showModal && selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface border border-border rounded-lg  flex flex-col overflow-hidden animate-fade-in">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-xs font-bold font-mono">
                  {selectedCall.patient_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold font-mono text-text-primary">
                      {selectedCall.patient_name}
                    </span>
                    <CallStatusBadge status={selectedCall.status} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-text-dim">
                    <span className="flex items-center gap-1">
                      <Clock size={8} /> {formatDuration(selectedCall.duration_seconds)}
                    </span>
                    <span>{selectedCall.started_at ? timeAgo(selectedCall.started_at) : ''}</span>
                    <SentimentBadge sentiment={selectedCall.sentiment_overall} compact />
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                aria-label={tCommon('close')}
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {detailLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className="w-3/4 h-10 bg-surface-3 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Transcription */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary mb-3 flex items-center gap-1.5">
                      <MessageCircle size={12} className="text-brand-purple" />
                      {t('transcription')}
                    </h4>
                    <div className="space-y-2">
                      {transcription.map((seg, idx) => {
                        const isSofia = seg.speaker === 'SOFIA'
                        // Check if there is a cross-modal event at this timestamp
                        const crossModalEvent = events.find(e =>
                          e.event_type === 'CROSS_MODAL' &&
                          Math.abs(new Date(e.created_at).getTime() - new Date(seg.timestamp).getTime()) < 30000
                        )

                        return (
                          <div key={idx}>
                            <div className={`flex ${isSofia ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] ${
                                isSofia
                                  ? 'bg-brand-purple/15 border border-brand-purple/20 rounded-lg rounded-br-md'
                                  : 'bg-surface-3 border border-border rounded-lg rounded-bl-md'
                              } px-3 py-2`}>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  {isSofia ? (
                                    <Bot size={9} className="text-brand-purple" />
                                  ) : (
                                    <User size={9} className="text-text-dim" />
                                  )}
                                  <span className={`text-[9px] font-semibold ${isSofia ? 'text-brand-purple' : 'text-text-dim'}`}>
                                    {isSofia ? 'SofIA' : t('patient')}
                                  </span>
                                  <SentimentBadge sentiment={seg.sentiment} compact />
                                </div>
                                <p className={`text-[11px] leading-relaxed ${isSofia ? 'text-text-secondary' : 'text-text-primary'}`}>
                                  {seg.text}
                                </p>
                                <span className="text-[8px] text-text-dim mt-0.5 block">
                                  {new Date(seg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Cross-modal event inline */}
                            {crossModalEvent && (
                              <div className="flex items-center gap-2 my-2">
                                <div className="flex-1 h-px bg-brand-cyan/20" />
                                <span className="text-[9px] text-brand-cyan font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-cyan/8 border border-brand-cyan/15">
                                  <ArrowRightLeft size={8} />
                                  {String(crossModalEvent.content?.description || t('crossModalEvent'))}
                                </span>
                                <div className="flex-1 h-px bg-brand-cyan/20" />
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {transcription.length === 0 && (
                        <p className="text-[10px] text-text-dim text-center py-6">{t('noTranscription')}</p>
                      )}
                    </div>
                  </div>

                  {/* Call Summary */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                        <FileText size={12} className="text-brand-gold" />
                        {t('callSummary')}
                      </h4>
                      {!selectedCall.summary?.topics?.length && (
                        <button
                          onClick={handleGenerateSummary}
                          disabled={summaryLoading}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-semibold hover:bg-brand-purple/20 transition-colors disabled:opacity-50"
                        >
                          {summaryLoading ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Sparkles size={10} />
                          )}
                          {t('generateSummary')}
                        </button>
                      )}
                    </div>

                    {selectedCall.summary?.topics?.length ? (
                      <div className="space-y-4">
                        {/* Narrative summary + Sentiment */}
                        <div className="glass-card p-3 space-y-2.5">
                          {selectedCall.summary.summary_text && (
                            <p className="text-[11px] leading-relaxed text-text-secondary font-mono">
                              {selectedCall.summary.summary_text}
                            </p>
                          )}
                          {selectedCall.summary.sentiment_overall && (
                            <div className="flex items-center gap-2 pt-1">
                              <SentimentBadge sentiment={selectedCall.summary.sentiment_overall as SentimentType} />
                            </div>
                          )}
                        </div>

                        {/* Topics */}
                        <div>
                          <span className="text-[10px] text-text-dim font-mono font-semibold uppercase tracking-wider">{t('topics')}</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {selectedCall.summary.topics.map((topic, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-[10px] text-brand-purple font-mono font-medium">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action items + Follow-ups side by side */}
                        {((selectedCall.summary.action_items?.length ?? 0) > 0 || (selectedCall.summary.follow_ups?.length ?? 0) > 0) && (
                          <div className="grid grid-cols-2 gap-3">
                            {/* Action items */}
                            {selectedCall.summary.action_items && selectedCall.summary.action_items.length > 0 && (
                              <div className="glass-card p-3">
                                <span className="text-[10px] text-brand-cyan font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                                  {t('actionItems')}
                                </span>
                                <ul className="space-y-1.5">
                                  {selectedCall.summary.action_items.map((item, i) => (
                                    <li key={i} className="text-[10px] text-text-muted font-mono flex items-start gap-1.5">
                                      <span className="text-brand-cyan text-[8px] mt-0.5">&#9654;</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* Follow-ups */}
                            {selectedCall.summary.follow_ups && selectedCall.summary.follow_ups.length > 0 && (
                              <div className="glass-card p-3">
                                <span className="text-[10px] text-brand-gold font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                                  {t('followUps')}
                                </span>
                                <ul className="space-y-1.5">
                                  {selectedCall.summary.follow_ups.map((fu, i) => (
                                    <li key={i} className="text-[10px] text-text-muted font-mono flex items-start gap-1.5">
                                      <span className="text-brand-gold text-[8px] mt-0.5">&#9654;</span>
                                      {fu}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-dim font-mono">
                        {summaryLoading ? tCommon('loading') : t('noSummary')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
      <span className="text-[10px] font-mono text-text-muted mt-0.5 block">{label}</span>
    </div>
  )
}
