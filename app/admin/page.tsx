'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchAllOrganizations, fetchGlobalMetrics, fetchOrgStats, fetchOrgLastActivity,
  fetchPipelineMetrics, fetchBotErrorCount24h,
  ensureSuperAdminMembership,
  type AdminOrgRow, type PipelineMetricsRow,
} from '@/lib/admin-api'
import { fetchSystemHealth } from '@/lib/api/health'
import { startImpersonation } from '@/lib/impersonation'
import { formatCOP, timeAgo } from '@/lib/api'
import {
  Building2, Users, Calendar, MessageSquare, DollarSign,
  Database, RefreshCw, Search, Plus, ExternalLink, Eye,
  CheckCircle2, PauseCircle, XCircle, Settings2,
  TrendingUp, Zap, Shield, Activity, GitPullRequest,
  Bot, AlertTriangle, BarChart3, ArrowRight
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

export default function AdminPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgWithStats[]>([])
  const [metrics, setMetrics] = useState({ patients: 0, appointments: 0, interactions: 0, revenue: 0, dataLake: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)
  const [enteringGodMode, setEnteringGodMode] = useState<string | null>(null)

  // CEO Pulse state
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetricsRow[]>([])
  const [healthStatus, setHealthStatus] = useState<string | null>(null)
  const [errorCount24h, setErrorCount24h] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const orgList = await fetchAllOrganizations()
      setOrgs(orgList)

      // Fetch global metrics
      const orgIds = orgList.map(o => o.id)
      if (orgIds.length > 0) {
        const m = await fetchGlobalMetrics(orgIds)
        setMetrics(m)
      }
    } catch {
      // Admin data load failed — UI will show empty state
    }
    setLoading(false)

    // Load per-org stats in background
    loadOrgStats()

    // Load CEO pulse data in background
    loadPulseData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPulseData = useCallback(async () => {
    // Pipeline metrics
    try {
      const pm = await fetchPipelineMetrics(10)
      setPipelineMetrics(pm)
    } catch { /* pipeline_metrics may not have RLS policy yet */ }

    // Health status
    try {
      const health = await fetchSystemHealth()
      setHealthStatus(health?.status || 'UNKNOWN')
    } catch {
      setHealthStatus('CRITICAL')
    }

    // Bot errors 24h
    try {
      const errors = await fetchBotErrorCount24h()
      setErrorCount24h(errors)
    } catch { /* silent */ }
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
          } catch {
            return org
          }
        })
      )
      setOrgs(withStats)
    } catch {
      // Org stats load failed — will show partial data
    }
    setStatsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  /** God Mode — enter clinic's dashboard */
  const handleGodMode = async (orgId: string, orgName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEnteringGodMode(orgId)
    try {
      await ensureSuperAdminMembership(orgId)
      startImpersonation(orgId, orgName)
      router.push('/dashboard')
    } catch {
      setEnteringGodMode(null)
    }
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

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* CEO COMMAND CENTER HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Command Center</h2>
          <p className="text-text-dim text-xs mt-0.5">Ataraxia IA Labs — Vista CEO</p>
        </div>
        <div className="flex items-center gap-2">
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
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pulseScore != null && pulseScore >= 80 ? 'from-status-success to-brand-cyan' : pulseScore != null && pulseScore >= 50 ? 'from-status-warning to-brand-gold' : 'from-status-danger to-red-600'} flex items-center justify-center shadow-lg`}>
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <div className="text-text-dim text-[10px] font-semibold uppercase tracking-wider">System Pulse</div>
              <div className={`text-3xl font-bold font-mono ${pulseColor}`}>
                {pulseScore != null ? `${pulseScore}%` : '...'}
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
              value={avgCI != null ? `${avgCI.toFixed(0)}%` : '—'}
            />
            <PulseIndicator
              label="Sentry"
              status={sentryErrors === 0 ? 'ok' : 'error'}
              value={sentryErrors.toString()}
            />
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction icon={<GitPullRequest size={16} />} label="Pipeline" sublabel={`${totalPRs} PRs esta semana`} onClick={() => router.push('/admin/pipeline')} color="text-brand-purple" />
        <QuickAction icon={<BarChart3 size={16} />} label="Metricas" sublabel={`${metrics.interactions.toLocaleString()} interacciones`} onClick={() => router.push('/admin/metricas')} color="text-brand-cyan" />
        <QuickAction icon={<Activity size={16} />} label="System Health" sublabel={healthStatus || 'Verificando...'} onClick={() => router.push('/admin/health')} color="text-status-success" />
        <QuickAction icon={<Bot size={16} />} label="God Mode" sublabel={`${orgs.length} clinicas disponibles`} onClick={() => document.getElementById('org-table')?.scrollIntoView({ behavior: 'smooth' })} color="text-status-danger" />
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
                          {/* God Mode — view clinic dashboard */}
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
                          {/* Org detail */}
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
    <div className="glass-card p-3.5">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-2`}>
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
        <span className={color}>{icon}</span>
        <ArrowRight size={12} className="text-text-dim group-hover:text-brand-purple transition-colors" />
      </div>
      <div className="text-sm font-semibold text-text-primary">{label}</div>
      <div className="text-[10px] text-text-dim">{sublabel}</div>
    </button>
  )
}
