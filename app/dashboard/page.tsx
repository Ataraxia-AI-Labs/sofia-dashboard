'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchFullAnalytics, fetchVoiceMetrics, formatCOP, formatUSD, formatNumber, formatPercent } from '@/lib/api'
import type { FullAnalytics, VoiceMetrics } from '@/types'
import { MetricCard, SectionTitle, StatusPill, PerfItem, RevenueItem, BotCard, EmptyState } from '@/components/ui'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import {
  MessageSquare, Users, CalendarCheck, DollarSign, Cpu, Target,
  TrendingUp, Clock, Zap, AlertTriangle,
  RefreshCw, Bot, PhoneCall, Smartphone, ArrowRight
} from 'lucide-react'

const LazyIntentsChart = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.IntentsChart })),
  { ssr: false, loading: () => <div className="h-56 bg-surface-3 rounded-lg animate-pulse" /> },
)

// Opportunity type colors
const OPP_COLORS: Record<string, string> = {
  HOT_LEAD: '#8B5CF6',
  UPSELL: '#06D6A0',
  REACTIVATION: '#A78BFA',
  REFERRAL: '#F5C842',
  CHURN_RISK: '#EF4444',
  PRICE_SENSITIVE: '#F59E0B',
  MULTI_PROCEDURE: '#C084FC',
  HIGH_VALUE: '#34D399',
}

// OPP_LABELS removed — now uses useTranslations('opportunities.types')

export default function DashboardOverview() {
  const { orgId, branchId } = useOrg()
  const t = useTranslations('dashboard')
  const tOpp = useTranslations('opportunities.types')
  const tOppSection = useTranslations('opportunities')
  const tCommon = useTranslations('common')
  const [data, setData] = useState<FullAnalytics | null>(null)
  const [voice, setVoice] = useState<VoiceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const retryingRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (retryCount = 0) => {
    if (!orgId) return

    // Prevent concurrent retries — only the first call proceeds
    if (retryCount > 0 && retryingRef.current) return
    if (retryCount > 0) retryingRef.current = true

    setLoading(true)
    if (retryCount > 0) setError(t('connecting'))

    // Voice metrics go directly to Supabase — always load independently
    fetchVoiceMetrics(orgId, days, branchId)
      .then(v => setVoice(v))
      .catch(() => {})

    // Analytics go to backend — may fail on cold start
    try {
      const analytics = await fetchFullAnalytics(orgId, days, branchId)
      setData(analytics)
      setLastUpdate(new Date())
      setError('')
      retryingRef.current = false
    } catch (e) {
      const msg = e instanceof Error ? e.message : tCommon('errorUnknown')
      if (retryCount < 3 && (msg.includes('aborted') || msg.includes('Failed to fetch') || msg.includes('503') || msg.includes('502') || msg.includes('autenticación'))) {
        setError(t('retrying'))
        // Clear any existing retry timer before scheduling a new one
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryTimerRef.current = setTimeout(() => loadData(retryCount + 1), 10000)
        return
      }
      setError(msg)
      retryingRef.current = false
    } finally {
      setLoading(false)
    }
  }, [orgId, days, branchId])

  useEffect(() => {
    retryingRef.current = false
    loadData()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadData()
    }, 60000)
    return () => {
      clearInterval(interval)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryingRef.current = false
    }
  }, [loadData])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-surface-3 mb-3" />
              <div className="h-7 bg-surface-3 rounded w-20 mb-2" />
              <div className="h-4 bg-surface-3 rounded w-28" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="glass-card p-8 border-status-danger/30">
        <div className="flex items-center gap-3 text-status-danger mb-3">
          <AlertTriangle size={20} />
          <span className="font-semibold">{t('loadError')}</span>
        </div>
        <p className="text-text-muted text-sm">{error}</p>
        <button onClick={() => loadData()} className="mt-4 px-4 py-2 rounded-lg bg-brand-purple/10 text-brand-purple text-sm hover:bg-brand-purple/20 transition-colors">
          {tCommon('retry')}
        </button>
      </div>
    )
  }

  // ===== EMPTY STATE — New clinic with no activity yet =====
  const totalMensajes = data?.conversiones?.total_mensajes_inbound ?? 0
  const totalPacientes = data?.conversiones?.pacientes_unicos ?? 0
  const isNewClinic = !loading && !!data && totalMensajes === 0 && totalPacientes === 0

  if (isNewClinic) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-fade-up">
          {/* Glowing icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-purple/30 to-brand-cyan/20 blur-xl scale-150" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/30">
                <Zap size={28} className="text-white" />
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="glass-card p-8 text-center gradient-border">
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              {t('clinicReady')}{' '}
              <span className="gradient-text">{t('activateSofia')}</span>
            </h2>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              {t('connectWhatsAppDesc')}
            </p>

            {/* Primary CTA */}
            <a
              href="/dashboard/ajustes"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-purple/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              <MessageSquare size={16} />
              {t('connectWhatsApp')}
              <ArrowRight size={14} />
            </a>

            {/* Secondary copy */}
            <p className="text-text-dim text-xs mt-4">
              {t('sofiaResponds247')}
            </p>

            {/* Trust indicators */}
            <div className="mt-6 pt-5 border-t border-border grid grid-cols-3 gap-4">
              {[
                { value: '< 5 min', label: t('toActivate') },
                { value: '24/7', label: t('availability') },
                { value: '80%', label: t('lessWorkload') },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-lg font-bold font-display gradient-text">{item.value}</div>
                  <div className="text-[10px] text-text-dim mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick start hint */}
          <p className="text-center text-text-dim text-xs mt-4">
            {t('alreadyConnected')}{' '}
            <button
              onClick={() => loadData()}
              className="text-brand-purple hover:underline font-medium"
            >
              {t('refreshMetrics')}
            </button>
          </p>
        </div>
      </div>
    )
  }

  const c = data?.conversiones
  const r = data?.revenue
  const p = data?.performance_ia
  const o = data?.oportunidades
  const b = data?.sub_bots

  // Prepare chart data
  const intentData = Object.entries(p?.distribucion_intents || {}).map(([k, v]) => ({
    name: k.replace('_', ' '),
    value: v,
  })).slice(0, 8)

  const oppData = Object.entries(o?.por_tipo || {}).map(([k, v]) => ({
    name: tOpp.has(k) ? tOpp(k) : k,
    value: v,
    color: OPP_COLORS[k] || '#8B5CF6',
  }))

  const funnelData = [
    { name: t('messages'), value: c?.funnel?.mensajes || 0, color: '#8B5CF6' },
    { name: t('patients'), value: c?.funnel?.pacientes || 0, color: '#A78BFA' },
    { name: t('appointments'), value: c?.funnel?.citas || 0, color: '#F5C842' },
    { name: t('completedAppointments'), value: c?.funnel?.completadas || 0, color: '#06D6A0' },
  ]

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-text-primary">{t('overview')}</h2>
          {lastUpdate && (
            <p className="text-text-dim text-xs mt-0.5">
              {t('updated', { time: lastUpdate.toLocaleTimeString() })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData()} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === d
                  ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                  : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* ===== TOP METRICS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={<MessageSquare size={18} />}
          iconColor="from-brand-purple to-brand-purple-dark"
          value={formatNumber(c?.total_mensajes_inbound || 0)}
          label={t('messagesReceived')}
          sub={t('newPatients', { count: formatNumber(c?.pacientes_nuevos || 0) })}
          delay={0}
        />
        <MetricCard
          icon={<Users size={18} />}
          iconColor="from-brand-cyan to-brand-cyan-light"
          value={formatNumber(c?.pacientes_unicos || 0)}
          label={t('uniquePatients')}
          delay={1}
        />
        <MetricCard
          icon={<CalendarCheck size={18} />}
          iconColor="from-brand-purple to-brand-cyan"
          value={formatNumber(c?.total_citas || 0)}
          label={t('scheduledAppointments')}
          sub={`${formatPercent(c?.tasa_conversion_pct || 0)} ${t('conversion')}`}
          subColor="text-brand-purple"
          delay={2}
        />
        <MetricCard
          icon={<DollarSign size={18} />}
          iconColor="from-brand-gold to-amber-500"
          value={formatCOP(r?.revenue_total || 0)}
          label={t('revenue')}
          sub={`${t('pipeline')}: ${formatCOP(r?.revenue_pipeline || 0)}`}
          delay={3}
        />
        <MetricCard
          icon={<Cpu size={18} />}
          iconColor="from-status-success to-emerald-400"
          value={formatUSD(p?.total_costo_usd || 0)}
          label={t('totalAICost')}
          sub={`~${formatUSD(p?.costo_promedio_por_interaccion_usd || 0)}/msg`}
          delay={4}
        />
      </div>

      {/* ===== FUNNEL + REVENUE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="glass-card-accent p-6">
          <SectionTitle icon={<TrendingUp size={16} />} title={t('conversionFunnel')} />
          <div className="flex items-end justify-between gap-4 mt-6 px-2">
            {funnelData.map((step, i) => {
              const maxVal = funnelData[0].value || 1
              const height = Math.max((step.value / maxVal) * 140, 24)
              return (
                <div key={step.name} className="flex flex-col items-center flex-1">
                  <span className="text-lg font-bold font-mono text-text-primary mb-2">
                    {formatNumber(step.value)}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${height}px`,
                      background: step.color,
                      opacity: 0.85,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                  <span className="text-[11px] text-text-muted mt-2 text-center">{step.name}</span>
                  {i > 0 && funnelData[i - 1].value > 0 && (
                    <span className="text-[10px] text-text-dim mt-0.5">
                      {((step.value / funnelData[i - 1].value) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {/* Status pills */}
          <div className="flex gap-3 mt-6 justify-center flex-wrap">
            <StatusPill label={t('attendance')} value={formatPercent(c?.tasa_asistencia_pct || 0)} color="success" />
            <StatusPill label={t('cancellation')} value={formatPercent(c?.tasa_cancelacion_pct || 0)} color="danger" />
            <StatusPill label={t('noShow')} value={formatPercent(c?.tasa_no_show_pct || 0)} color="warning" />
          </div>
        </div>

        {/* Revenue */}
        <div className="glass-card-accent p-6">
          <SectionTitle icon={<DollarSign size={16} />} title={t('revenue')} />
          <div className="grid grid-cols-2 gap-6 mt-6">
            <RevenueItem label={t('revenueVerified')} value={formatCOP(r?.revenue_total || 0)} color="text-status-success" />
            <RevenueItem label={t('pending')} value={formatCOP(r?.revenue_pendiente || 0)} color="text-status-warning" />
            <RevenueItem label={t('pipelineAppointments')} value={formatCOP(r?.revenue_pipeline || 0)} color="text-status-info" />
            <RevenueItem label={t('monthlyProjection')} value={formatCOP(r?.proyeccion_mensual || 0)} color="text-brand-purple" />
          </div>
          <div className="mt-6 pt-4 border-t border-border flex gap-6 text-sm text-text-muted">
            <span>{t('averageTicket')}: <span className="text-text-primary font-semibold">{formatCOP(r?.ticket_promedio || 0)}</span></span>
            <span>{t('transactions')}: <span className="text-text-primary font-semibold">{formatNumber(r?.total_transacciones || 0)}</span></span>
          </div>
        </div>
      </div>

      {/* ===== VOICE AI ===== */}
      {voice && (voice.total_calls > 0 || voice.total_whatsapp > 0) && (
        <div className="glass-card-accent p-6">
          <SectionTitle icon={<PhoneCall size={16} />} title="Voice AI" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-5">
            {/* Total calls */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark flex items-center justify-center text-white shadow-lg">
                <PhoneCall size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-text-primary">{formatNumber(voice.total_calls)}</div>
                <div className="text-xs text-text-muted">{t('voiceCalls')}</div>
              </div>
            </div>

            {/* Avg duration */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-cyan to-emerald-500 flex items-center justify-center text-white shadow-lg">
                <Clock size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {voice.avg_duration_seconds > 0
                    ? `${Math.floor(voice.avg_duration_seconds / 60)}:${String(voice.avg_duration_seconds % 60).padStart(2, '0')}`
                    : '—'}
                </div>
                <div className="text-xs text-text-muted">{t('avgDuration')}</div>
              </div>
            </div>

            {/* Voice vs WhatsApp appointments */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">{t('appointmentsByChannel')}</span>
                <span className="text-[10px] text-text-dim">
                  {formatNumber(voice.appointments_by_voice + voice.appointments_by_whatsapp)} {t('total')}
                </span>
              </div>
              <div className="space-y-2.5">
                {/* Voice bar */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                    <PhoneCall size={12} className="text-brand-purple" />
                    <span className="text-xs text-text-muted">{t('voice')}</span>
                  </div>
                  <div className="flex-1 h-5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-light transition-all duration-700"
                      style={{
                        width: `${(voice.appointments_by_voice + voice.appointments_by_whatsapp) > 0
                          ? Math.max((voice.appointments_by_voice / (voice.appointments_by_voice + voice.appointments_by_whatsapp)) * 100, 2)
                          : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-brand-purple w-8 text-right">{voice.appointments_by_voice}</span>
                </div>
                {/* WhatsApp bar */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                    <Smartphone size={12} className="text-status-success" />
                    <span className="text-xs text-text-muted">WhatsApp</span>
                  </div>
                  <div className="flex-1 h-5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-status-success to-emerald-400 transition-all duration-700"
                      style={{
                        width: `${(voice.appointments_by_voice + voice.appointments_by_whatsapp) > 0
                          ? Math.max((voice.appointments_by_whatsapp / (voice.appointments_by_voice + voice.appointments_by_whatsapp)) * 100, 2)
                          : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-status-success w-8 text-right">{voice.appointments_by_whatsapp}</span>
                </div>
              </div>
              {/* Voice % pill */}
              <div className="mt-3 flex gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple font-semibold">
                  {t('voiceInteractions', { pct: voice.voice_pct })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== INTENTS + OPPORTUNITIES + PERFORMANCE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Intents chart */}
        <div className="glass-card p-6">
          <SectionTitle icon={<MessageSquare size={16} />} title={t('intents')} />
          {intentData.length > 0 ? (
            <div className="mt-4 h-56">
              <LazyIntentsChart data={intentData} />
            </div>
          ) : (
            <EmptyState title={t('noDataYet')} />
          )}
        </div>

        {/* Opportunities */}
        <div className="glass-card p-6">
          <SectionTitle icon={<Target size={16} />} title={tOppSection('title')} />
          {(o?.total || 0) > 0 ? (
            <div className="mt-4">
              <div className="text-3xl font-bold font-display gradient-text mb-4">{o?.total}</div>
              <div className="space-y-2.5">
                {oppData.map((opp) => (
                  <div key={opp.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: opp.color }} />
                      <span className="text-text-muted">{opp.name}</span>
                    </div>
                    <span className="text-text-primary font-semibold font-mono">{opp.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted">
                {t('estimatedValue')}: <span className="text-brand-purple font-semibold">{formatCOP(o?.valor_total_estimado || 0)}</span>
              </div>
            </div>
          ) : (
            <EmptyState title={t('noDataYet')} />
          )}
        </div>

        {/* Performance */}
        <div className="glass-card p-6">
          <SectionTitle icon={<Cpu size={16} />} title={t('performanceAI')} />
          <div className="mt-4 space-y-4">
            <PerfItem label={t('interactions')} value={formatNumber(p?.total_interacciones || 0)} />
            <PerfItem label={t('totalTokens')} value={formatNumber(p?.total_tokens || 0)} />
            <PerfItem label={t('avgResponseTime')} value={`${formatNumber(p?.response_time_promedio_ms || 0)}ms`} />
            <PerfItem label={t('totalCost')} value={formatUSD(p?.total_costo_usd || 0)} accent />
            <PerfItem label={t('monthlyProjection')} value={formatUSD(p?.proyeccion_costo_mensual_usd || 0)} accent />
            <div className="pt-3 border-t border-border">
              <div className="text-xs text-text-dim mb-2">{t('mostUsedTools')}</div>
              {Object.entries(p?.herramientas_usadas || {}).slice(0, 4).map(([tool, count]) => (
                <div key={tool} className="flex justify-between text-xs py-1">
                  <span className="text-text-muted font-mono">{tool}</span>
                  <span className="text-text-primary font-semibold">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SUB-BOTS ===== */}
      <div>
        <SectionTitle icon={<Bot size={16} />} title={t('subBots')} className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BotCard
            emoji="⏰"
            name="Reminder Bot"
            value={b?.reminder_bot?.mensajes_enviados || 0}
            label={t('remindersSent')}
            desc={b?.reminder_bot?.descripcion}
            gradient="from-brand-purple to-brand-purple-dark"
            formatNumber={formatNumber}
          />
          <BotCard
            emoji="🎯"
            name="Hunter Bot"
            value={b?.hunter_bot?.followups_enviados || 0}
            label={t('followupsSent')}
            extra={`${b?.hunter_bot?.conversiones_post_followup || 0} ${t('conversions')}`}
            desc={b?.hunter_bot?.descripcion}
            gradient="from-brand-gold to-amber-600"
            formatNumber={formatNumber}
          />
          <BotCard
            emoji="💊"
            name="Nurse Bot"
            value={b?.nurse_bot?.recordatorios_enviados || 0}
            label={t('medicationReminders')}
            desc={b?.nurse_bot?.descripcion}
            gradient="from-brand-cyan to-emerald-500"
            formatNumber={formatNumber}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-text-dim text-xs">
        {t('footer')}
      </div>
    </div>
  )
}

