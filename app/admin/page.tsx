'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchAllOrganizations, fetchGlobalMetrics, fetchOrgStats,
  type AdminOrgRow,
} from '@/lib/admin-api'
import { formatCOP, timeAgo } from '@/lib/api'
import {
  Building2, Users, Calendar, MessageSquare, DollarSign,
  Database, RefreshCw, Search, Plus, ExternalLink,
  CheckCircle2, PauseCircle, XCircle, Settings2,
  TrendingUp, Zap
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
  BASIC: 'bg-status-info/10 text-status-info border-status-info/20',
  PRO: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
  ENTERPRISE: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
}

interface OrgWithStats extends AdminOrgRow {
  stats?: { patients: number; appointments: number; interactions: number; revenue: number }
}

export default function AdminPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgWithStats[]>([])
  const [metrics, setMetrics] = useState({ patients: 0, appointments: 0, interactions: 0, revenue: 0, dataLake: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)

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
    } catch (e) {
      console.error('Error loading admin data:', e)
    }
    setLoading(false)

    // Then load per-org stats in background
    loadOrgStats()
  }, [])

  const loadOrgStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const orgList = await fetchAllOrganizations()
      const withStats = await Promise.all(
        orgList.map(async (org) => {
          try {
            const stats = await fetchOrgStats(org.id)
            return { ...org, stats }
          } catch {
            return org
          }
        })
      )
      setOrgs(withStats)
    } catch (e) {
      console.error('Error loading org stats:', e)
    }
    setStatsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = search
    ? orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : orgs

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Organizaciones</h2>
          <p className="text-text-dim text-xs mt-0.5">{orgs.length} organizaciones registradas</p>
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

      {/* GLOBAL METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard icon={<Building2 size={16} />} gradient="from-brand-purple to-brand-purple-dark" value={orgs.length.toString()} label="Organizaciones" />
        <MetricCard icon={<Users size={16} />} gradient="from-status-info to-blue-600" value={metrics.patients.toLocaleString()} label="Pacientes totales" />
        <MetricCard icon={<Calendar size={16} />} gradient="from-brand-cyan to-emerald-600" value={metrics.appointments.toLocaleString()} label="Citas totales" />
        <MetricCard icon={<DollarSign size={16} />} gradient="from-brand-gold to-amber-500" value={formatCOP(metrics.revenue)} label="Revenue total" />
        <MetricCard icon={<Database size={16} />} gradient="from-status-success to-emerald-600" value={metrics.dataLake.toLocaleString()} label="Data Lake entries" />
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar organización..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-dim text-sm outline-none focus:border-brand-purple/40 focus:ring-1 focus:ring-brand-purple/20 transition-all"
        />
      </div>

      {/* ORG TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Organización</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Plan</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Pacientes</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Citas</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Interacciones</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Revenue</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-dim uppercase tracking-wider">Creada</th>
                <th className="px-4 py-3" />
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
                        Crear primera organización
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((org) => {
                  const statusCfg = STATUS_MAP[org.status] || STATUS_MAP.ACTIVE
                  const StatusIcon = statusCfg.icon
                  const planColor = PLAN_COLORS[org.plan || 'TRIAL'] || PLAN_COLORS.TRIAL

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
                        <span className="text-xs text-text-dim">{timeAgo(org.created_at)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ExternalLink size={14} className="text-text-dim" />
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
