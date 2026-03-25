'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchAuditLogs } from '@/lib/api/audit'
import type { AuditLogEntry } from '@/lib/api/audit'
import { useTranslations } from 'next-intl'
import { Shield, ChevronLeft, ChevronRight, Filter, Clock } from 'lucide-react'
import { timeAgo } from '@/lib/api/helpers'

const PAGE_SIZE = 25

export default function AuditoriaPage() {
  const { orgId, role } = useOrg()
  const t = useTranslations('auditLogs')

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [actions, setActions] = useState<string[]>([])

  const actionsLoaded = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAuditLogs(orgId, {
        action: actionFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      setLogs(res.data || [])
      setTotal(res.total || 0)
      // Extract unique actions for filter (only once)
      if (!actionsLoaded.current && res.data?.length) {
        const unique = [...new Set(res.data.map(l => l.action))]
        setActions(unique)
        actionsLoaded.current = true
      }
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [orgId, page, actionFilter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Shield size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[10px] font-mono text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(0) }}
            className="text-[10px] font-mono bg-surface-2 border border-border rounded px-2 py-1 text-text-secondary"
          >
            <option value="">{t('allActions')}</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('date')}</th>
              <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('action')}</th>
              <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('user')}</th>
              <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('resource')}</th>
              <th className="text-left text-[9px] font-mono font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('details')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-[10px] font-mono text-text-dim py-8">...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-[10px] font-mono text-text-dim py-8">{t('noLogs')}</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                <td className="px-3 py-2 text-[10px] font-mono text-text-muted whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-text-dim" />
                    {timeAgo(log.created_at)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-mono font-semibold text-brand-purple bg-brand-purple/8 px-1.5 py-0.5 rounded">
                    {log.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-[10px] font-mono text-text-secondary">{log.user_email || log.user_id?.slice(0, 8) || '—'}</td>
                <td className="px-3 py-2 text-[10px] font-mono text-text-muted">
                  {log.resource_type}{log.resource_id ? ` #${log.resource_id.slice(0, 8)}` : ''}
                </td>
                <td className="px-3 py-2 text-[10px] font-mono text-text-dim max-w-[200px] truncate">
                  {JSON.stringify(log.details).slice(0, 80)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-text-dim">{total} registros</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1 rounded border border-border text-text-muted hover:text-text-primary disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-mono text-text-secondary px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1 rounded border border-border text-text-muted hover:text-text-primary disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
