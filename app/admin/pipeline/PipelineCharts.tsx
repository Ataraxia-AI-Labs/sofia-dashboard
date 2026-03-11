'use client'

import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Cell
} from 'recharts'
import type { PipelineMetricsRow } from '@/lib/admin-api'

// ── Aggregate metrics by week (sum across repos) ──
function aggregateByWeek(rows: PipelineMetricsRow[]) {
  const map = new Map<string, {
    week: string
    prs_created: number; prs_merged: number; prs_open: number
    ci_pass_rate: number; ci_count: number
    cr_approved: number; cr_changes: number
    issues_created: number; issues_closed: number
    sentry_errors: number; health_failures: number
    lines_added: number; lines_removed: number
  }>()

  for (const r of rows) {
    const existing = map.get(r.week_start) || {
      week: r.week_start,
      prs_created: 0, prs_merged: 0, prs_open: 0,
      ci_pass_rate: 0, ci_count: 0,
      cr_approved: 0, cr_changes: 0,
      issues_created: 0, issues_closed: 0,
      sentry_errors: 0, health_failures: 0,
      lines_added: 0, lines_removed: 0,
    }
    existing.prs_created += r.prs_created
    existing.prs_merged += r.prs_merged
    existing.prs_open += r.prs_open
    if (r.ci_pass_rate != null) {
      existing.ci_pass_rate += r.ci_pass_rate
      existing.ci_count += 1
    }
    existing.cr_approved += r.coderabbit_approved
    existing.cr_changes += r.coderabbit_changes_requested
    existing.issues_created += r.issues_created
    existing.issues_closed += r.issues_closed
    existing.sentry_errors += r.sentry_errors
    existing.health_failures += r.health_check_failures
    existing.lines_added += r.lines_added
    existing.lines_removed += r.lines_removed
    map.set(r.week_start, existing)
  }

  return Array.from(map.values())
    .map(w => ({
      ...w,
      ci_pass_rate: w.ci_count > 0 ? +(w.ci_pass_rate / w.ci_count).toFixed(1) : null,
      week_label: w.week.slice(5), // MM-DD
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
}

const TOOLTIP_STYLE = {
  backgroundColor: '#101018',
  border: '1px solid #1C1C2A',
  borderRadius: '12px',
  fontSize: '11px',
}

// ── PR Throughput Chart ──
export function PRThroughputChart({ data }: { data: PipelineMetricsRow[] }) {
  const weeks = aggregateByWeek(data)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1C1C2A" strokeDasharray="3 3" />
        <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: '#7E7A8E' }} />
        <YAxis tick={{ fontSize: 10, fill: '#7E7A8E' }} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F0EEF5' }} />
        <Legend wrapperStyle={{ fontSize: '10px', color: '#7E7A8E' }} />
        <Bar dataKey="prs_created" name="Creados" radius={[4, 4, 0, 0]} fill="#8B5CF6" />
        <Bar dataKey="prs_merged" name="Mergeados" radius={[4, 4, 0, 0]} fill="#06D6A0" />
        <Bar dataKey="prs_open" name="Abiertos" radius={[4, 4, 0, 0]} fill="#F5C842" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── CI Pass Rate Chart ──
export function CIPassRateChart({ data }: { data: PipelineMetricsRow[] }) {
  const weeks = aggregateByWeek(data).map(w => ({
    ...w,
    ci_pass_rate: w.ci_pass_rate ?? 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCI" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06D6A0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1C1C2A" strokeDasharray="3 3" />
        <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: '#7E7A8E' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#7E7A8E' }} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F0EEF5' }} formatter={(v: number) => [`${v}%`, 'CI Pass Rate']} />
        <Area type="monotone" dataKey="ci_pass_rate" stroke="#06D6A0" fill="url(#gradCI)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── CodeRabbit Review Chart ──
export function CodeRabbitChart({ data }: { data: PipelineMetricsRow[] }) {
  const weeks = aggregateByWeek(data)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1C1C2A" strokeDasharray="3 3" />
        <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: '#7E7A8E' }} />
        <YAxis tick={{ fontSize: 10, fill: '#7E7A8E' }} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F0EEF5' }} />
        <Legend wrapperStyle={{ fontSize: '10px', color: '#7E7A8E' }} />
        <Bar dataKey="cr_approved" name="Aprobados" radius={[4, 4, 0, 0]} fill="#06D6A0" />
        <Bar dataKey="cr_changes" name="Cambios Pedidos" radius={[4, 4, 0, 0]} fill="#F5C842" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Lines of Code Chart ──
export function LinesChart({ data }: { data: PipelineMetricsRow[] }) {
  const weeks = aggregateByWeek(data)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1C1C2A" strokeDasharray="3 3" />
        <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: '#7E7A8E' }} />
        <YAxis tick={{ fontSize: 10, fill: '#7E7A8E' }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F0EEF5' }} />
        <Legend wrapperStyle={{ fontSize: '10px', color: '#7E7A8E' }} />
        <Bar dataKey="lines_added" name="Agregadas" radius={[4, 4, 0, 0]} fill="#06D6A0" />
        <Bar dataKey="lines_removed" name="Eliminadas" radius={[4, 4, 0, 0]} fill="#EF4444" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Issues & Errors Chart ──
export function IssuesErrorsChart({ data }: { data: PipelineMetricsRow[] }) {
  const weeks = aggregateByWeek(data)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#1C1C2A" strokeDasharray="3 3" />
        <XAxis dataKey="week_label" tick={{ fontSize: 10, fill: '#7E7A8E' }} />
        <YAxis tick={{ fontSize: 10, fill: '#7E7A8E' }} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#F0EEF5' }} />
        <Legend wrapperStyle={{ fontSize: '10px', color: '#7E7A8E' }} />
        <Bar dataKey="issues_created" name="Issues Creados" radius={[4, 4, 0, 0]} fill="#3B82F6" />
        <Bar dataKey="issues_closed" name="Issues Cerrados" radius={[4, 4, 0, 0]} fill="#06D6A0" />
        <Bar dataKey="sentry_errors" name="Sentry Errors" radius={[4, 4, 0, 0]} fill="#EF4444" />
        <Bar dataKey="health_failures" name="Health Failures" radius={[4, 4, 0, 0]} fill="#F97316" />
      </BarChart>
    </ResponsiveContainer>
  )
}
