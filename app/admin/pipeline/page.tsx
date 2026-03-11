'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchPipelineMetrics, type PipelineMetricsRow } from '@/lib/admin-api'
import dynamic from 'next/dynamic'
import {
  GitPullRequest, CheckCircle2, Bot, AlertTriangle, Clock,
  Code2, RefreshCw, TrendingUp, Shield, Bug, GitMerge,
  ArrowUpRight, ArrowDownRight, Minus
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

// ── Autonomy Score: % of PRs that merged without human intervention ──
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

  const latest = getLatestWeekAgg(metrics)
  const autonomy = calcAutonomyScore(metrics)

  // Per-repo breakdown for table
  const latestWeekRows = metrics.length > 0
    ? metrics.filter(r => r.week_start === metrics[0].week_start)
    : []

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
        <button onClick={loadData} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
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

      {/* AUTONOMY SCORE — Hero Card */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br from-brand-purple/10 to-brand-cyan/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/20">
              <Bot size={28} className="text-white" />
            </div>
            <div>
              <div className="text-text-dim text-xs font-semibold uppercase tracking-wider mb-1">Autonomy Score</div>
              <div className="text-4xl font-bold font-mono gradient-text">
                {autonomy != null ? `${autonomy}%` : '—'}
              </div>
              <div className="text-text-muted text-xs mt-0.5">
                PRs mergeados autonomamente sin intervencion humana
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-text-primary">{latest?.prs_created ?? '—'}</div>
              <div className="text-[10px] text-text-dim mt-0.5">PRs Creados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-status-success">{latest?.prs_merged ?? '—'}</div>
              <div className="text-[10px] text-text-dim mt-0.5">Mergeados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono text-status-warning">{latest?.prs_open ?? '—'}</div>
              <div className="text-[10px] text-text-dim mt-0.5">Abiertos</div>
            </div>
          </div>
        </div>
        {latest && (
          <div className="mt-4 pt-3 border-t border-border/50 text-text-dim text-[10px]">
            Semana del {latest.week} · {latest.repos} repositorios analizados
          </div>
        )}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          icon={<GitPullRequest size={16} />}
          gradient="from-brand-purple to-brand-purple-dark"
          label="PRs Creados"
          value={latest?.prs_created?.toString() ?? '—'}
        />
        <KPICard
          icon={<GitMerge size={16} />}
          gradient="from-status-success to-emerald-600"
          label="PRs Mergeados"
          value={latest?.prs_merged?.toString() ?? '—'}
        />
        <KPICard
          icon={<CheckCircle2 size={16} />}
          gradient="from-brand-cyan to-emerald-600"
          label="CI Pass Rate"
          value={latest?.ci_pass_rate != null ? `${latest.ci_pass_rate}%` : '—'}
          accent={latest?.ci_pass_rate != null ? (latest.ci_pass_rate >= 90 ? 'success' : latest.ci_pass_rate >= 70 ? 'warning' : 'danger') : undefined}
        />
        <KPICard
          icon={<Clock size={16} />}
          gradient="from-status-info to-blue-600"
          label="Avg Merge Time"
          value={latest?.avg_merge_time != null ? `${latest.avg_merge_time}h` : '—'}
        />
        <KPICard
          icon={<Bug size={16} />}
          gradient="from-status-danger to-red-600"
          label="Sentry Errors"
          value={latest?.sentry_errors?.toString() ?? '—'}
          accent={latest ? (latest.sentry_errors === 0 ? 'success' : 'danger') : undefined}
        />
        <KPICard
          icon={<Code2 size={16} />}
          gradient="from-brand-gold to-amber-500"
          label="Lines Changed"
          value={latest ? `+${latest.lines_added} / -${latest.lines_removed}` : '—'}
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
                    <tr key={r.id} className="border-b border-border/50 hover:bg-surface-3/50">
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">{repoShort}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-text-muted">{r.prs_created}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-status-success">{r.prs_merged}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-mono font-semibold ${
                          r.ci_pass_rate != null
                            ? r.ci_pass_rate >= 90 ? 'text-status-success' : r.ci_pass_rate >= 70 ? 'text-status-warning' : 'text-status-danger'
                            : 'text-text-dim'
                        }`}>
                          {r.ci_pass_rate != null ? `${r.ci_pass_rate}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-status-success">{r.coderabbit_approved}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-status-warning">{r.coderabbit_changes_requested}</td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-text-muted">
                        {r.avg_time_to_merge_hours != null ? `${r.avg_time_to_merge_hours}h` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-mono font-semibold ${r.sentry_errors > 0 ? 'text-status-danger' : 'text-status-success'}`}>
                          {r.sentry_errors}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono">
                        <span className="text-status-success">+{r.lines_added}</span>
                        <span className="text-text-dim mx-1">/</span>
                        <span className="text-status-danger">-{r.lines_removed}</span>
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
            { label: 'Issue', icon: '📋', color: 'from-brand-purple/20 to-brand-purple/5' },
            { label: 'Auto-Assign', icon: '🤖', color: 'from-status-info/20 to-status-info/5' },
            { label: 'Copilot PR', icon: '🔧', color: 'from-brand-cyan/20 to-brand-cyan/5' },
            { label: 'Auto-Ready', icon: '✅', color: 'from-status-success/20 to-status-success/5' },
            { label: 'CI/CD', icon: '⚡', color: 'from-brand-gold/20 to-brand-gold/5' },
            { label: 'CodeRabbit', icon: '🐰', color: 'from-status-warning/20 to-status-warning/5' },
            { label: 'Auto-Merge', icon: '🔀', color: 'from-status-success/20 to-status-success/5' },
            { label: 'Deploy', icon: '🚀', color: 'from-brand-purple/20 to-brand-purple/5' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
              <div className={`px-3 py-2 rounded-xl bg-gradient-to-br ${step.color} border border-border/50 text-center min-w-[80px]`}>
                <div className="text-lg">{step.icon}</div>
                <div className="text-[9px] font-semibold text-text-muted mt-0.5">{step.label}</div>
              </div>
              {i < 7 && <div className="text-text-dim text-xs">→</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Reusable Components ──

function KPICard({ icon, gradient, label, value, accent }: {
  icon: React.ReactNode
  gradient: string
  label: string
  value: string
  accent?: 'success' | 'warning' | 'danger'
}) {
  const accentColor = accent === 'success' ? 'text-status-success' : accent === 'warning' ? 'text-status-warning' : accent === 'danger' ? 'text-status-danger' : 'text-text-primary'
  return (
    <div className="glass-card p-3.5">
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-2`}>
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
