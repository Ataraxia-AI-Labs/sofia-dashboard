'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchFullAnalytics, fetchVoiceMetrics, formatCOP, formatUSD, formatNumber, formatPercent } from '@/lib/api'
import { intentLabel, mergeIntentDistribution, opportunityLabel, mergeOpportunityDistribution } from '@/lib/label-maps'
import type { FullAnalytics, VoiceMetrics } from '@/types'
import { MetricCard, SectionTitle, StatusPill, PerfItem, RevenueItem, BotCard, EmptyState } from '@/components/ui'
import { AtaraxiaScore, SofiaSpeaks, NightReport, PhantomGrid } from '@/components/innovations'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import {
  MessageSquare, Users, CalendarCheck, DollarSign, Cpu, Target,
  TrendingUp, Clock, Zap, AlertTriangle,
  RefreshCw, Bot, PhoneCall, Smartphone, ArrowRight
} from 'lucide-react'

const LazyIntentsChart = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.IntentsChart })),
  { ssr: false, loading: () => <div className="h-48 bg-surface-3 rounded-md animate-pulse" /> },
)

const OPP_COLORS: Record<string, string> = {
  HOT_LEAD: '#8B5CF6',
  UPSELL: '#06D6A0',
  REACTIVATION: '#A78BFA',
  REFERRAL: '#F5C842',
  CHURN_RISK: '#EF4444',
  PRICE_SENSITIVE: '#F59E0B',
  MULTI_PROCEDURE: '#C084FC',
  HIGH_VALUE: '#34D399',
  CROSS_SELL: '#38BDF8',
}

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

    if (retryCount > 0 && retryingRef.current) return
    if (retryCount > 0) retryingRef.current = true

    setLoading(true)
    if (retryCount > 0) setError(t('connecting'))

    try {
      const [analytics, voiceData] = await Promise.all([
        fetchFullAnalytics(orgId, days, branchId),
        fetchVoiceMetrics(orgId, days, branchId).catch(() => null),
      ])
      setVoice(voiceData)
      setData(analytics)
      setLastUpdate(new Date())
      setError('')
      retryingRef.current = false
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      // Only retry on cold-start errors (502/503/timeout), NOT on auth failures
      if (retryCount < 2 && (msg.includes('aborted') || msg.includes('Failed to fetch') || msg.includes('503') || msg.includes('502'))) {
        setError(retryCount === 0 ? 'Servidor iniciando...' : 'Reintentando...')
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
        retryTimerRef.current = setTimeout(() => loadData(retryCount + 1), 8000)
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

  /* ---- Loading skeleton ---- */
  if (loading && !data) {
    return (
      <div className="space-y-4 max-w-[1200px]">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="w-8 h-8 rounded-md bg-surface-3 mb-2" />
              <div className="h-6 bg-surface-3 rounded w-16 mb-1" />
              <div className="h-3 bg-surface-3 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ---- Error state ---- */
  if (error && !data) {
    return (
      <div className="glass-card p-6 border-status-danger/20 max-w-[1200px]">
        <div className="flex items-center gap-2 text-status-danger mb-2">
          <AlertTriangle size={16} />
          <span className="text-xs font-mono font-semibold">{t('loadError')}</span>
        </div>
        <p className="text-text-muted text-[10px] font-mono">{error}</p>
        <button onClick={() => loadData()} className="mt-3 px-3 py-1.5 rounded-md bg-brand-purple/8 text-brand-purple text-[10px] font-mono hover:bg-brand-purple/15 transition-colors">
          {tCommon('retry')}
        </button>
      </div>
    )
  }

  /* ---- Empty state — new clinic ---- */
  const totalMensajes = data?.conversiones?.total_mensajes_inbound ?? 0
  const totalPacientes = data?.conversiones?.pacientes_unicos ?? 0
  const isNewClinic = !loading && !!data && totalMensajes === 0 && totalPacientes === 0

  if (isNewClinic) {
    // If filtering by a specific branch, show branch-specific empty state
    if (branchId) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-fade-up">
            <div className="glass-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
                  <Target size={20} className="text-brand-purple" />
                </div>
              </div>
              <h2 className="text-sm font-mono font-bold text-text-primary mb-1">
                Esta sede aun no tiene actividad
              </h2>
              <p className="text-text-muted text-[10px] font-mono leading-relaxed mb-4">
                Los datos apareceran cuando los pacientes interactuen con esta sede.
                Puedes volver a &quot;Todas las sedes&quot; para ver el panorama general.
              </p>
              <button
                onClick={() => loadData()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-purple/8 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/15 transition-colors"
              >
                <RefreshCw size={12} />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-up">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center">
              <Zap size={24} className="text-brand-purple" />
            </div>
          </div>

          <div className="glass-card p-6 text-center">
            <h2 className="text-lg font-mono font-bold text-text-primary mb-1">
              {t('clinicReady')}{' '}
              <span className="text-brand-purple">{t('activateSofia')}</span>
            </h2>
            <p className="text-text-muted text-[10px] font-mono leading-relaxed mb-5">
              {t('connectWhatsAppDesc')}
            </p>

            <a
              href="/dashboard/ajustes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors"
            >
              <MessageSquare size={14} />
              {t('connectWhatsApp')}
              <ArrowRight size={12} />
            </a>

            <p className="text-text-dim text-[9px] font-mono mt-3">
              {t('sofiaResponds247')}
            </p>

            {/* Trust indicators */}
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-3">
              {[
                { value: '< 5 min', label: t('toActivate') },
                { value: '24/7', label: t('availability') },
                { value: '80%', label: t('lessWorkload') },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-sm font-mono font-bold text-brand-purple">{item.value}</div>
                  <div className="text-[8px] text-text-dim font-mono mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-text-dim text-[9px] font-mono mt-3">
            {t('alreadyConnected')}{' '}
            <button
              onClick={() => loadData()}
              className="text-brand-purple hover:underline font-semibold"
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

  // Merge duplicate intent keys (UNKNOWN+OTRO, AGENDAR+SCHEDULEAPPOINTMENT, etc.)
  // then show Spanish labels. Filters out UNKNOWN/OTRO which don't add signal to the chart.
  const mergedIntents = mergeIntentDistribution(p?.distribucion_intents as Record<string, number> | undefined)
  const intentData = Object.entries(mergedIntents)
    .filter(([k]) => k !== 'UNKNOWN')
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 8)
    .map(([k, v]) => ({ name: intentLabel(k), value: v }))

  // Merge duplicate opportunity types (WINBACK+REACTIVATION, REFERRAL_POTENTIAL+REFERRAL, etc.)
  const mergedOpps = mergeOpportunityDistribution(o?.por_tipo as Record<string, number> | undefined)
  const oppData = Object.entries(mergedOpps).map(([k, v]) => ({
    name: tOpp.has(k) ? tOpp(k) : opportunityLabel(k),
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
    <div className="space-y-5 max-w-[1200px]">
      {/* ===== SENTIENT HEADER: Ataraxia Score + Controls ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
        <div className="space-y-2">
          {data && <AtaraxiaScore data={data} voice={voice} />}
          {data && <SofiaSpeaks data={data} voice={voice} />}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <button onClick={() => loadData()} aria-label={tCommon('refresh')} className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold transition-all ${
                  days === d
                    ? 'bg-brand-purple/10 text-brand-purple border border-brand-purple/20'
                    : 'bg-surface-2 text-text-muted border border-border hover:border-border-2'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          {lastUpdate && (
            <p className="text-text-dim text-[9px] font-mono">
              {t('updated', { time: lastUpdate.toLocaleTimeString() })}
            </p>
          )}
        </div>
      </div>

      {/* ===== NIGHT REPORT ===== */}
      <NightReport />

      {/* ===== TOP METRICS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          icon={<MessageSquare size={16} />}
          iconColor="from-brand-purple to-brand-purple-dark"
          value={formatNumber(c?.total_mensajes_inbound || 0)}
          label={t('messagesReceived')}
          sub={t('newPatients', { count: formatNumber(c?.pacientes_nuevos || 0) })}
          tooltip="Mensajes INBOUND (del paciente hacia la clinica) recibidos en el periodo. 'Nuevos registrados' = pacientes creados en el periodo, ya sea por SofIA o agregados manualmente desde el dashboard."
          delay={0}
        />
        <MetricCard
          icon={<Users size={16} />}
          iconColor="from-brand-cyan to-brand-cyan-light"
          value={formatNumber(c?.pacientes_unicos || 0)}
          label={t('uniquePatients')}
          tooltip="Pacientes distintos que enviaron al menos un mensaje en el periodo. Puede ser MENOR que 'nuevos registrados' si se crearon pacientes manualmente sin conversacion."
          delay={1}
        />
        <MetricCard
          icon={<CalendarCheck size={16} />}
          iconColor="from-brand-purple to-brand-cyan"
          value={formatNumber(c?.total_citas || 0)}
          label={t('scheduledAppointments')}
          sub={`${formatPercent(c?.tasa_conversion_pct || 0)} ${t('conversion')}`}
          subColor="text-brand-purple"
          delay={2}
        />
        <MetricCard
          icon={<DollarSign size={16} />}
          iconColor="from-brand-gold to-brand-gold"
          value={formatCOP(r?.revenue_total || 0)}
          label={t('revenue')}
          sub={`${t('pipeline')}: ${formatCOP(r?.revenue_pipeline || 0)}`}
          delay={3}
        />
        <MetricCard
          icon={<Cpu size={16} />}
          iconColor="from-status-success to-status-success"
          value={formatUSD(p?.total_costo_usd || 0)}
          label={t('totalAICost')}
          sub={`~${formatUSD(p?.costo_promedio_por_interaccion_usd || 0)}/msg`}
          delay={4}
        />
      </div>

      {/* ===== ADAPTIVE SECTIONS (Phantom Grid) ===== */}
      <PhantomGrid className="space-y-5" sections={[
        /* --- Funnel + Revenue --- */
        {
          id: 'funnel-revenue',
          priority: 1,
          element: (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="glass-card-accent p-5">
                <SectionTitle icon={<TrendingUp size={14} />} title={t('conversionFunnel')} />
                <div className="flex items-end justify-between gap-3 mt-5 px-1">
                  {funnelData.map((step, i) => {
                    const maxVal = funnelData[0].value || 1
                    const height = Math.max((step.value / maxVal) * 120, 20)
                    return (
                      <div key={step.name} className="flex flex-col items-center flex-1">
                        <span className="text-sm font-mono font-bold text-text-primary mb-1.5">{formatNumber(step.value)}</span>
                        <div className="w-full rounded-t-md transition-all duration-700" style={{ height: `${height}px`, background: step.color, opacity: 0.8, animationDelay: `${i * 0.15}s` }} />
                        <span className="text-[9px] font-mono text-text-muted mt-1.5 text-center">{step.name}</span>
                        {i > 0 && funnelData[i - 1].value > 0 && (
                          <span className="text-[8px] font-mono text-text-dim mt-0.5">{((step.value / funnelData[i - 1].value) * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2 mt-5 justify-center flex-wrap">
                  <StatusPill label={t('attendance')} value={formatPercent(c?.tasa_asistencia_pct || 0)} color="success" />
                  <StatusPill label={t('cancellation')} value={formatPercent(c?.tasa_cancelacion_pct || 0)} color="danger" />
                  <StatusPill label={t('noShow')} value={formatPercent(c?.tasa_no_show_pct || 0)} color="warning" />
                </div>
              </div>
              <div className="glass-card-accent p-5">
                <SectionTitle icon={<DollarSign size={14} />} title={t('revenue')} />
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <RevenueItem label={t('revenueVerified')} value={formatCOP(r?.revenue_total || 0)} color="text-status-success" />
                  <RevenueItem label={t('pending')} value={formatCOP(r?.revenue_pendiente || 0)} color="text-status-warning" />
                  <RevenueItem label={t('pipelineAppointments')} value={formatCOP(r?.revenue_pipeline || 0)} color="text-status-info" />
                  <RevenueItem label={t('monthlyProjection')} value={formatCOP(r?.proyeccion_mensual || 0)} color="text-brand-purple" />
                </div>
                <div className="mt-4 pt-3 border-t border-border flex gap-4 text-text-muted">
                  <span className="text-[9px] font-mono">{t('averageTicket')}: <span className="text-text-primary font-semibold">{formatCOP(r?.ticket_promedio || 0)}</span></span>
                  <span className="text-[9px] font-mono">{t('transactions')}: <span className="text-text-primary font-semibold">{formatNumber(r?.total_transacciones || 0)}</span></span>
                </div>
              </div>
            </div>
          ),
        },

        /* --- Voice AI (conditional) --- */
        ...(voice && (voice.total_calls > 0 || voice.total_whatsapp > 0) ? [{
          id: 'voice-ai',
          priority: 2,
          element: (
            <div className="glass-card-accent p-5">
              <SectionTitle icon={<PhoneCall size={14} />} title="Voice AI" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple"><PhoneCall size={16} /></div>
                  <div>
                    <div className="text-xl font-mono font-bold text-text-primary">{formatNumber(voice.total_calls)}</div>
                    <div className="text-[9px] font-mono text-text-muted">{t('voiceCalls')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-brand-cyan/8 border border-brand-cyan/15 flex items-center justify-center text-brand-cyan"><Clock size={16} /></div>
                  <div>
                    <div className="text-xl font-mono font-bold text-text-primary">
                      {voice.avg_duration_seconds > 0 ? `${Math.floor(voice.avg_duration_seconds / 60)}:${String(voice.avg_duration_seconds % 60).padStart(2, '0')}` : '\u2014'}
                    </div>
                    <div className="text-[9px] font-mono text-text-muted">{t('avgDuration')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-status-success/8 border border-status-success/15 flex items-center justify-center text-status-success"><CalendarCheck size={16} /></div>
                  <div>
                    <div className="text-xl font-mono font-bold text-text-primary">{formatNumber(voice.appointments_by_voice)}</div>
                    <div className="text-[9px] font-mono text-text-muted">{t('appointmentsByVoice')}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-brand-purple/8 text-brand-purple font-mono font-semibold">{t('voiceInteractions', { pct: voice.voice_pct })}</span>
              </div>
            </div>
          ),
        }] : []),

        /* --- Intents + Opportunities + Performance --- */
        {
          id: 'intents-opps-perf',
          priority: 3,
          element: (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="glass-card p-5">
                <SectionTitle icon={<MessageSquare size={14} />} title={t('intents')} />
                {intentData.length > 0 ? (
                  <div className="mt-3 h-48"><LazyIntentsChart data={intentData} /></div>
                ) : (
                  <EmptyState title={t('noDataYet')} />
                )}
              </div>
              <div className="glass-card p-5">
                <SectionTitle icon={<Target size={14} />} title={tOppSection('title')} />
                {(o?.total || 0) > 0 ? (
                  <div className="mt-3">
                    <div className="text-2xl font-mono font-bold text-brand-purple mb-3">{o?.total}</div>
                    <div className="space-y-2">
                      {oppData.map((opp) => (
                        <div key={opp.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: opp.color }} />
                            <span className="text-text-muted text-[10px] font-mono">{opp.name}</span>
                          </div>
                          <span className="text-text-primary font-mono font-semibold text-[10px]">{opp.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-border text-[9px] font-mono text-text-muted">
                      {t('estimatedValue')}: <span className="text-brand-purple font-semibold">{formatCOP(o?.valor_total_estimado || 0)}</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState title={t('noDataYet')} />
                )}
              </div>
              <div className="glass-card p-5">
                <SectionTitle icon={<Cpu size={14} />} title={t('performanceAI')} />
                <div className="mt-3 space-y-3">
                  <PerfItem label={t('interactions')} value={formatNumber(p?.total_interacciones || 0)} />
                  <PerfItem label={t('totalTokens')} value={formatNumber(p?.total_tokens || 0)} />
                  <PerfItem label={t('avgResponseTime')} value={`${formatNumber(p?.response_time_promedio_ms || 0)}ms`} />
                  <PerfItem label={t('totalCost')} value={formatUSD(p?.total_costo_usd || 0)} accent />
                  <PerfItem label={t('monthlyProjection')} value={formatUSD(p?.proyeccion_costo_mensual_usd || 0)} accent />
                  <div className="pt-2 border-t border-border">
                    <div className="text-[9px] font-mono text-text-dim mb-1.5">{t('mostUsedTools')}</div>
                    {Object.entries(p?.herramientas_usadas || {}).slice(0, 4).map(([tool, count]) => (
                      <div key={tool} className="flex justify-between text-[10px] py-0.5">
                        <span className="text-text-muted font-mono">{tool}</span>
                        <span className="text-text-primary font-mono font-semibold">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ),
        },

        /* --- Sub-Bots --- */
        {
          id: 'sub-bots',
          priority: 4,
          element: (
            <div>
              <SectionTitle icon={<Bot size={14} />} title={t('subBots')} className="mb-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <BotCard emoji="" name="Reminder Bot" value={b?.reminder_bot?.mensajes_enviados || 0} label={t('remindersSent')} desc={b?.reminder_bot?.descripcion} gradient="from-brand-purple to-brand-purple-dark" formatNumber={formatNumber} icon={<CalendarCheck size={14} className="text-brand-purple" />} />
                <BotCard emoji="" name="Hunter Bot" value={b?.hunter_bot?.followups_enviados || 0} label={t('followupsSent')} extra={`${b?.hunter_bot?.conversiones_post_followup || 0} ${t('conversions')}`} desc={b?.hunter_bot?.descripcion} gradient="from-brand-gold to-brand-gold" formatNumber={formatNumber} icon={<Target size={14} className="text-brand-gold" />} />
                <BotCard emoji="" name="Nurse Bot" value={b?.nurse_bot?.recordatorios_enviados || 0} label={t('medicationReminders')} desc={b?.nurse_bot?.descripcion} gradient="from-brand-cyan to-brand-cyan" formatNumber={formatNumber} icon={<Cpu size={14} className="text-brand-cyan" />} />
              </div>
            </div>
          ),
        },
      ]} />

      {/* Footer */}
      <div className="text-center py-3 text-text-dim text-[9px] font-mono">
        {t('footer')}
      </div>
    </div>
  )
}
