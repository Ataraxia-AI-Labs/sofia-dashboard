'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchLatencyMetrics, type LatencyMetricRow } from '@/lib/admin-api'
import { Timer, RefreshCw, Zap, TrendingUp, Activity } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import * as Sentry from '@sentry/nextjs'

// ── Latency thresholds ────────────────────────────────────────────────────────

const LATENCY_THRESHOLD_GOOD = 200    // ms — below this is green
const LATENCY_THRESHOLD_WARNING = 500 // ms — below this is yellow, at/above is red

// ── Latency color coding ──────────────────────────────────────────────────────

function getLatencyColor(ms: number): string {
  if (ms < LATENCY_THRESHOLD_GOOD) return 'text-status-success'
  if (ms < LATENCY_THRESHOLD_WARNING) return 'text-status-warning'
  return 'text-status-danger'
}

function getLatencyBadge(ms: number): string {
  if (ms < LATENCY_THRESHOLD_GOOD) return 'bg-status-success/10 border-status-success/20 text-status-success'
  if (ms < LATENCY_THRESHOLD_WARNING) return 'bg-status-warning/10 border-status-warning/20 text-status-warning'
  return 'bg-status-danger/10 border-status-danger/20 text-status-danger'
}

function getLatencyDot(ms: number): string {
  if (ms < LATENCY_THRESHOLD_GOOD) return 'bg-status-success'
  if (ms < LATENCY_THRESHOLD_WARNING) return 'bg-status-warning'
  return 'bg-status-danger'
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

// ── Sparkline mini-chart ──────────────────────────────────────────────────────

function Sparkline({ data, p95 }: { data: number[]; p95: number }) {
  const color = p95 < 200 ? '#10b981' : p95 <= 500 ? '#f59e0b' : '#ef4444'
  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ display: 'none' }}
          wrapperStyle={{ display: 'none' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-text-dim mt-0.5">{sub}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminLatencyPage() {
  const [rows, setRows] = useState<LatencyMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    try {
      const data = await fetchLatencyMetrics()
      // Sort by P95 descending (worst first)
      data.sort((a, b) => b.p95_ms - a.p95_ms)
      setRows(data)
      setLastUpdated(new Date())
    } catch (err) {
      Sentry.captureException(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadData])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const slowCount = rows.filter(r => r.p95_ms >= LATENCY_THRESHOLD_WARNING).length
  const warnCount = rows.filter(r => r.p95_ms >= LATENCY_THRESHOLD_GOOD && r.p95_ms < LATENCY_THRESHOLD_WARNING).length
  const okCount   = rows.filter(r => r.p95_ms < LATENCY_THRESHOLD_GOOD).length
  const totalReqs = rows.reduce((sum, r) => sum + r.request_count, 0)
  const worstP95  = rows.length > 0 ? rows[0].p95_ms : 0

  return (
    <div className="max-w-[1200px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Latency Metrics</h2>
          <p className="text-text-dim text-xs mt-0.5">
            P50 / P95 / P99 por endpoint — ordenado por peor P95
            {lastUpdated && (
              <span className="ml-2 opacity-60">
                · Actualizado {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
              autoRefresh
                ? 'bg-status-success/10 border-status-success/20 text-status-success'
                : 'bg-surface-2 border-border text-text-dim'
            }`}
          >
            <Zap size={10} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={loadData}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Peor P95"
          value={rows.length > 0 ? formatMs(worstP95) : '—'}
          sub="endpoint más lento"
          color={rows.length > 0 ? getLatencyColor(worstP95) : 'text-text-dim'}
        />
        <StatCard
          label="Endpoints lentos"
          value={String(slowCount)}
          sub="> 500ms P95"
          color={slowCount > 0 ? 'text-status-danger' : 'text-status-success'}
        />
        <StatCard
          label="En alerta"
          value={String(warnCount)}
          sub="200–500ms P95"
          color={warnCount > 0 ? 'text-status-warning' : 'text-status-success'}
        />
        <StatCard
          label="Total requests"
          value={totalReqs >= 1000 ? `${(totalReqs / 1000).toFixed(1)}k` : String(totalReqs)}
          sub={`${okCount} endpoints OK`}
          color="text-text-primary"
        />
      </div>

      {/* LEGEND */}
      <div className="flex items-center gap-4 text-[10px] text-text-dim">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-success" /> &lt; 200ms (bueno)</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-warning" /> 200–499ms (alerta)</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-status-danger" /> ≥ 500ms (crítico)</div>
      </div>

      {/* TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Timer size={14} className="text-brand-purple" />
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Endpoints ({rows.length})
            </h3>
          </div>
          {slowCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-danger/10 border border-status-danger/20">
              <Activity size={10} className="text-status-danger" />
              <span className="text-[10px] font-semibold text-status-danger">{slowCount} crítico{slowCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Endpoint</th>
                <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Método</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">P50</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">P95</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">P99</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Avg</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Requests</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Historial</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center">
                    <RefreshCw size={16} className="animate-spin text-text-dim mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <TrendingUp size={24} className="text-text-dim opacity-40" />
                      <p className="text-text-dim text-xs">Sin datos de latencia disponibles</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={`${row.method}-${row.endpoint}-${idx}`} className="border-b border-border/50 hover:bg-surface-3/50 transition-colors">
                    {/* Endpoint */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getLatencyDot(row.p95_ms)}`} />
                        <span className="text-xs font-mono text-text-primary truncate max-w-[260px]" title={row.endpoint}>
                          {row.endpoint}
                        </span>
                      </div>
                    </td>
                    {/* Method */}
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                        row.method === 'GET'    ? 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan' :
                        row.method === 'POST'   ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' :
                        row.method === 'PUT'    ? 'bg-status-warning/10 border-status-warning/20 text-status-warning' :
                        row.method === 'PATCH'  ? 'bg-status-warning/10 border-status-warning/20 text-status-warning' :
                        row.method === 'DELETE' ? 'bg-status-danger/10 border-status-danger/20 text-status-danger' :
                        'bg-surface-3 border-border text-text-dim'
                      }`}>
                        {row.method}
                      </span>
                    </td>
                    {/* P50 */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-mono font-semibold ${getLatencyColor(row.p50_ms)}`}>
                        {formatMs(row.p50_ms)}
                      </span>
                    </td>
                    {/* P95 */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getLatencyBadge(row.p95_ms)}`}>
                        {formatMs(row.p95_ms)}
                      </span>
                    </td>
                    {/* P99 */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-mono font-semibold ${getLatencyColor(row.p99_ms)}`}>
                        {formatMs(row.p99_ms)}
                      </span>
                    </td>
                    {/* Avg */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-mono text-text-muted">
                        {formatMs(row.avg_ms)}
                      </span>
                    </td>
                    {/* Request count */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-mono text-text-muted">
                        {row.request_count.toLocaleString()}
                      </span>
                    </td>
                    {/* Sparkline */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        {row.history && row.history.length > 1 ? (
                          <Sparkline data={row.history} p95={row.p95_ms} />
                        ) : (
                          <span className="text-[10px] text-text-dim">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
