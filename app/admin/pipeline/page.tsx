'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchPipelineMetrics, type PipelineMetricsRow } from '@/lib/admin-api'
import dynamic from 'next/dynamic'
import {
  GitPullRequest, CheckCircle2, Bot, AlertTriangle, Clock,
  Code2, RefreshCw, TrendingUp, Shield, Bug, GitMerge,
  ArrowUpRight, ArrowDownRight, Minus, Zap, Sparkles,
  CircleDot, Play, Timer
} from 'lucide-react'

const PRThroughputChart = dynamic(() => import('./PipelineCharts').then(m => m.PRThroughputChart), {
  ssr: false, loading: () => <ChartSkeleton />,
})
const CIPassRateChart = dynamic(() => import('./PipelineCharts').then(m => m.CIPassRateChart), {
  ssr: false, loading: () => <ChartSkeleton />,
})
const CodeRabbitChart = dynamic(() => import('./PipelineCharts').then(m => m.CodeRabbitChart), {
  ssr: false, loading: () => <ChartSkeleton />,
})
const LinesChart = dynamic(() => import('./PipelineCharts').then(m => m.LinesChart), {
  ssr: false, loading: () => <ChartSkeleton />,
})
const IssuesErrorsChart = dynamic(() => import('./PipelineCharts').then(m => m.IssuesErrorsChart), {
  ssr: false, loading: () => <ChartSkeleton />,
})

function ChartSkeleton() {
  return <div className="h-[240px] bg-surface-3 rounded-lg animate-pulse" />
}

// ── Aggregate latest week data across repos ──
function getLatestWeekAgg(rows: PipelineMetricsRow[]) {
  if (rows.length === 0) return null
  const latestWeek = rows[0].week_start
  const weekRows = rows.filter(r => r.week_start === latestWeek)

  const agg = {
    week: latestWeek,
    repos: weekRows.length,
    prs_created: 0, prs_merged: 0, prs_open: 0,
    ci_pass_rate: null as number | null, ci_count: 0,
    cr_approved: 0, cr_changes: 0,
    avg_merge_time: null as number | null, merge_count: 0,
    issues_created: 0, issues_closed: 0,
    sentry_errors: 0, health_failures: 0,
    lines_added: 0, lines_removed: 0,
  }

  for (const r of weekRows) {
    agg.prs_created += r.prs_created
    agg.prs_merged += r.prs_merged
    agg.prs_open += r.prs_open
    if (r.ci_pass_rate != null) {
      agg.ci_pass_rate = (agg.ci_pass_rate ?? 0) + r.ci_pass_rate
      agg.ci_count++
    }
    if (r.avg_time_to_merge_hours != null) {
      agg.avg_merge_time = (agg.avg_merge_time ?? 0) + r.avg_time_to_merge_hours
      agg.merge_count++
    }
    agg.cr_approved += r.coderabbit_approved
    agg.cr_changes += r.coderabbit_changes_requested
    agg.issues_created += r.issues_created
    agg.issues_closed += r.issues_closed
    agg.sentry_errors += r.sentry_errors
    agg.health_failures += r.health_check_failures
    agg.lines_added += r.lines_added
    agg.lines_removed += r.lines_removed
  }

  if (agg.ci_count > 0) agg.ci_pass_rate = +(agg.ci_pass_rate! / agg.ci_count).toFixed(1)
  if (agg.merge_count > 0) agg.avg_merge_time = +(agg.avg_merge_time! / agg.merge_count).toFixed(1)

  return agg
}

// ── Get previous week agg for trend comparison ──
function getPreviousWeekAgg(rows: PipelineMetricsRow[]) {
  if (rows.length === 0) return null
  const weeks = [...new Set(rows.map(r => r.week_start))].sort().reverse()
  if (weeks.length < 2) return null
  const prevWeek = weeks[1]
  const weekRows = rows.filter(r => r.week_start === prevWeek)

  let prs_created = 0, prs_merged = 0
  for (const r of weekRows) {
    prs_created += r.prs_created
    prs_merged += r.prs_merged
  }
  return { prs_created, prs_merged }
}

// ── Autonomy Score ──
function calcAutonomyScore(rows: PipelineMetricsRow[]) {
  const total = rows.reduce((s, r) => s + r.prs_created, 0)
  const merged = rows.reduce((s, r) => s + r.prs_merged, 0)
  if (total === 0) return null
  return +((merged / total) * 100).toFixed(0)
}

export default function PipelinePage() {
  const [metrics, setMetrics] = useState<PipelineMetricsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPipelineMetrics(50)
      setMetrics(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading pipeline metrics')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadData])

  const latest = getLatestWeekAgg(metrics)
  const prev = getPreviousWeekAgg(metrics)
  const autonomy = calcAutonomyScore(metrics)

  const latestWeekRows = metrics.length > 0
    ? metrics.filter(r => r.week_start === metrics[0].week_start)
    : []

  // Trend calculation
  const prTrend = latest && prev ? latest.prs_created - prev.prs_created : null
  const mergeTrend = latest && prev ? latest.prs_merged - prev.prs_merged : null

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Pipeline Command Center</h2>
          <p className="text-text-dim text-xs mt-0.5">
            Autonomous Engineering Pipeline — Metricas en tiempo real
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
            Auto {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button onClick={loadData} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-card p-4 border-status-danger/30 bg-status-danger/5">
          <div className="flex items-center gap-2 text-status-danger text-sm">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
          <p className="text-text-dim text-xs mt-1">
            Asegurate de ejecutar la policy RLS para super admins en pipeline_metrics.
          </p>
        </div>
      )}

      {/* AUTONOMY SCORE — Hero Card with Circular Progress */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-brand-purple/10 to-brand-cyan/10 blur-2xl" />
        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br from-brand-cyan/5 to-brand-purple/5 blur-xl" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          {/* Circular Autonomy Score */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-3" />
              <circle
                cx="64" cy="64" r="56" fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                stroke="url(#autonomyGrad)"
                strokeDasharray={`${(autonomy ?? 0) * 3.52} 352`}
                style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
              />
              <defs>
                <linearGradient id="autonomyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#06D6A0" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono gradient-text">
                {autonomy != null ? autonomy : '\u2014'}
              </span>
              <span className="text-[9px] text-text-dim font-semibold uppercase tracking-wider">
                {autonomy != null ? '%' : ''}
              </span>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 text-center sm:text-left">
            <div className="text-text-dim text-xs font-semibold uppercase tracking-wider mb-1">Autonomy Score</div>
            <div className="text-text-muted text-xs mb-4">
              PRs mergeados autonomamente sin intervencion humana
            </div>

            {/* Mini Stats Row */}
            <div className="flex items-center gap-6 justify-center sm:justify-start">
              <MiniStat
                label="PRs Creados"
                value={latest?.prs_created?.toString() ?? '\u2014'}
                trend={prTrend}
                color="text-brand-purple"
              />
              <MiniStat
                label="Mergeados"
                value={latest?.prs_merged?.toString() ?? '\u2014'}
                trend={mergeTrend}
                color="text-status-success"
              />
              <MiniStat
                label="Abiertos"
                value={latest?.prs_open?.toString() ?? '\u2014'}
                color="text-status-warning"
              />
              <MiniStat
                label="Sentry"
                value={latest?.sentry_errors?.toString() ?? '\u2014'}
                color={latest && latest.sentry_errors > 0 ? 'text-status-danger' : 'text-status-success'}
              />
            </div>
          </div>
        </div>
        {latest && (
          <div className="mt-4 pt-3 border-t border-border/50 text-text-dim text-[10px] flex items-center gap-2">
            <Timer size={10} />
            Semana del {latest.week} · {latest.repos} repositorios analizados
            {prev && <span className="ml-auto">vs semana anterior</span>}
          </div>
        )}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          icon={<GitPullRequest size={16} />}
          gradient="from-brand-purple to-brand-purple-dark"
          label="PRs Creados"
          value={latest?.prs_created?.toString() ?? '\u2014'}
        />
        <KPICard
          icon={<GitMerge size={16} />}
          gradient="from-status-success to-emerald-600"
          label="PRs Mergeados"
          value={latest?.prs_merged?.toString() ?? '\u2014'}
        />
        <KPICard
          icon={<CheckCircle2 size={16} />}
          gradient="from-brand-cyan to-emerald-600"
          label="CI Pass Rate"
          value={latest?.ci_pass_rate != null ? `${latest.ci_pass_rate}%` : '\u2014'}
          accent={latest?.ci_pass_rate != null ? (latest.ci_pass_rate >= 90 ? 'success' : latest.ci_pass_rate >= 70 ? 'warning' : 'danger') : undefined}
        />
        <KPICard
          icon={<Clock size={16} />}
          gradient="from-status-info to-blue-600"
          label="Avg Merge Time"
          value={latest?.avg_merge_time != null ? `${latest.avg_merge_time}h` : '\u2014'}
        />
        <KPICard
          icon={<Bug size={16} />}
          gradient="from-status-danger to-red-600"
          label="Sentry Errors"
          value={latest?.sentry_errors?.toString() ?? '\u2014'}
          accent={latest ? (latest.sentry_errors === 0 ? 'success' : 'danger') : undefined}
        />
        <KPICard
          icon={<Code2 size={16} />}
          gradient="from-brand-gold to-amber-500"
          label="Lines Changed"
          value={latest ? `+${latest.lines_added.toLocaleString()}` : '\u2014'}
        />
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="PR Throughput" icon={<GitPullRequest size={14} />} color="text-brand-purple">
          {metrics.length > 0 ? <PRThroughputChart data={metrics} /> : <EmptyChart loading={loading} />}
        </ChartCard>
        <ChartCard title="CI Pass Rate" icon={<CheckCircle2 size={14} />} color="text-brand-cyan">
          {metrics.length > 0 ? <CIPassRateChart data={metrics} /> : <EmptyChart loading={loading} />}
        </ChartCard>
      </div>

      {/* CHARTS ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="CodeRabbit Reviews" icon={<Bot size={14} />} color="text-brand-gold">
          {metrics.length > 0 ? <CodeRabbitChart data={metrics} /> : <EmptyChart loading={loading} />}
        </ChartCard>
        <ChartCard title="Issues & Errores" icon={<AlertTriangle size={14} />} color="text-status-danger">
          {metrics.length > 0 ? <IssuesErrorsChart data={metrics} /> : <EmptyChart loading={loading} />}
        </ChartCard>
      </div>

      {/* CHARTS ROW 3 */}
      <ChartCard title="Lines of Code" icon={<Code2 size={14} />} color="text-status-success">
        {metrics.length > 0 ? <LinesChart data={metrics} /> : <EmptyChart loading={loading} />}
      </ChartCard>

      {/* PER-REPO BREAKDOWN TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield size={14} className="text-brand-purple" />
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Detalle por Repositorio
            </h3>
          </div>
          {latest && (
            <span className="text-[10px] text-text-dim">Semana del {latest.week}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Repo</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">PRs</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Merged</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">CI Rate</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">CR Approved</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">CR Changes</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Avg Merge</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Sentry</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Lines +/-</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={9} className="px-4 py-4"><div className="h-4 bg-surface-3 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : latestWeekRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-text-dim text-xs">
                    Sin datos de pipeline. El workflow corre cada domingo a medianoche UTC.
                  </td>
                </tr>
              ) : (
                latestWeekRows.map(r => {
                  const repoShort = r.repo.split('/').pop() || r.repo
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-surface-3/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 flex items-center justify-center text-brand-purple text-[9px] font-bold">
                            {repoShort[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-text-primary">{repoShort}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-text-muted">{r.prs_created}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-status-success">{r.prs_merged}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-mono font-semibold ${
                          r.ci_pass_rate != null
                            ? r.ci_pass_rate >= 90 ? 'text-status-success' : r.ci_pass_rate >= 70 ? 'text-status-warning' : 'text-status-danger'
                            : 'text-text-dim'
                        }`}>
                          {r.ci_pass_rate != null ? `${r.ci_pass_rate}%` : '\u2014'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-status-success">{r.coderabbit_approved}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-status-warning">{r.coderabbit_changes_requested}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-text-muted">
                        {r.avg_time_to_merge_hours != null ? `${r.avg_time_to_merge_hours}h` : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-mono font-semibold ${r.sentry_errors > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                          {r.sentry_errors}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono">
                        <span className="text-status-success">+{r.lines_added.toLocaleString()}</span>
                        <span className="text-text-dim mx-1">/</span>
                        <span className="text-status-danger">-{r.lines_removed.toLocaleString()}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PIPELINE FLOW DIAGRAM */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <TrendingUp size={14} className="text-brand-purple" />
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pipeline Autonomo — Flow</h3>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: 'Issue', icon: <CircleDot size={18} />, desc: 'Sentry / Mining / Manual' },
            { label: 'Auto-Assign', icon: <Bot size={18} />, desc: 'Label → Copilot' },
            { label: 'Copilot PR', icon: <GitPullRequest size={18} />, desc: 'Draft → Code' },
            { label: 'Auto-Ready', icon: <Play size={18} />, desc: '2min → Ready' },
            { label: 'CI/CD', icon: <Zap size={18} />, desc: 'Lint + Tests' },
            { label: 'CodeRabbit', icon: <Sparkles size={18} />, desc: 'AI Review' },
            { label: 'Auto-Merge', icon: <GitMerge size={18} />, desc: 'Squash Merge' },
            { label: 'Deploy', icon: <ArrowUpRight size={18} />, desc: 'Render/Vercel' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
              <div className="group px-3 py-3 rounded-xl bg-surface-2 border border-border hover:border-brand-purple/30 text-center min-w-[90px] transition-all cursor-default">
                <div className="text-brand-purple group-hover:text-brand-cyan transition-colors flex justify-center mb-1">
                  {step.icon}
                </div>
                <div className="text-[10px] font-semibold text-text-primary">{step.label}</div>
                <div className="text-[8px] text-text-dim mt-0.5">{step.desc}</div>
              </div>
              {i < 7 && (
                <div className="text-brand-purple/40 text-sm font-mono">&rarr;</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Reusable Components ──

function MiniStat({ label, value, trend, color }: {
  label: string; value: string; trend?: number | null; color: string
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1">
        <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
        {trend != null && trend !== 0 && (
          <span className={`text-[9px] flex items-center ${trend > 0 ? 'text-status-success' : 'text-status-danger'}`}>
            {trend > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}
          </span>
        )}
      </div>
      <div className="text-[9px] text-text-dim mt-0.5">{label}</div>
    </div>
  )
}

function KPICard({ icon, gradient, label, value, accent }: {
  icon: React.ReactNode
  gradient: string
  label: string
  value: string
  accent?: 'success' | 'warning' | 'danger'
}) {
  const accentColor = accent === 'success' ? 'text-status-success' : accent === 'warning' ? 'text-status-warning' : accent === 'danger' ? 'text-status-danger' : 'text-text-primary'
  return (
    <div className="glass-card p-3.5 group hover:border-brand-purple/20 transition-all">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className={`text-lg font-bold font-mono ${accentColor}`}>{value}</div>
      <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
    </div>
  )
}

function ChartCard({ title, icon, color, children }: {
  title: string
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className={color}>{icon}</span>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ loading }: { loading: boolean }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-text-dim text-xs">
      {loading ? 'Cargando datos...' : 'Sin datos de pipeline. El workflow corre cada domingo.'}
    </div>
  )
}
