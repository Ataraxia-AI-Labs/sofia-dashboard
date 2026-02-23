'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchFullAnalytics, fetchVoiceMetrics, formatCOP, formatUSD, formatNumber, formatPercent } from '@/lib/api'
import type { FullAnalytics, VoiceMetrics } from '@/types'
import {
  MessageSquare, Users, CalendarCheck, DollarSign, Cpu, Target,
  TrendingUp, ArrowDownRight, ArrowUpRight, Clock, Zap, AlertTriangle,
  RefreshCw, Bot, PhoneCall, Smartphone
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'

// Opportunity type colors
const OPP_COLORS: Record<string, string> = {
  HOT_LEAD: '#8B5CF6',
  UPSELL: '#06D6A0',
  REACTIVATION: '#3B82F6',
  REFERRAL: '#F5C842',
  CHURN_RISK: '#EF4444',
  PRICE_SENSITIVE: '#F59E0B',
  MULTI_PROCEDURE: '#EC4899',
  HIGH_VALUE: '#10B981',
}

const OPP_LABELS: Record<string, string> = {
  HOT_LEAD: 'Lead Caliente',
  UPSELL: 'Upsell',
  REACTIVATION: 'Reactivación',
  REFERRAL: 'Referido',
  CHURN_RISK: 'Riesgo Abandono',
  PRICE_SENSITIVE: 'Sensible a Precio',
  MULTI_PROCEDURE: 'Multi-procedimiento',
  HIGH_VALUE: 'Alto Valor',
}

export default function DashboardOverview() {
  const { orgId, branchId } = useOrg()
  const [data, setData] = useState<FullAnalytics | null>(null)
  const [voice, setVoice] = useState<VoiceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const loadData = useCallback(async (retryCount = 0) => {
    if (!orgId) return
    try {
      setLoading(true)
      if (retryCount > 0) setError('Conectando con el servidor...')
      const [analytics, voiceData] = await Promise.all([
        fetchFullAnalytics(orgId, days, branchId),
        fetchVoiceMetrics(orgId, days, branchId),
      ])
      setData(analytics)
      setVoice(voiceData)
      setLastUpdate(new Date())
      setError('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      if (retryCount < 3 && (msg.includes('aborted') || msg.includes('Failed to fetch') || msg.includes('503') || msg.includes('502'))) {
        setError('Conectando con el servidor... (reintentando)')
        setTimeout(() => loadData(retryCount + 1), 10000)
        return
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [orgId, days, branchId])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadData()
    }, 60000)
    return () => clearInterval(interval)
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
          <span className="font-semibold">Error cargando métricas</span>
        </div>
        <p className="text-text-muted text-sm">{error}</p>
        <button onClick={() => loadData()} className="mt-4 px-4 py-2 rounded-lg bg-brand-purple/10 text-brand-purple text-sm hover:bg-brand-purple/20 transition-colors">
          Reintentar
        </button>
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
    name: OPP_LABELS[k] || k,
    value: v,
    color: OPP_COLORS[k] || '#8B5CF6',
  }))

  const funnelData = [
    { name: 'Mensajes', value: c?.funnel?.mensajes || 0, color: '#8B5CF6' },
    { name: 'Pacientes', value: c?.funnel?.pacientes || 0, color: '#3B82F6' },
    { name: 'Citas', value: c?.funnel?.citas || 0, color: '#F5C842' },
    { name: 'Completadas', value: c?.funnel?.completadas || 0, color: '#06D6A0' },
  ]

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Overview</h2>
          {lastUpdate && (
            <p className="text-text-dim text-xs mt-0.5">
              Actualizado {lastUpdate.toLocaleTimeString('es-CO')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData()} aria-label="Actualizar" className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
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
          label="Mensajes recibidos"
          sub={`${formatNumber(c?.pacientes_nuevos || 0)} pacientes nuevos`}
          delay={0}
        />
        <MetricCard
          icon={<Users size={18} />}
          iconColor="from-brand-cyan to-brand-cyan-light"
          value={formatNumber(c?.pacientes_unicos || 0)}
          label="Pacientes únicos"
          delay={1}
        />
        <MetricCard
          icon={<CalendarCheck size={18} />}
          iconColor="from-brand-purple to-brand-cyan"
          value={formatNumber(c?.total_citas || 0)}
          label="Citas agendadas"
          sub={`${formatPercent(c?.tasa_conversion_pct || 0)} conversión`}
          subColor="text-brand-purple"
          delay={2}
        />
        <MetricCard
          icon={<DollarSign size={18} />}
          iconColor="from-brand-gold to-amber-500"
          value={formatCOP(r?.revenue_total || 0)}
          label="Revenue"
          sub={`Pipeline: ${formatCOP(r?.revenue_pipeline || 0)}`}
          delay={3}
        />
        <MetricCard
          icon={<Cpu size={18} />}
          iconColor="from-status-success to-emerald-400"
          value={formatUSD(p?.total_costo_usd || 0)}
          label="Costo IA total"
          sub={`~${formatUSD(p?.costo_promedio_por_interaccion_usd || 0)}/msg`}
          delay={4}
        />
      </div>

      {/* ===== FUNNEL + REVENUE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="glass-card p-6">
          <SectionTitle icon={<TrendingUp size={16} />} title="Funnel de Conversión" />
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
            <StatusPill label="Asistencia" value={formatPercent(c?.tasa_asistencia_pct || 0)} color="success" />
            <StatusPill label="Cancelación" value={formatPercent(c?.tasa_cancelacion_pct || 0)} color="danger" />
            <StatusPill label="No-Show" value={formatPercent(c?.tasa_no_show_pct || 0)} color="warning" />
          </div>
        </div>

        {/* Revenue */}
        <div className="glass-card p-6">
          <SectionTitle icon={<DollarSign size={16} />} title="Revenue" />
          <div className="grid grid-cols-2 gap-6 mt-6">
            <RevenueItem label="Revenue verificado" value={formatCOP(r?.revenue_total || 0)} color="text-status-success" />
            <RevenueItem label="Pendiente" value={formatCOP(r?.revenue_pendiente || 0)} color="text-status-warning" />
            <RevenueItem label="Pipeline (citas)" value={formatCOP(r?.revenue_pipeline || 0)} color="text-status-info" />
            <RevenueItem label="Proyección mensual" value={formatCOP(r?.proyeccion_mensual || 0)} color="text-brand-purple" />
          </div>
          <div className="mt-6 pt-4 border-t border-border flex gap-6 text-sm text-text-muted">
            <span>Ticket promedio: <span className="text-text-primary font-semibold">{formatCOP(r?.ticket_promedio || 0)}</span></span>
            <span>Transacciones: <span className="text-text-primary font-semibold">{formatNumber(r?.total_transacciones || 0)}</span></span>
          </div>
        </div>
      </div>

      {/* ===== VOICE AI ===== */}
      {voice && (voice.total_calls > 0 || voice.total_whatsapp > 0) && (
        <div className="glass-card p-6">
          <SectionTitle icon={<PhoneCall size={16} />} title="Voice AI" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-5">
            {/* Total calls */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-purple to-brand-purple-dark flex items-center justify-center text-white shadow-lg">
                <PhoneCall size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-text-primary">{formatNumber(voice.total_calls)}</div>
                <div className="text-xs text-text-muted">Llamadas de voz</div>
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
                <div className="text-xs text-text-muted">Duración promedio</div>
              </div>
            </div>

            {/* Voice vs WhatsApp appointments */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Citas agendadas por canal</span>
                <span className="text-[10px] text-text-dim">
                  {formatNumber(voice.appointments_by_voice + voice.appointments_by_whatsapp)} total
                </span>
              </div>
              <div className="space-y-2.5">
                {/* Voice bar */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                    <PhoneCall size={12} className="text-brand-purple" />
                    <span className="text-xs text-text-muted">Voz</span>
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
                  {voice.voice_pct}% interacciones por voz
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
          <SectionTitle icon={<MessageSquare size={16} />} title="Intents" />
          {intentData.length > 0 ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentData} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#7E7A8E', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#101018', border: '1px solid #1C1C2A', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#F0EEF5' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {intentData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#8B5CF6' : `rgba(139, 92, 246, ${0.8 - i * 0.08})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Opportunities */}
        <div className="glass-card p-6">
          <SectionTitle icon={<Target size={16} />} title="Oportunidades" />
          {(o?.total || 0) > 0 ? (
            <div className="mt-4">
              <div className="text-3xl font-bold font-mono gradient-text mb-4">{o?.total}</div>
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
                Valor estimado: <span className="text-brand-purple font-semibold">{formatCOP(o?.valor_total_estimado || 0)}</span>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Performance */}
        <div className="glass-card p-6">
          <SectionTitle icon={<Cpu size={16} />} title="Performance IA" />
          <div className="mt-4 space-y-4">
            <PerfItem label="Interacciones" value={formatNumber(p?.total_interacciones || 0)} />
            <PerfItem label="Tokens totales" value={formatNumber(p?.total_tokens || 0)} />
            <PerfItem label="Tiempo respuesta avg" value={`${formatNumber(p?.response_time_promedio_ms || 0)}ms`} />
            <PerfItem label="Costo total" value={formatUSD(p?.total_costo_usd || 0)} accent />
            <PerfItem label="Proyección mensual" value={formatUSD(p?.proyeccion_costo_mensual_usd || 0)} accent />
            <div className="pt-3 border-t border-border">
              <div className="text-xs text-text-dim mb-2">Herramientas más usadas</div>
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
        <SectionTitle icon={<Bot size={16} />} title="Sub-Bots Automáticos" className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BotCard
            emoji="⏰"
            name="Reminder Bot"
            value={b?.reminder_bot?.mensajes_enviados || 0}
            label="recordatorios enviados"
            desc={b?.reminder_bot?.descripcion}
            gradient="from-brand-purple to-brand-purple-dark"
          />
          <BotCard
            emoji="🎯"
            name="Hunter Bot"
            value={b?.hunter_bot?.followups_enviados || 0}
            label="follow-ups enviados"
            extra={`${b?.hunter_bot?.conversiones_post_followup || 0} conversiones`}
            desc={b?.hunter_bot?.descripcion}
            gradient="from-brand-gold to-amber-600"
          />
          <BotCard
            emoji="💊"
            name="Nurse Bot"
            value={b?.nurse_bot?.recordatorios_enviados || 0}
            label="recordatorios de medicamento"
            desc={b?.nurse_bot?.descripcion}
            gradient="from-brand-cyan to-emerald-500"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-text-dim text-xs">
        Ataraxia IA Labs © 2026 — Cada dato es una decisión. Cada decisión es dinero.
      </div>
    </div>
  )
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MetricCard({ icon, iconColor, value, label, sub, subColor, delay }: {
  icon: React.ReactNode; iconColor: string; value: string; label: string
  sub?: string; subColor?: string; delay: number
}) {
  return (
    <div className="glass-card metric-glow p-5 animate-fade-up" style={{ animationDelay: `${delay * 80}ms` }}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center text-white mb-3 shadow-lg`}>
        {icon}
      </div>
      <div className="stat-number text-text-primary">{value}</div>
      <div className="text-xs text-text-muted mt-1 font-medium">{label}</div>
      {sub && <div className={`text-[11px] mt-1.5 font-semibold ${subColor || 'text-text-dim'}`}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ icon, title, className }: { icon: React.ReactNode; title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className || ''}`}>
      <span className="text-brand-purple">{icon}</span>
      <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">{title}</h3>
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  )
}

function StatusPill({ label, value, color }: { label: string; value: string; color: 'success' | 'danger' | 'warning' }) {
  const colors = {
    success: 'bg-status-success/8 border-status-success/15 text-status-success',
    danger: 'bg-status-danger/8 border-status-danger/15 text-status-danger',
    warning: 'bg-status-warning/8 border-status-warning/15 text-status-warning',
  }
  return (
    <div className={`badge ${colors[color]}`}>
      <div className={`w-1.5 h-1.5 rounded-full bg-status-${color}`} />
      <span className="text-text-muted text-[11px]">{label}</span>
      <span className="font-bold text-xs">{value}</span>
    </div>
  )
}

function RevenueItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}

function PerfItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-sm font-semibold font-mono ${accent ? 'text-brand-purple' : 'text-text-primary'}`}>{value}</span>
    </div>
  )
}

function BotCard({ emoji, name, value, label, extra, desc, gradient }: {
  emoji: string; name: string; value: number; label: string
  extra?: string; desc?: string; gradient: string
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-base`}>
          {emoji}
        </div>
        <span className="text-sm font-semibold text-text-primary">{name}</span>
      </div>
      <div className="text-3xl font-bold font-mono text-text-primary">{formatNumber(value)}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
      {extra && <div className="text-xs text-brand-purple font-semibold mt-1.5">{extra}</div>}
      {desc && <div className="text-[11px] text-text-dim mt-3">{desc}</div>}
    </div>
  )
}

function EmptyState() {
  return <div className="text-text-dim text-xs py-8 text-center">Sin datos aún</div>
}
