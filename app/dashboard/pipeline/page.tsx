'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchPipelineData, timeAgo } from '@/lib/api'
import type { PipelinePatient, PipelineStage } from '@/types'
import {
  Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, Repeat,
  RefreshCw, Search, ChevronUp, ChevronDown,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

// ============================================================
// STAGE CONFIG
// ============================================================

type StageDef = {
  key: PipelineStage
  label: string
  icon: React.ReactNode
  text: string
  bg: string
  dot: string
  border: string
}

const STAGES: StageDef[] = [
  { key: 'LEAD', label: 'Lead', icon: <Users size={12} />, text: 'text-text-muted', bg: 'bg-text-muted/10', dot: 'bg-text-muted', border: 'border-text-dim/20' },
  { key: 'CONTACTADO', label: 'Contactado', icon: <UserCheck size={12} />, text: 'text-status-info', bg: 'bg-status-info/10', dot: 'bg-status-info', border: 'border-status-info/25' },
  { key: 'CITA_AGENDADA', label: 'Cita Agendada', icon: <CalendarCheck size={12} />, text: 'text-brand-purple', bg: 'bg-brand-purple/10', dot: 'bg-brand-purple', border: 'border-brand-purple/25' },
  { key: 'CITA_COMPLETADA', label: 'Completada', icon: <CheckCircle2 size={12} />, text: 'text-brand-cyan', bg: 'bg-brand-cyan/10', dot: 'bg-brand-cyan', border: 'border-brand-cyan/25' },
  { key: 'PAGADO', label: 'Pagado', icon: <DollarSign size={12} />, text: 'text-status-success', bg: 'bg-status-success/10', dot: 'bg-status-success', border: 'border-status-success/25' },
  { key: 'RECURRENTE', label: 'Recurrente', icon: <Repeat size={12} />, text: 'text-brand-gold', bg: 'bg-brand-gold/10', dot: 'bg-brand-gold', border: 'border-brand-gold/25' },
]

const STAGE_INDEX: Record<PipelineStage, number> = {
  LEAD: 0, CONTACTADO: 1, CITA_AGENDADA: 2, CITA_COMPLETADA: 3, PAGADO: 4, RECURRENTE: 5,
}

function formatPhoneTail(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return phone
  return `··· ${digits.slice(-4)}`
}

// Heuristic "próxima acción" derived from stage. No fake data — if backend
// does not tell us what to do next, we say "SofIA monitoreando" instead.
function nextActionFor(p: PipelinePatient): string {
  switch (p.stage) {
    case 'LEAD': return 'Primer contacto'
    case 'CONTACTADO': return 'Agendar cita'
    case 'CITA_AGENDADA': return 'Recordatorio 24h'
    case 'CITA_COMPLETADA': return p.has_paid ? 'Follow-up' : 'Cobrar'
    case 'PAGADO': return 'Reactivar en 30d'
    case 'RECURRENTE': return 'SofIA monitoreando'
    default: return '—'
  }
}

type SortKey = 'name' | 'stage' | 'updated' | 'msg'
type SortDir = 'asc' | 'desc'

// ============================================================
// PAGE
// ============================================================

export default function PipelinePage() {
  const { orgId, branchId } = useOrg()
  const [patients, setPatients] = useState<PipelinePatient[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'ALL'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const t = useTranslations('pipeline')
  const tCommon = useTranslations('common')

  const loadPipeline = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPipelineData(orgId, branchId)
      setPatients(data)
    } catch {
      // Pipeline load failed — UI will show empty state
    }
    setLoading(false)
  }, [orgId, branchId])

  useEffect(() => { loadPipeline() }, [loadPipeline])

  const totalPatients = patients.length

  // Group by stage for summary cards
  const countByStage = useMemo(() => {
    const counts: Record<PipelineStage, number> = {
      LEAD: 0, CONTACTADO: 0, CITA_AGENDADA: 0, CITA_COMPLETADA: 0, PAGADO: 0, RECURRENTE: 0,
    }
    for (const p of patients) {
      if (counts[p.stage] !== undefined) counts[p.stage]++
    }
    return counts
  }, [patients])

  // Filter + sort
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let filtered = patients
    if (q) {
      filtered = filtered.filter(p => {
        const haystack = `${p.full_name || ''} ${p.phone || ''} ${p.email || ''} ${p.service_interest || ''}`.toLowerCase()
        return haystack.includes(q)
      })
    }
    if (stageFilter !== 'ALL') {
      filtered = filtered.filter(p => p.stage === stageFilter)
    }
    const sorted = [...filtered].sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      switch (sortKey) {
        case 'name':
          av = (a.full_name || '').toLowerCase(); bv = (b.full_name || '').toLowerCase()
          break
        case 'stage':
          av = STAGE_INDEX[a.stage] ?? 0; bv = STAGE_INDEX[b.stage] ?? 0
          break
        case 'updated':
          av = new Date(a.created_at).getTime() || 0; bv = new Date(b.created_at).getTime() || 0
          break
        case 'msg':
          av = a.interaction_count || 0; bv = b.interaction_count || 0
          break
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [patients, query, stageFilter, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir(k === 'name' || k === 'stage' ? 'asc' : 'desc') }
  }

  const SortIndicator = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="inline-block w-2.5" />
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="text-brand-purple inline" />
      : <ChevronDown size={10} className="text-brand-purple inline" />
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[11px] font-body mt-0.5">
            {totalPatients} pacientes · {STAGES.filter(s => countByStage[s.key] > 0).length} de {STAGES.length} etapas con actividad
          </p>
        </div>
        <button
          onClick={loadPipeline}
          aria-label={tCommon('refresh')}
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border/40 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const count = countByStage[stage.key]
          const pct = totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0
          const isActive = stageFilter === stage.key
          return (
            <button
              key={stage.key}
              onClick={() => setStageFilter(isActive ? 'ALL' : stage.key)}
              className={`glass-card p-3.5 border transition-all text-left ${
                isActive ? `${stage.border} bg-opacity-100` : 'border-border/30 hover:border-border/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-md ${stage.bg} flex items-center justify-center ${stage.text}`}>
                  {stage.icon}
                </div>
                <span className={`text-sm font-bold font-mono ${stage.text}`}>{count}</span>
              </div>
              <p className="text-[12px] font-body font-semibold text-text-primary truncate">{stage.label}</p>
              <p className="text-[11px] font-body text-text-dim">{pct}% del total</p>
            </button>
          )
        })}
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono, email, servicio…"
            className="w-full pl-8 pr-3 py-2 bg-surface-2/60 border border-border/30 rounded-lg text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
          />
        </div>
        {stageFilter !== 'ALL' && (
          <button
            onClick={() => setStageFilter('ALL')}
            className="px-3 py-1.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[11px] font-body font-semibold hover:bg-brand-purple/15 transition-colors"
          >
            Etapa: {STAGES.find(s => s.key === stageFilter)?.label} · Quitar
          </button>
        )}
        <span className="text-[11px] font-body text-text-dim ml-auto">
          {rows.length === totalPatients
            ? `${totalPatients} pacientes`
            : `${rows.length} de ${totalPatients} pacientes`}
        </span>
      </div>

      {/* TABLE */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.1)' }}
      >
        <table className="w-full">
          <thead className="bg-surface-2/40">
            <tr className="text-[10px] font-mono uppercase tracking-widest text-text-dim">
              <th scope="col" className="text-left px-4 py-2.5 cursor-pointer select-none hover:text-text-muted" onClick={() => toggleSort('name')}>
                Paciente <SortIndicator k="name" />
              </th>
              <th scope="col" className="text-left px-4 py-2.5 cursor-pointer select-none hover:text-text-muted" onClick={() => toggleSort('stage')}>
                Etapa <SortIndicator k="stage" />
              </th>
              <th scope="col" className="text-right px-4 py-2.5 cursor-pointer select-none hover:text-text-muted hidden sm:table-cell" onClick={() => toggleSort('msg')}>
                Mensajes <SortIndicator k="msg" />
              </th>
              <th scope="col" className="text-right px-4 py-2.5 cursor-pointer select-none hover:text-text-muted" onClick={() => toggleSort('updated')}>
                Creado <SortIndicator k="updated" />
              </th>
              <th scope="col" className="text-left px-4 py-2.5 hidden lg:table-cell">Próxima acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && patients.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border/30">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 bg-surface-3/60 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-[12px] font-body text-text-dim">
                    {query || stageFilter !== 'ALL'
                      ? 'Ningún paciente coincide con los filtros actuales.'
                      : 'Aún no hay pacientes en el flujo. Cuando lleguen, aparecerán aquí.'}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const stage = STAGES.find(s => s.key === p.stage) || STAGES[0]
                return (
                  <tr
                    key={p.id}
                    className="border-t border-border/30 hover:bg-surface-2/30 transition-colors"
                  >
                    {/* Paciente */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-md ${stage.bg} flex items-center justify-center ${stage.text} text-[11px] font-body font-bold flex-shrink-0`}>
                          {p.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-body font-semibold text-text-primary truncate">
                            {p.full_name || 'Sin nombre'}
                          </p>
                          <p className="text-[10.5px] font-body font-mono text-text-dim">
                            {formatPhoneTail(p.phone)}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Etapa */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-body font-semibold ${stage.bg} ${stage.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                        {stage.label}
                      </span>
                    </td>
                    {/* Mensajes */}
                    <td className="px-4 py-3 text-right text-[11.5px] font-body font-mono text-text-muted hidden sm:table-cell">
                      {p.interaction_count > 0 ? p.interaction_count : <span className="text-text-dim">0</span>}
                    </td>
                    {/* Creado */}
                    <td className="px-4 py-3 text-right text-[11px] font-body text-text-dim whitespace-nowrap">
                      {timeAgo(p.created_at)}
                    </td>
                    {/* Próxima acción */}
                    <td className="px-4 py-3 text-[11.5px] font-body text-text-muted hidden lg:table-cell">
                      {nextActionFor(p)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
