'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  fetchAuditLogs,
  fetchAllOrganizations,
  type AuditLogEntry,
  type AdminOrgRow,
} from '@/lib/admin-api'
import * as Sentry from '@sentry/nextjs'
import {
  Shield, RefreshCw, ChevronLeft, ChevronRight,
  Search, Filter, Calendar, User, Tag
} from 'lucide-react'

// ─── Action color coding ──────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  create: 'text-status-success bg-status-success/10 border-status-success/20',
  insert: 'text-status-success bg-status-success/10 border-status-success/20',
  update: 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20',
  patch:  'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20',
  delete: 'text-status-danger bg-status-danger/10 border-status-danger/20',
  remove: 'text-status-danger bg-status-danger/10 border-status-danger/20',
}

function actionColor(action: string): string {
  const key = action.toLowerCase()
  for (const [prefix, cls] of Object.entries(ACTION_COLORS)) {
    if (key.startsWith(prefix)) return cls
  }
  return 'text-text-muted bg-surface-3 border-border'
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-surface-3 rounded animate-pulse" style={{ width: `${60 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────

function AuditLogsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [orgs, setOrgs] = useState<AdminOrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters from URL
  const page = Number(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''
  const action = searchParams.get('action') || ''
  const orgId = searchParams.get('org_id') || ''
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo = searchParams.get('date_to') || ''

  const LIMIT = 50
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // ── Set URL params ──
  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // reset to page 1 on filter change
    router.push(`/admin/audit-logs?${params.toString()}`)
  }, [router, searchParams])

  const setPage = useCallback((p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/admin/audit-logs?${params.toString()}`)
  }, [router, searchParams])

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchAuditLogs({ page, limit: LIMIT, action: action || undefined, org_id: orgId || undefined, search: search || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined })
      setLogs(result.data)
      setTotal(result.total)
    } catch (err) {
      Sentry.captureException(err)
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, action, orgId, search, dateFrom, dateTo])

  useEffect(() => { loadData() }, [loadData])

  // Load org list once for the org filter selector
  useEffect(() => {
    fetchAllOrganizations()
      .then(setOrgs)
      .catch(err => Sentry.captureException(err))
  }, [])

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Audit Log</h2>
          <p className="text-text-dim text-xs mt-0.5">
            Registro de todas las acciones realizadas en el sistema
          </p>
        </div>
        <button
          onClick={loadData}
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-brand-purple" />
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar usuario o recurso…"
              defaultValue={search}
              onKeyDown={e => { if (e.key === 'Enter') setParam('search', (e.target as HTMLInputElement).value) }}
              onBlur={e => setParam('search', e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-surface-2 border border-border rounded-lg text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/50 transition-colors"
            />
          </div>

          {/* Action type */}
          <div className="relative">
            <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <select
              value={action}
              onChange={e => setParam('action', e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand-purple/50 transition-colors appearance-none"
            >
              <option value="">Todas las acciones</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          {/* Org selector */}
          <div className="relative">
            <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <select
              value={orgId}
              onChange={e => setParam('org_id', e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand-purple/50 transition-colors appearance-none"
            >
              <option value="">Todas las orgs</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setParam('date_from', e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand-purple/50 transition-colors"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={e => setParam('date_to', e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-surface-2 border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand-purple/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield size={14} className="text-brand-purple" />
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Eventos de Auditoría
            </h3>
          </div>
          {!loading && (
            <span className="text-[10px] text-text-dim">
              {total.toLocaleString()} eventos · página {page} de {totalPages}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Usuario</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Acción</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Recurso</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Org</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-text-dim text-sm">
                    No se encontraron eventos de auditoría
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <>
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-surface-3/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap font-mono">
                        {new Date(log.created_at).toLocaleString('es-CO', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                          hour12: false,
                        })}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-text-dim flex-shrink-0" />
                          <span className="text-xs text-text-primary truncate max-w-[160px]" title={log.user_email ?? log.user_id ?? '—'}>
                            {log.user_email ?? log.user_id ?? '—'}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-text-primary">
                          <span className="font-medium">{log.resource_type}</span>
                          {log.resource_id && (
                            <span className="text-text-dim font-mono ml-1 text-[10px]">
                              #{log.resource_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Org */}
                      <td className="px-4 py-3 text-xs text-text-muted truncate max-w-[140px]">
                        {log.org_name ?? log.organization_id?.slice(0, 8) ?? '—'}
                      </td>

                      {/* Details toggle */}
                      <td className="px-4 py-3 text-[10px] text-brand-cyan hover:underline">
                        {log.details ? (expandedId === log.id ? 'Ocultar ▲' : 'Ver ▼') : '—'}
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {expandedId === log.id && log.details && (
                      <tr key={`${log.id}-details`} className="border-b border-border/50 bg-surface-3/30">
                        <td colSpan={6} className="px-6 py-3">
                          <pre className="text-[10px] font-mono text-text-muted whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between">
            <span className="text-[10px] text-text-dim">
              Mostrando {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} />
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                let p: number
                if (totalPages <= 7) {
                  p = i + 1
                } else if (page <= 4) {
                  p = i + 1
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i
                } else {
                  p = page - 3 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-[10px] font-semibold border transition-colors ${
                      p === page
                        ? 'bg-brand-purple/20 border-brand-purple/30 text-brand-purple'
                        : 'bg-surface-2 border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page export (wraps with Suspense for useSearchParams) ────────────────────

export default function AuditLogsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1400px] space-y-5">
        <div className="h-8 w-48 bg-surface-3 rounded animate-pulse" />
        <div className="glass-card p-4 h-20 animate-pulse" />
        <div className="glass-card h-96 animate-pulse" />
      </div>
    }>
      <AuditLogsInner />
    </Suspense>
  )
}
