'use client'

import { useState, useEffect } from 'react'
import { useOrg } from '@/lib/org-context'
import { downloadReportPdf, fetchFullAnalytics } from '@/lib/api'
import { FileDown, TrendingUp, Users, Calendar, DollarSign, Bot, Loader2, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ReportesPage() {
  const { orgId } = useOrg()
  const t = useTranslations('reports')
  const [dias, setDias] = useState(30)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [analytics, setAnalytics] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    setIsLoading(true)
    fetchFullAnalytics(orgId, dias)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setIsLoading(false))
  }, [orgId, dias])

  const handleDownload = async () => {
    if (!orgId) return
    setDownloading(true)
    setDownloaded(false)
    try {
      const blob = await downloadReportPdf(orgId, dias)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Reporte_${new Date().toISOString().slice(0, 7)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 3000)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const conv = analytics?.conversiones || {}
  const rev = analytics?.revenue || {}
  const perf = analytics?.performance_ia || {}
  const bots = analytics?.sub_bots || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-sm text-white/60">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
          >
            <option value={7}>{t('days', { count: 7 })}</option>
            <option value={15}>{t('days', { count: 15 })}</option>
            <option value={30}>{t('days', { count: 30 })}</option>
            <option value={60}>{t('days', { count: 60 })}</option>
            <option value={90}>{t('days', { count: 90 })}</option>
          </select>
          <button
            onClick={handleDownload}
            disabled={downloading || !orgId}
            className="flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : downloaded ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {downloading ? t('generating') : downloaded ? t('downloaded') : t('downloadPDF')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Calendar className="h-5 w-5" />}
              label={t('totalAppointments')}
              value={conv.total_citas ?? 0}
              sub={t('completedSub', { count: conv.citas_completadas ?? 0 })}
            />
            <SummaryCard
              icon={<Users className="h-5 w-5" />}
              label={t('newPatients')}
              value={conv.pacientes_nuevos ?? 0}
              sub={t('uniqueSub', { count: conv.pacientes_unicos ?? 0 })}
            />
            <SummaryCard
              icon={<DollarSign className="h-5 w-5" />}
              label={`Revenue (${rev.moneda ?? 'COP'})`}
              value={formatMoney(rev.revenue_total ?? 0)}
              sub={`${t('monthlyProj')} ${formatMoney(rev.proyeccion_mensual ?? 0)}/mes`}
            />
            <SummaryCard
              icon={<Bot className="h-5 w-5" />}
              label={t('aiInteractions')}
              value={perf.total_interacciones ?? 0}
              sub={`$${(perf.total_costo_usd ?? 0).toFixed(2)} USD`}
            />
          </div>

          {/* Two-column layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Conversions Funnel */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                {t('conversionFunnel')}
              </h2>
              <FunnelBar label={t('messages')} value={conv.funnel?.mensajes ?? 0} max={conv.funnel?.mensajes ?? 1} />
              <FunnelBar label={t('patients')} value={conv.funnel?.pacientes ?? 0} max={conv.funnel?.mensajes ?? 1} />
              <FunnelBar label={t('appointments')} value={conv.funnel?.citas ?? 0} max={conv.funnel?.mensajes ?? 1} />
              <FunnelBar label={t('completed')} value={conv.funnel?.completadas ?? 0} max={conv.funnel?.mensajes ?? 1} />
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Rate label={t('conversion')} value={conv.tasa_conversion_pct} />
                <Rate label={t('attendance')} value={conv.tasa_asistencia_pct} />
                <Rate label={t('cancellation')} value={conv.tasa_cancelacion_pct} color="text-red-400" />
                <Rate label={t('noShow')} value={conv.tasa_no_show_pct} color="text-yellow-400" />
              </div>
            </div>

            {/* Revenue */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Revenue ({rev.moneda ?? 'COP'})
              </h2>
              <div className="space-y-3">
                <RevenueRow label={t('charged')} value={rev.revenue_total} />
                <RevenueRow label={t('pendingRevenue')} value={rev.revenue_pendiente} />
                <RevenueRow label={t('pipelineRevenue')} value={rev.revenue_pipeline} />
                <div className="border-t border-white/10 pt-3 mt-3">
                  <RevenueRow label={t('averageTicket')} value={rev.ticket_promedio} />
                  <RevenueRow label={t('dailyAverage')} value={rev.revenue_diario_promedio} />
                  <RevenueRow label={t('monthlyProjection')} value={rev.proyeccion_mensual} bold />
                </div>
              </div>
            </div>

            {/* AI Performance */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5 text-cyan-400" />
                {t('aiPerformance')}
              </h2>
              <div className="space-y-2 text-sm">
                <MetricRow label={t('totalTokens')} value={(perf.total_tokens ?? 0).toLocaleString()} />
                <MetricRow label={t('totalCost')} value={`$${(perf.total_costo_usd ?? 0).toFixed(2)} USD`} />
                <MetricRow label={t('costPerInteraction')} value={`$${(perf.costo_promedio_por_interaccion_usd ?? 0).toFixed(4)}`} />
                <MetricRow label={t('avgResponse')} value={`${(perf.response_time_promedio_ms ?? 0).toLocaleString()} ms`} />
                <MetricRow label={t('monthlyProj')} value={`$${(perf.proyeccion_costo_mensual_usd ?? 0).toFixed(2)} USD`} />
              </div>
              {perf.distribucion_intents && Object.keys(perf.distribucion_intents).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs text-white/50 uppercase mb-2">{t('topIntents')}</h3>
                  {Object.entries(perf.distribucion_intents as Record<string, number>).slice(0, 5).map(([intent, count]) => (
                    <div key={intent} className="flex justify-between text-xs text-white/70 py-0.5">
                      <span>{intent}</span>
                      <span className="text-white/40">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Bots */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-400" />
                {t('subBotsAutomatic')}
              </h2>
              <div className="space-y-4">
                <BotCard name="Reminder" count={bots.reminder_bot?.mensajes_enviados ?? 0} desc={t('appointmentReminders')} />
                <BotCard name="Hunter" count={bots.hunter_bot?.followups_enviados ?? 0} desc={t('leadFollowups')} extra={bots.hunter_bot?.conversiones_post_followup ? `${bots.hunter_bot.conversiones_post_followup} ${t('converted')}` : undefined} />
                <BotCard name="Nurse" count={bots.nurse_bot?.recordatorios_enviados ?? 0} desc={t('medicationReminders')} />
                <div className="border-t border-white/10 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">{t('totalAutomatic')}</span>
                    <span className="font-bold text-white">{bots.total_mensajes_automaticos ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download CTA */}
          <div className="rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">{t('downloadFullReport')}</h3>
            <p className="text-sm text-white/60 mb-4">{t('fullReportDesc')}</p>
            <button
              onClick={handleDownload}
              disabled={downloading || !orgId}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-6 py-3 text-sm font-medium text-white transition-colors"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {downloading ? t('generatingPDF') : t('downloadComplete')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}


// === Sub-components ===

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center gap-2 text-purple-400 mb-2">{icon}<span className="text-xs text-white/50">{label}</span></div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/40 mt-1">{sub}</div>
    </div>
  )
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 2
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs text-white/60 w-24">{label}</span>
      <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-white w-12 text-right">{value}</span>
    </div>
  )
}

function Rate({ label, value, color = 'text-green-400' }: { label: string; value?: number; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span className={`font-semibold ${color}`}>{value ?? 0}%</span>
    </div>
  )
}

function RevenueRow({ label, value, bold }: { label: string; value?: number; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className={bold ? 'font-bold text-green-400' : 'text-white'}>{formatMoney(value ?? 0)}</span>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

function BotCard({ name, count, desc, extra }: { name: string; count: number; desc: string; extra?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-white">{name} Bot</span>
        <p className="text-xs text-white/40">{desc}</p>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold text-white">{count}</span>
        {extra && <p className="text-xs text-green-400">{extra}</p>}
      </div>
    </div>
  )
}

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
  return `$${v.toFixed(0)}`
}
