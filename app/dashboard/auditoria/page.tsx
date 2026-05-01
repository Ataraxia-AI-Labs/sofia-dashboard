'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchAuditLogs, downloadAuditLogsCsv } from '@/lib/api/audit'
import type { AuditLogEntry } from '@/lib/api/audit'
import { useTranslations } from 'next-intl'
import { Shield, ChevronLeft, ChevronRight, Clock, Search, Download, X } from 'lucide-react'
import { timeAgo } from '@/lib/api/helpers'
import { useToast } from '@/components/ui/toast'

const PAGE_SIZE = 25

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
  org_member: 'Miembro del equipo',
  team_member: 'Miembro del equipo',
  channel: 'Canal',
  webchat_config: 'Configuración Web Chat',
  patient_embeddings: 'Huellas de pacientes',
  patient_segment: 'Segmento',
  service: 'Servicio',
  api_key: 'Clave de acceso',
  branch: 'Sede',
  reward: 'Recompensa',
  competitor: 'Competidor',
  waiting_room: 'Sala de espera',
  template: 'Plantilla',
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
  previous_role: 'rol previo',
  new_role: 'rol nuevo',
  email: 'email',
  role: 'rol',
  member: 'miembro',
  name: 'nombre',
  generated_count: 'procesados',
  n_clusters: 'tribus',
}

function formatDetails(details: unknown): string {
  if (!details) return '—'
  if (typeof details !== 'object') return String(details).slice(0, 80)
  const entries = Object.entries(details as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .slice(0, 4)
  if (!entries.length) return '—'
  return entries
    .map(([k, v]) => {
      const label = DETAIL_FIELD_LABELS[k] || k.replace(/_/g, ' ')
      let value = typeof v === 'string' ? v : JSON.stringify(v)
      if (/^[0-9a-f]{8}-/.test(value)) value = value.slice(0, 6)
      if (value.length > 28) value = value.slice(0, 26) + '…'
      if (typeof v === 'string' && v.length > 0 && (k.includes('message') || k.includes('preview'))) {
        value = `"${value}"`
      }
      return `${label}: ${value}`
    })
    .join(' · ')
}

function formatUser(log: AuditLogEntry): string {
  if (log.user_display_name && log.user_display_name.trim()) return log.user_display_name
  if (log.user_email) return log.user_email
  if (log.user_id) return log.user_id.slice(0, 8)
  return 'Sistema'
}

export default function AuditoriaPage() {
  const { orgId } = useOrg()
  const t = useTranslations('auditLogs')
  const toast = useToast()

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [queryDebounced, setQueryDebounced] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const actionsLoaded = useRef(false)

  // Debounce query to avoid hammering the backend while typing
  useEffect(() => {
    const t = setTimeout(() => {
      setQueryDebounced(query.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const buildApiParams = useCallback(() => {
    const p: Record<string, string | number | undefined> = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }
    if (actionFilter) p.action = actionFilter
    if (queryDebounced) p.q = queryDebounced
    if (dateFrom) p.from = new Date(dateFrom + 'T00:00:00').toISOString()
    if (dateTo) p.to = new Date(dateTo + 'T23:59:59').toISOString()
    return p
  }, [actionFilter, queryDebounced, dateFrom, dateTo, page])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAuditLogs(orgId, buildApiParams())
      setLogs(res.data || [])
      setTotal(res.total || 0)
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
  }, [orgId, buildApiParams])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadAuditLogsCsv(orgId, buildApiParams())
      toast.success('Exportación descargada')
    } catch {
      toast.error('No se pudo exportar. Intenta de nuevo.')
    }
    setExporting(false)
  }

  const clearFilters = () => {
    setActionFilter('')
    setQuery('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  const hasFilters = actionFilter || queryDebounced || dateFrom || dateTo
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-sm font-mono font-bold text-text-primary tracking-wide flex items-center gap-2">
            <Shield size={16} className="text-brand-purple" />
            {t('title')}
          </h1>
          <p className="text-[12px] font-body text-text-dim mt-0.5">{t('subtitle')}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[12px] font-body font-semibold hover:bg-brand-purple/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={13} className={exporting ? 'animate-pulse' : ''} />
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar acción, recurso, detalles…"
            className="w-full pl-8 pr-3 py-2 bg-surface-2/60 border border-border/30 rounded-lg text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(0) }}
          className="text-[12px] font-body bg-surface-2/60 border border-border/30 rounded-lg px-2 py-2 text-text-secondary outline-none focus:border-brand-purple/40"
        >
          <option value="">{t('allActions')}</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(0) }}
          aria-label="Desde"
          className="text-[12px] font-body bg-surface-2/60 border border-border/30 rounded-lg px-2 py-2 text-text-secondary outline-none focus:border-brand-purple/40"
        />
        <span className="text-[11px] font-body text-text-dim">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(0) }}
          aria-label="Hasta"
          className="text-[12px] font-body bg-surface-2/60 border border-border/30 rounded-lg px-2 py-2 text-text-secondary outline-none focus:border-brand-purple/40"
        />
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-2 rounded-lg bg-surface-2/40 border border-border/30 text-text-dim text-[11px] font-body hover:text-text-primary hover:border-brand-purple/30 transition-colors"
          >
            <X size={12} /> Limpiar
          </button>
        )}
        <span className="text-[11px] font-body text-text-dim ml-auto">
          {total} {total === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-surface-2/40 border-b border-border/30">
              {/* S120-A11Y-015: scope="col" */}
              <th scope="col" className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('date')}</th>
              <th scope="col" className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('action')}</th>
              <th scope="col" className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('user')}</th>
              <th scope="col" className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('resource')}</th>
              <th scope="col" className="text-left text-[11px] font-body font-medium uppercase tracking-wider text-text-dim px-3 py-2">{t('details')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-[12px] font-body text-text-dim py-8">…</td></tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-[12px] font-body text-text-dim py-10">
                  {hasFilters
                    ? 'Ningún registro coincide con estos filtros.'
                    : t('noLogs')}
                </td>
              </tr>
            ) : logs.map(log => (
              <tr
                key={log.id}
                className="border-b border-border/30 last:border-b-0 hover:bg-brand-purple/[0.04] transition-colors"
                title={log.user_agent ? `User-Agent: ${log.user_agent}${log.ip_address ? ` · IP: ${log.ip_address}` : ''}` : undefined}
              >
                <td className="px-3 py-2 text-[12px] font-body text-text-muted whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-text-dim" />
                    {timeAgo(log.created_at)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center text-[11px] font-body font-semibold text-brand-purple bg-brand-purple/10 border border-brand-purple/20 px-2 py-0.5 rounded-full">
                    {log.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-[12px] font-body text-text-secondary">
                  <span className={log.user_id ? '' : 'italic text-text-dim'}>
                    {formatUser(log)}
                  </span>
                </td>
                <td className="px-3 py-2 text-[12px] font-body text-text-muted">
                  {RESOURCE_LABELS[log.resource_type] || log.resource_type}
                  {log.resource_id && (
                    <span
                      className="ml-1 font-mono text-[10px] text-text-dim opacity-70"
                      title={log.resource_id}
                    >
                      ·{log.resource_id.slice(0, 6)}
                    </span>
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
          <span className="text-[11px] font-body text-text-dim">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1 rounded-md border border-border/30 text-text-muted hover:text-text-primary hover:border-brand-purple/30 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] font-body text-text-secondary px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1 rounded-md border border-border/30 text-text-muted hover:text-text-primary hover:border-brand-purple/30 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
