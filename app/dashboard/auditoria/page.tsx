'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchAuditLogs } from '@/lib/api/audit'
import type { AuditLogEntry } from '@/lib/api/audit'
import { useTranslations } from 'next-intl'
import { Shield, ChevronLeft, ChevronRight, Filter, Clock } from 'lucide-react'
import { timeAgo } from '@/lib/api/helpers'

const PAGE_SIZE = 25

// Map backend resource_type keys to human-readable Spanish labels so the
// CEO view reads like a timeline instead of a debug log.
const RESOURCE_LABELS: Record<string, string> = {
  webchat_message: 'Mensaje Web Chat',
  whatsapp_message: 'Mensaje WhatsApp',
  instagram_message: 'Mensaje Instagram',
  messenger_message: 'Mensaje Messenger',
  voice_call: 'Llamada de voz',
  appointment: 'Cita',
  patient: 'Paciente',
  payment: 'Pago',
  campaign: 'Campaña',
  referral: 'Referido',
  organization: 'Organización',
  user: 'Usuario',
  takeover: 'Toma de control',
  team_member: 'Miembro del equipo',
  channel: 'Canal',
  webchat_config: 'Configuración Web Chat',
}

const DETAIL_FIELD_LABELS: Record<string, string> = {
  session_id: 'sesión',
  patient_id: 'paciente',
  message_preview: 'mensaje',
  phone_tail: 'teléfono',
  service_name: 'servicio',
  reason: 'motivo',
  new_start_time: 'nueva fecha',
  template_key: 'plantilla',
  branch_id: 'sede',
}

/**
 * Render audit log details as a readable sentence instead of raw JSON.
 * Example:
 *   {"patient_id":"abc-def-123","message_preview":"Hola"}
 *   -> paciente: abc-de · mensaje: "Hola"
 */
function formatDetails(details: unknown): string {
  if (!details) return '—'
  if (typeof details !== 'object') return String(details).slice(0, 80)
  const entries = Object.entries(details as Record<string, unknown>)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .slice(0, 4)
  if (!entries.length) return '—'
  return entries
    .map(([k, v]) => {
      const label = DETAIL_FIELD_LABELS[k] || k.replace(/_/g, ' ')
      let value = typeof v === 'string' ? v : JSON.stringify(v)
      // Truncate long IDs to first 6 chars for readability
      if (/^[0-9a-f]{8}-/.test(value)) value = value.slice(0, 6)
      if (value.length > 28) value = value.slice(0, 26) + '…'
      if (typeof v === 'string' && v.length > 0 && (k.includes('message') || k.includes('preview'))) {
        value = `"${value}"`
      }
      return `${label}: ${value}`
    })
    .join(' · ')
}

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
          <p className="text-[12px] font-body text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(0) }}
            className="text-[12px] font-body bg-surface-2 border border-border rounded px-2 py-1 text-text-secondary"
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
              <th className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('date')}</th>
              <th className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('action')}</th>
              <th className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('user')}</th>
              <th className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('resource')}</th>
              <th className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('details')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-[12px] font-body text-text-dim py-8">...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-[12px] font-body text-text-dim py-8">{t('noLogs')}</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                <td className="px-3 py-2 text-[12px] font-body text-text-muted whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-text-dim" />
                    {timeAgo(log.created_at)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-[12px] font-body font-semibold text-brand-purple bg-brand-purple/8 px-1.5 py-0.5 rounded">
                    {log.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-[12px] font-body text-text-secondary">{log.user_email || (log.user_id ? <span className="font-mono text-[11px] text-text-muted">{log.user_id.slice(0, 6)}</span> : '—')}</td>
                <td className="px-3 py-2 text-[12px] font-body text-text-muted">
                  {RESOURCE_LABELS[log.resource_type] || log.resource_type}
                  {log.resource_id && (
                    <span className="ml-1 font-mono text-[10px] text-text-dim opacity-70" title={log.resource_id}>·{log.resource_id.slice(0, 6)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[12px] font-body text-text-dim max-w-[280px] truncate" title={JSON.stringify(log.details)}>
                  {formatDetails(log.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-body text-text-dim">{total} registros</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1 rounded border border-border text-text-muted hover:text-text-primary disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] font-body text-text-secondary px-2">{page + 1} / {totalPages}</span>
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
