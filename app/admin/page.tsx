'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchAllOrganizations, fetchGlobalMetrics, fetchOrgStats, fetchOrgLastActivity,
  fetchPipelineMetrics, fetchBotErrorCount24h, fetchBotLogs,
  ensureSuperAdminMembership,
  type AdminOrgRow, type PipelineMetricsRow, type BotLogEntry,
} from '@/lib/admin-api'
import { fetchSystemHealth } from '@/lib/api/health'
import { startImpersonation } from '@/lib/impersonation'
import { formatCOP, timeAgo } from '@/lib/api'
import {
  Building2, Users, Calendar, MessageSquare, DollarSign,
  Database, RefreshCw, Search, Plus, ExternalLink, Eye,
  CheckCircle2, PauseCircle, XCircle, Settings2,
  TrendingUp, Zap, Shield, Activity, GitPullRequest,
  Bot, AlertTriangle, BarChart3, ArrowRight, Clock,
  Sparkles, Cpu, GitMerge
} from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  ACTIVE: { label: 'Activa', color: 'text-status-success', icon: CheckCircle2 },
  SETUP: { label: 'En Setup', color: 'text-status-warning', icon: Settings2 },
  PAUSED: { label: 'Pausada', color: 'text-status-warning', icon: PauseCircle },
  CANCELLED: { label: 'Cancelada', color: 'text-status-danger', icon: XCircle },
  TRIAL: { label: 'Trial', color: 'text-brand-cyan', icon: Zap },
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
  STARTER: 'bg-status-info/10 text-status-info border-status-info/20',
  BUSINESS: 'bg-status-success/10 text-status-success border-status-success/20',
  PRO: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
  ENTERPRISE: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
}

interface OrgWithStats extends AdminOrgRow {
  stats?: { patients: number; appointments: number; interactions: number; revenue: number }
  lastActivity?: string | null
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos dias'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function AdminPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgWithStats[]>([])
  const [metrics, setMetrics] = useState({ patients: 0, appointments: 0, interactions: 0, revenue: 0, dataLake: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)
  const [enteringGodMode, setEnteringGodMode] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // CEO Pulse state
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetricsRow[]>([])
  const [healthStatus, setHealthStatus] = useState<string | null>(null)
  const [errorCount24h, setErrorCount24h] = useState(0)

  // Activity feed
  const [recentLogs, setRecentLogs] = useState<BotLogEntry[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const orgList = await fetchAllOrganizations()
      setOrgs(orgList)

      const orgIds = orgList.map(o => o.id)
      if (orgIds.length > 0) {
        const m = await fetchGlobalMetrics(orgIds)
        setMetrics(m)
      }
    } catch {
      // Admin data load failed
    }
    setLoading(false)
    setLastUpdated(new Date())

    loadOrgStats()
    loadPulseData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPulseData = useCallback(async () => {
    try { setPipelineMetrics(await fetchPipelineMetrics(10)) } catch { /* */ }
    try {
      const health = await fetchSystemHealth()
      setHealthStatus(health?.status || 'UNKNOWN')
    } catch { setHealthStatus('CRITICAL') }
    try { setErrorCount24h(await fetchBotErrorCount24h()) } catch { /* */ }
    try { setRecentLogs(await fetchBotLogs(8)) } catch { /* */ }
  }, [])

  const loadOrgStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const orgList = await fetchAllOrganizations()
      const withStats = await Promise.all(
        orgList.map(async (org) => {
          try {
            const [stats, lastActivity] = await Promise.all([
              fetchOrgStats(org.id),
              fetchOrgLastActivity(org.id),
            ])
            return { ...org, stats, lastActivity }
          } catch { return org }
        })
      )
      setOrgs(withStats)
    } catch { /* */ }
    setStatsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadData])

  /** God Mode */
  const handleGodMode = async (orgId: string, orgName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEnteringGodMode(orgId)
    try {
      await ensureSuperAdminMembership(orgId)
      startImpersonation(orgId, orgName)
      router.push('/dashboard')
    } catch { setEnteringGodMode(null) }
  }

  const filtered = search
    ? orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : orgs

  // Compute CEO pulse
  const latestPipeline = pipelineMetrics.length > 0
    ? pipelineMetrics.filter(r => r.week_start === pipelineMetrics[0].week_start)
    : []
  const totalPRs = latestPipeline.reduce((s, r) => s + r.prs_created, 0)
  const mergedPRs = latestPipeline.reduce((s, r) => s + r.prs_merged, 0)
  const avgCI = latestPipeline.length > 0
    ? latestPipeline.reduce((s, r) => s + (r.ci_pass_rate ?? 0), 0) / latestPipeline.filter(r => r.ci_pass_rate != null).length
    : null
  const sentryErrors = latestPipeline.reduce((s, r) => s + r.sentry_errors, 0)

  // System pulse score (0-100)
  const pulseFactors: number[] = []
  if (healthStatus === 'HEALTHY') pulseFactors.push(100)
  else if (healthStatus === 'DEGRADED') pulseFactors.push(50)
  else if (healthStatus) pulseFactors.push(0)
  if (avgCI != null) pulseFactors.push(avgCI)
  if (errorCount24h === 0) pulseFactors.push(100)
  else pulseFactors.push(Math.max(0, 100 - errorCount24h * 20))
  if (sentryErrors === 0) pulseFactors.push(100)
  else pulseFactors.push(Math.max(0, 100 - sentryErrors * 25))
  const pulseScore = pulseFactors.length > 0
    ? Math.round(pulseFactors.reduce((a, b) => a + b, 0) / pulseFactors.length)
    : null
  const pulseColor = pulseScore != null
    ? pulseScore >= 80 ? 'text-status-success' : pulseScore >= 50 ? 'text-status-warning' : 'text-status-danger'
    : 'text-text-dim'
  const pulseBg = pulseScore != null
    ? pulseScore >= 80 ? 'from-status-success/10 to-brand-cyan/5' : pulseScore >= 50 ? 'from-status-warning/10 to-brand-gold/5' : 'from-status-danger/10 to-red-900/5'
    : 'from-surface-3 to-surface-2'

  const autonomyScore = totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 100) : null

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* CEO COMMAND CENTER HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            {getGreeting()}, CEO
          </h2>
          <p className="text-text-dim text-xs mt-0.5 flex items-center gap-2">
            Ataraxia IA Labs — Command Center
            {lastUpdated && (
              <span className="text-text-dim/60">
                · {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
              autoRefresh ? 'bg-status-success/10 border-status-success/20 text-status-success' : 'bg-surface-2 border-border text-text-dim'
            }`}
          >
            <Zap size={10} />
            Live {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => router.push('/admin/organizaciones/nueva')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple-dark text-white font-semibold text-xs hover:shadow-lg hover:shadow-brand-purple/20 transition-all"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nueva Org</span>
          </button>
          <button onClick={loadData} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SYSTEM PULSE — Hero */}
      <div className={`glass-card p-5 bg-gradient-to-r ${pulseBg} relative overflow-hidden`}>
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br from-brand-purple/5 to-brand-cyan/5 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Circular Pulse Score */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-3" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className={pulseColor}
                  stroke="currentColor"
                  strokeDasharray={`${(pulseScore ?? 0) * 1.76} 176`}
                  style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold font-mono ${pulseColor}`}>
                  {pulseScore != null ? pulseScore : '...'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-text-dim text-[10px] font-semibold uppercase tracking-wider">System Pulse</div>
              <div className={`text-lg font-bold ${pulseColor}`}>
                {pulseScore != null && pulseScore >= 80 ? 'Todo operativo' : pulseScore != null && pulseScore >= 50 ? 'Atention requerida' : pulseScore != null ? 'Sistema critico' : 'Verificando...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <PulseIndicator
              label="Backend"
              status={healthStatus === 'HEALTHY' ? 'ok' : healthStatus === 'DEGRADED' ? 'warn' : healthStatus ? 'error' : 'loading'}
            />
            <PulseIndicator
              label="Errores 24h"
              status={errorCount24h === 0 ? 'ok' : 'error'}
              value={errorCount24h.toString()}
            />
            <PulseIndicator
              label="CI Rate"
              status={avgCI != null ? (avgCI >= 90 ? 'ok' : avgCI >= 70 ? 'warn' : 'error') : 'loading'}
              value={avgCI != null ? `${avgCI.toFixed(0)}%` : '\u2014'}
            />
            <PulseIndicator
              label="Sentry"
              status={sentryErrors === 0 ? 'ok' : 'error'}
              value={sentryErrors.toString()}
            />
            {autonomyScore != null && (
              <PulseIndicator
                label="Autonomy"
                status={autonomyScore >= 80 ? 'ok' : autonomyScore >= 50 ? 'warn' : 'error'}
                value={`${autonomyScore}%`}
              />
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS + ACTIVITY FEED — 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={<GitPullRequest size={16} />} label="Pipeline" sublabel={`${totalPRs} PRs esta semana`} onClick={() => router.push('/admin/pipeline')} color="text-brand-purple" />
          <QuickAction icon={<BarChart3 size={16} />} label="Metricas" sublabel={`${metrics.interactions.toLocaleString()} interacciones`} onClick={() => router.push('/admin/metricas')} color="text-brand-cyan" />
          <QuickAction icon={<Activity size={16} />} label="System Health" sublabel={healthStatus || 'Verificando...'} onClick={() => router.push('/admin/health')} color="text-status-success" />
          <QuickAction icon={<Bot size={16} />} label="God Mode" sublabel={`${orgs.length} clinicas`} onClick={() => document.getElementById('org-table')?.scrollIntoView({ behavior: 'smooth' })} color="text-status-danger" />
        </div>

        {/* Live Activity Feed */}
        <div className="glass-card p-4 max-h-[200px] overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <Sparkles size={12} className="text-brand-gold" />
            </div>
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Actividad Reciente</span>
            {autoRefresh && <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse ml-auto" />}
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[140px]">
            {recentLogs.length === 0 ? (
              <p className="text-text-dim text-[10px]">Sin actividad reciente</p>
            ) : (
              recentLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-[10px]">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                    log.status === 'SUCCESS' ? 'bg-status-success' : log.status === 'ERROR' ? 'bg-status-danger' : 'bg-status-warning'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <span className="text-text-primary font-medium">{log.bot_name}</span>
                    <span className="text-text-dim ml-1">{log.error_message ? `Error: ${log.error_message.slice(0, 40)}` : log.status}</span>
                  </div>
                  <span className="text-text-dim/60 flex-shrink-0 whitespace-nowrap">{timeAgo(log.executed_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* GLOBAL METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard icon={<Building2 size={16} />} gradient="from-brand-purple to-brand-purple-dark" value={orgs.length.toString()} label="Organizaciones" />
        <MetricCard icon={<Users size={16} />} gradient="from-status-info to-blue-600" value={metrics.patients.toLocaleString()} label="Pacientes totales" />
        <MetricCard icon={<Calendar size={16} />} gradient="from-brand-cyan to-emerald-600" value={metrics.appointments.toLocaleString()} label="Citas totales" />
        <MetricCard icon={<DollarSign size={16} />} gradient="from-brand-gold to-amber-500" value={formatCOP(metrics.revenue)} label="Revenue total" />
        <MetricCard icon={<Database size={16} />} gradient="from-status-success to-emerald-600" value={metrics.dataLake.toLocaleString()} label="Data Lake entries" />
      </div>

      {/* SEARCH */}
      <div className="relative" id="org-table">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar organizacion..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all"
        />
      </div>

      {/* ORG TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Organizacion</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Pacientes</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Citas</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Interacciones</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Revenue</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Ultima Actividad</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-5 bg-surface-3 rounded w-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Building2 size={28} className="mx-auto text-text-dim mb-3" />
                    <p className="text-text-muted text-sm">
                      {search ? `No se encontraron organizaciones para "${search}"` : 'No hay organizaciones registradas'}
                    </p>
                    {!search && (
                      <button
                        onClick={() => router.push('/admin/organizaciones/nueva')}
                        className="mt-3 text-brand-purple text-xs font-semibold hover:underline"
                      >
                        Crear primera organizacion
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((org) => {
                  const statusCfg = STATUS_MAP[org.status] || STATUS_MAP.ACTIVE
                  const StatusIcon = statusCfg.icon
                  const planColor = PLAN_COLORS[org.plan || 'TRIAL'] || PLAN_COLORS.TRIAL
                  const isEntering = enteringGodMode === org.id

                  return (
                    <tr
                      key={org.id}
                      onClick={() => router.push(`/admin/organizaciones/${org.id}`)}
                      className="border-b border-border/50 hover:bg-surface-3/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-bold text-xs flex-shrink-0">
                            {org.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-text-primary">{org.name}</div>
                            {org.whatsapp_phone_id && (
                              <div className="text-[10px] text-text-dim font-mono">WA: {org.whatsapp_phone_id.slice(0, 12)}...</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${planColor}`}>
                          {org.plan || 'TRIAL'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${statusCfg.color}`}>
                          <StatusIcon size={12} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-mono text-text-primary">
                          {statsLoading && !org.stats ? '...' : (org.stats?.patients ?? '-')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-mono text-text-primary">
                          {statsLoading && !org.stats ? '...' : (org.stats?.appointments ?? '-')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-mono text-text-primary">
                          {statsLoading && !org.stats ? '...' : (org.stats?.interactions ?? '-')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-mono font-semibold gradient-text">
                          {statsLoading && !org.stats ? '...' : formatCOP(org.stats?.revenue ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-xs ${org.lastActivity ? 'text-text-muted' : 'text-text-dim'}`}>
                          {org.lastActivity ? timeAgo(org.lastActivity) : '\u2014'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleGodMode(org.id, org.name, e)}
                            disabled={isEntering}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-status-danger/10 to-brand-purple/10 border border-status-danger/20 text-status-danger text-[10px] font-semibold hover:from-status-danger/20 hover:to-brand-purple/20 transition-all disabled:opacity-50"
                            title="Ver dashboard de esta clinica (God Mode)"
                          >
                            {isEntering ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : (
                              <Eye size={10} />
                            )}
                            <span className="hidden lg:inline">{isEntering ? 'Entrando...' : 'God Mode'}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/organizaciones/${org.id}`) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-text-dim text-[10px] font-semibold hover:text-text-primary hover:border-brand-purple/30 transition-all"
                            title="Ver detalle"
                          >
                            <ExternalLink size={10} />
                            <span className="hidden lg:inline">Detalle</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, gradient, value, label }: { icon: React.ReactNode; gradient: string; value: string; label: string }) {
  return (
    <div className="glass-card p-3.5 group hover:border-brand-purple/20 transition-all">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="text-lg font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
    </div>
  )
}

function PulseIndicator({ label, status, value }: { label: string; status: 'ok' | 'warn' | 'error' | 'loading'; value?: string }) {
  const dotColor = status === 'ok' ? 'bg-status-success' : status === 'warn' ? 'bg-status-warning' : status === 'error' ? 'bg-status-danger' : 'bg-text-dim animate-pulse'
  const textColor = status === 'ok' ? 'text-status-success' : status === 'warn' ? 'text-status-warning' : status === 'error' ? 'text-status-danger' : 'text-text-dim'
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className={`text-sm font-bold font-mono ${textColor}`}>{value ?? (status === 'ok' ? 'OK' : status === 'warn' ? '!' : status === 'error' ? 'ERR' : '...')}</span>
      </div>
      <div className="text-[9px] text-text-dim">{label}</div>
    </div>
  )
}

function QuickAction({ icon, label, sublabel, onClick, color }: {
  icon: React.ReactNode; label: string; sublabel: string; onClick: () => void; color: string
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-3.5 text-left hover:border-brand-purple/30 transition-all group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`${color} group-hover:scale-110 transition-transform`}>{icon}</span>
        <ArrowRight size={12} className="text-text-dim group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="text-sm font-semibold text-text-primary">{label}</div>
      <div className="text-[10px] text-text-dim">{sublabel}</div>
    </button>
  )
}
