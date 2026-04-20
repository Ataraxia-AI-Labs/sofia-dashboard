'use client'

import type { ConsoleArtifact } from '@/lib/api/console'
import { formatCOP } from '@/lib/api/helpers'
import { TrendingDown, TrendingUp } from 'lucide-react'

/**
 * Renders a ConsoleArtifact returned by the SofIA Console agent.
 * Each artifact type is a focused, compact visual block designed to live
 * inside a SofIA message bubble.
 */
export function ArtifactRenderer({ artifact }: { artifact: ConsoleArtifact }) {
  switch (artifact.type) {
    case 'metric_tiles':
      return <MetricTilesArtifact artifact={artifact} />
    case 'table':
      return <TableArtifact artifact={artifact} />
    case 'funnel':
      return <FunnelArtifact artifact={artifact} />
    case 'list':
      return <ListArtifact artifact={artifact} />
    case 'note':
    default:
      return <NoteArtifact artifact={artifact} />
  }
}

// ====================================================================
// Common chrome
// ====================================================================

function ArtifactShell({
  title,
  type,
  children,
}: {
  title?: string
  type: string
  children: React.ReactNode
}) {
  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/6 via-transparent to-brand-purple/8 pointer-events-none" />
      <div
        className="relative bg-surface/55 backdrop-blur-sm rounded-xl p-3.5"
        style={{
          boxShadow:
            '0 0 0 1px rgba(139,92,246,0.12), 0 6px 24px -8px rgba(139,92,246,0.2), 0 1px 0 0 rgba(255,255,255,0.03) inset',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-brand-purple" />
            <div className="text-[10px] font-body font-semibold uppercase tracking-[0.14em] text-text-dim">
              {type}
            </div>
          </div>
        </div>
        {title && (
          <div className="text-[13.5px] font-body font-medium text-text-primary mb-2">
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ====================================================================
// Metric tiles
// ====================================================================

interface MetricTile {
  label: string
  value: number | string
  sub?: string
  format?: 'currency' | 'number' | 'percent'
}

function MetricTilesArtifact({ artifact }: { artifact: ConsoleArtifact }) {
  const tiles = (artifact.data as MetricTile[]) || []
  if (!Array.isArray(tiles) || tiles.length === 0) return null
  return (
    <ArtifactShell title={artifact.title} type="métricas">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tiles.map((t, i) => (
          <div
            key={i}
            className="rounded-lg p-2.5 bg-surface/40"
            style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.08)' }}
          >
            <div className="text-[10px] font-body text-text-dim uppercase tracking-[0.12em] truncate">
              {t.label}
            </div>
            <div className="text-[17px] font-mono font-semibold text-text-primary tabular-nums mt-1 leading-none">
              {formatTileValue(t.value, t.format)}
            </div>
            {t.sub && (
              <div className="text-[10px] font-body text-text-dim mt-1 truncate">{t.sub}</div>
            )}
          </div>
        ))}
      </div>
    </ArtifactShell>
  )
}

// ====================================================================
// Table
// ====================================================================

interface TableColumn {
  key: string
  label: string
  format?: 'datetime' | 'currency' | 'status'
}

function TableArtifact({ artifact }: { artifact: ConsoleArtifact }) {
  const d = artifact.data as { columns: TableColumn[]; rows: Record<string, unknown>[] } | undefined
  if (!d || !d.rows || d.rows.length === 0) {
    return (
      <ArtifactShell title={artifact.title} type="tabla">
        <div className="text-[12px] font-body text-text-dim italic">Sin registros para mostrar.</div>
      </ArtifactShell>
    )
  }
  return (
    <ArtifactShell title={artifact.title} type="tabla">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] font-body">
          <thead>
            <tr className="text-text-dim">
              {d.columns.map(c => (
                <th key={c.key} className="text-left py-1.5 pr-3 font-body font-semibold uppercase text-[10px] tracking-wider">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.rows.map((row, i) => (
              <tr key={i} className="border-t border-brand-purple/8">
                {d.columns.map(c => (
                  <td key={c.key} className="py-1.5 pr-3 text-text-primary">
                    {formatCell(row[c.key], c.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ArtifactShell>
  )
}

// ====================================================================
// Funnel
// ====================================================================

function FunnelArtifact({ artifact }: { artifact: ConsoleArtifact }) {
  const d = artifact.data as {
    steps: { label: string; value: number }[]
    conversion_rates?: Record<string, number>
  } | undefined
  if (!d || !d.steps || d.steps.length === 0) return null
  const max = Math.max(...d.steps.map(s => s.value)) || 1
  return (
    <ArtifactShell title={artifact.title} type="funnel">
      <div className="space-y-2">
        {d.steps.map((s, i) => {
          const pct = Math.max(4, (s.value / max) * 100)
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-[11px] font-body mb-1">
                <span className="text-text-muted">{s.label}</span>
                <span className="text-text-primary font-mono tabular-nums font-semibold">
                  {s.value.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, hsl(${270 + i * 8} 60% ${70 - i * 8}%), #8b5cf6)`,
                    boxShadow: '0 0 6px rgba(139,92,246,0.4)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {d.conversion_rates && Object.keys(d.conversion_rates).length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-brand-purple/8 flex flex-wrap gap-3 text-[11px] font-body text-text-muted">
          {Object.entries(d.conversion_rates).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1">
              {v > 20 ? <TrendingUp size={10} className="text-status-success" /> : <TrendingDown size={10} className="text-text-dim" />}
              {formatRateKey(k)}: <span className="text-text-primary font-mono tabular-nums">{v}%</span>
            </span>
          ))}
        </div>
      )}
    </ArtifactShell>
  )
}

// ====================================================================
// List
// ====================================================================

function ListArtifact({ artifact }: { artifact: ConsoleArtifact }) {
  const d = artifact.data as {
    items: Record<string, unknown>[]
    by_type?: Record<string, number>
    total_estimated_value_cop?: number
  } | undefined
  if (!d || !d.items || d.items.length === 0) {
    return (
      <ArtifactShell title={artifact.title} type="lista">
        <div className="text-[12px] font-body text-text-dim italic">Sin resultados.</div>
      </ArtifactShell>
    )
  }
  return (
    <ArtifactShell title={artifact.title} type="lista">
      {d.total_estimated_value_cop != null && d.total_estimated_value_cop > 0 && (
        <div className="text-[11px] font-body text-text-dim mb-2">
          Valor estimado total: <span className="text-brand-purple font-mono tabular-nums">{formatCOP(d.total_estimated_value_cop)}</span>
        </div>
      )}
      <div className="space-y-1.5">
        {d.items.slice(0, 8).map((item, i) => {
          const type = String(item.opportunity_type || item.type || '—')
          const val = Number(item.estimated_value_cop || 0)
          const reason = String(item.reason || '')
          return (
            <div
              key={i}
              className="rounded-lg px-2.5 py-1.5 bg-surface/40 flex items-center justify-between gap-3"
              style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.08)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-body text-text-primary truncate">
                  {reason || type}
                </div>
                <div className="text-[10px] font-body text-text-dim uppercase tracking-wider mt-0.5">
                  {type}
                </div>
              </div>
              {val > 0 && (
                <div className="flex-shrink-0 text-[11.5px] font-mono font-semibold text-brand-purple tabular-nums">
                  {formatCOP(val)}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {d.items.length > 8 && (
        <div className="text-[11px] font-body text-text-dim mt-2 text-center">
          +{d.items.length - 8} más
        </div>
      )}
    </ArtifactShell>
  )
}

// ====================================================================
// Note (fallback)
// ====================================================================

function NoteArtifact({ artifact }: { artifact: ConsoleArtifact }) {
  return (
    <ArtifactShell title={artifact.title} type="nota">
      <div className="text-[12px] font-body text-text-muted leading-relaxed">
        {typeof artifact.data === 'string'
          ? artifact.data
          : <pre className="font-mono text-[11px] text-text-dim whitespace-pre-wrap break-words">{JSON.stringify(artifact.data, null, 2).slice(0, 400)}</pre>}
      </div>
    </ArtifactShell>
  )
}

// ====================================================================
// Formatters
// ====================================================================

function formatTileValue(v: unknown, fmt?: string): string {
  if (v == null) return '—'
  if (fmt === 'currency') return formatCOP(Number(v))
  if (fmt === 'percent') return `${Number(v).toFixed(1)}%`
  if (typeof v === 'number') return v.toLocaleString('es-CO')
  return String(v)
}

function formatCell(v: unknown, fmt?: string): string {
  if (v == null) return '—'
  if (fmt === 'datetime' && typeof v === 'string') {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }
  }
  if (fmt === 'currency') return formatCOP(Number(v))
  if (fmt === 'status') return String(v).replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 60)
  return String(v)
}

function formatRateKey(k: string): string {
  const map: Record<string, string> = {
    message_to_patient: 'Msj→Paciente',
    patient_to_appointment: 'Paciente→Cita',
    appointment_to_completed: 'Cita→Completada',
  }
  return map[k] || k.replace(/_/g, ' ')
}
