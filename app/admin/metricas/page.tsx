'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchAllOrganizations, fetchGlobalMetrics, fetchOrgStats, type AdminOrgRow } from '@/lib/admin-api'
import { formatCOP } from '@/lib/api'
import {
  Building2, Users, Calendar, MessageSquare, DollarSign,
  Database, TrendingUp, RefreshCw, BarChart3, Zap
} from 'lucide-react'

interface OrgMetric extends AdminOrgRow {
  stats: { patients: number; appointments: number; interactions: number; revenue: number }
}

export default function MetricsPage() {
  const [orgs, setOrgs] = useState<OrgMetric[]>([])
  const [global, setGlobal] = useState({ patients: 0, appointments: 0, interactions: 0, revenue: 0, dataLake: 0 })
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const orgList = await fetchAllOrganizations()
      const orgIds = orgList.map(o => o.id)

      const [globalMetrics, ...orgStats] = await Promise.all([
        fetchGlobalMetrics(orgIds),
        ...orgList.map(o => fetchOrgStats(o.id).then(stats => ({ ...o, stats }))),
      ])

      setGlobal(globalMetrics)
      setOrgs(orgStats.sort((a, b) => b.stats.revenue - a.stats.revenue))
    } catch (e) {
      console.error('Error loading metrics:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalRevenue = orgs.reduce((sum, o) => sum + o.stats.revenue, 0)

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Métricas Globales</h2>
          <p className="text-text-dim text-xs mt-0.5">Consolidado de todas las organizaciones</p>
        </div>
        <button onClick={loadData} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* GLOBAL CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <GlobalCard icon={<Building2 size={18} />} gradient="from-brand-purple to-brand-purple-dark" value={orgs.length.toString()} label="Organizaciones" />
        <GlobalCard icon={<Users size={18} />} gradient="from-status-info to-blue-600" value={global.patients.toLocaleString()} label="Pacientes" />
        <GlobalCard icon={<Calendar size={18} />} gradient="from-brand-cyan to-emerald-600" value={global.appointments.toLocaleString()} label="Citas" />
        <GlobalCard icon={<DollarSign size={18} />} gradient="from-brand-gold to-amber-500" value={formatCOP(global.revenue)} label="Revenue Total" />
        <GlobalCard icon={<Database size={18} />} gradient="from-status-success to-emerald-600" value={global.dataLake.toLocaleString()} label="Data Lake" />
      </div>

      {/* REVENUE TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
          <BarChart3 size={14} className="text-brand-purple" />
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Revenue por Organización</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Organización</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Plan</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Pacientes</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Citas</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Interacciones</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Revenue</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-text-dim uppercase tracking-wider">% Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50"><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-surface-3 rounded animate-pulse" /></td></tr>
                ))
              ) : orgs.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-text-dim text-xs">Sin datos</td></tr>
              ) : (
                orgs.map(o => {
                  const pct = totalRevenue > 0 ? ((o.stats.revenue / totalRevenue) * 100).toFixed(1) : '0'
                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-surface-3/50">
                      <td className="px-5 py-3 text-sm font-semibold text-text-primary">{o.name}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple border border-brand-purple/20">{o.plan || 'TRIAL'}</span>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-mono text-text-muted">{o.stats.patients}</td>
                      <td className="px-5 py-3 text-right text-sm font-mono text-text-muted">{o.stats.appointments}</td>
                      <td className="px-5 py-3 text-right text-sm font-mono text-text-muted">{o.stats.interactions.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-sm font-mono font-bold gradient-text">{formatCOP(o.stats.revenue)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-purple rounded-full" style={{ width: `${Math.min(parseFloat(pct), 100)}%` }} />
                          </div>
                          <span className="text-xs text-text-dim font-mono w-10 text-right">{pct}%</span>
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

function GlobalCard({ icon, gradient, value, label }: { icon: React.ReactNode; gradient: string; value: string; label: string }) {
  return (
    <div className="glass-card p-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-2.5 shadow-lg`}>
        {icon}
      </div>
      <div className="text-xl font-bold font-mono text-text-primary">{value}</div>
      <div className="text-[11px] text-text-muted mt-0.5">{label}</div>
    </div>
  )
}
