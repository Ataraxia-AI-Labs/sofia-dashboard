'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchPipelineData, timeAgo } from '@/lib/api'
import type { PipelinePatient, PipelineStage } from '@/types'
import {
  Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, Repeat,
  RefreshCw, ChevronRight,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

// Display helper — shows last 4 digits of phone when column is narrow
function formatPhoneShort(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return phone
  return `··· ${digits.slice(-4)}`
}

// ============================================================
// STAGE CONFIG
// ============================================================

const STAGES: {
  key: PipelineStage
  label: string
  icon: React.ReactNode
  gradient: string
  border: string
  bg: string
  text: string
  dot: string
}[] = [
  {
    key: 'LEAD',
    label: 'Lead',
    icon: <Users size={14} />,
    gradient: 'from-text-muted to-text-dim',
    border: 'border-text-dim/30',
    bg: 'bg-text-muted/5',
    text: 'text-text-muted',
    dot: 'bg-text-muted',
  },
  {
    key: 'CONTACTADO',
    label: 'Contactado',
    icon: <UserCheck size={14} />,
    gradient: 'from-brand-purple to-brand-purple-dark',
    border: 'border-status-info/30',
    bg: 'bg-status-info/5',
    text: 'text-status-info',
    dot: 'bg-status-info',
  },
  {
    key: 'CITA_AGENDADA',
    label: 'Cita Agendada',
    icon: <CalendarCheck size={14} />,
    gradient: 'from-brand-purple to-brand-purple-dark',
    border: 'border-brand-purple/30',
    bg: 'bg-brand-purple/5',
    text: 'text-brand-purple',
    dot: 'bg-brand-purple',
  },
  {
    key: 'CITA_COMPLETADA',
    label: 'Completada',
    icon: <CheckCircle2 size={14} />,
    gradient: 'from-brand-cyan to-brand-cyan',
    border: 'border-brand-cyan/30',
    bg: 'bg-brand-cyan/5',
    text: 'text-brand-cyan',
    dot: 'bg-brand-cyan',
  },
  {
    key: 'PAGADO',
    label: 'Pagado',
    icon: <DollarSign size={14} />,
    gradient: 'from-status-success to-status-success',
    border: 'border-status-success/30',
    bg: 'bg-status-success/5',
    text: 'text-status-success',
    dot: 'bg-status-success',
  },
  {
    key: 'RECURRENTE',
    label: 'Recurrente',
    icon: <Repeat size={14} />,
    gradient: 'from-brand-gold to-brand-gold',
    border: 'border-brand-gold/30',
    bg: 'bg-brand-gold/5',
    text: 'text-brand-gold',
    dot: 'bg-brand-gold',
  },
]

// ============================================================
// PAGE
// ============================================================

export default function PipelinePage() {
  const { orgId, branchId } = useOrg()
  const [patients, setPatients] = useState<PipelinePatient[]>([])
  const [loading, setLoading] = useState(true)
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

  // Group patients by stage
  const grouped: Record<PipelineStage, PipelinePatient[]> = {
    LEAD: [],
    CONTACTADO: [],
    CITA_AGENDADA: [],
    CITA_COMPLETADA: [],
    PAGADO: [],
    RECURRENTE: [],
  }
  for (const p of patients) {
    if (grouped[p.stage]) {
      grouped[p.stage].push(p)
    }
  }

  const totalPatients = patients.length

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[11px] font-body mt-0.5">
            {totalPatients} pacientes en tu clínica · {STAGES.filter(s => grouped[s.key].length > 0).length} de {STAGES.length} etapas con actividad
          </p>
        </div>
        <button
          onClick={loadPipeline}
          aria-label={tCommon('refresh')}
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const count = grouped[stage.key].length
          const pct = totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0
          return (
            <div key={stage.key} className={`glass-card p-3.5 ${stage.border} border`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center ${stage.text}`}>
                  {stage.icon}
                </div>
                <span className={`text-sm font-bold font-mono ${stage.text}`}>{count}</span>
              </div>
              <p className="text-[12px] font-body font-semibold text-text-primary truncate">{stage.label}</p>
              <p className="text-[11px] font-body text-text-dim">{pct}% del total</p>
            </div>
          )
        })}
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="h-5 w-24 bg-surface-3 rounded animate-pulse" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-20 bg-surface-3 rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start">
          {STAGES.map((stage) => (
            <PipelineColumn
              key={stage.key}
              stage={stage}
              patients={grouped[stage.key]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// PIPELINE COLUMN
// ============================================================

function PipelineColumn({
  stage,
  patients,
}: {
  stage: typeof STAGES[number]
  patients: PipelinePatient[]
}) {
  const [expanded, setExpanded] = useState(true)
  const showCount = expanded ? patients.length : Math.min(patients.length, 3)

  return (
    <div className={`glass-card overflow-hidden ${stage.border} border`}>
      {/* Column header */}
      <div className={`px-3.5 py-3 ${stage.bg} border-b ${stage.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={stage.text}>{stage.icon}</span>
            <span className="text-[12px] font-body font-semibold text-text-primary">{stage.label}</span>
          </div>
          <span className={`text-[10px] font-bold font-body px-1.5 py-0.5 rounded-md ${stage.bg} ${stage.text}`}>
            {patients.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[520px] overflow-y-auto">
        {patients.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[12px] font-body text-text-dim">Sin pacientes</p>
          </div>
        ) : (
          <>
            {patients.slice(0, showCount).map((p) => (
              <PatientCard key={p.id} patient={p} stage={stage} />
            ))}
            {patients.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full py-1.5 text-[10px] font-semibold text-text-dim hover:text-text-muted transition-colors flex items-center justify-center gap-1"
              >
                {expanded ? 'Mostrar menos' : `Ver ${patients.length - 3} más`}
                <ChevronRight size={10} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// PATIENT CARD
// ============================================================

function PatientCard({
  patient,
  stage,
}: {
  patient: PipelinePatient
  stage: typeof STAGES[number]
}) {
  const hasService = patient.service_interest && patient.service_interest !== 'Por identificar'
  return (
    <div className="bg-surface-3/40 hover:bg-surface-3 rounded-lg px-2.5 py-2 transition-colors group cursor-default">
      {/* Top row: avatar + name */}
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center ${stage.text} text-[11px] font-body font-bold flex-shrink-0`}>
          {patient.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-[12px] font-body font-semibold text-text-primary truncate flex-1 min-w-0 group-hover:text-brand-purple-light transition-colors">
          {patient.full_name || 'Sin nombre'}
        </span>
      </div>

      {/* Second row: service (if any) */}
      {hasService && (
        <p className="text-[10.5px] font-body text-text-muted truncate mt-1.5">
          {patient.service_interest}
        </p>
      )}

      {/* Bottom row: phone tail · timestamp · msgs (one line, no wrap) */}
      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-body text-text-dim whitespace-nowrap">
        <span className="font-mono">{formatPhoneShort(patient.phone)}</span>
        <span className="opacity-40">·</span>
        <span>{timeAgo(patient.created_at)}</span>
        {patient.interaction_count > 0 && (
          <>
            <span className="opacity-40">·</span>
            <span>{patient.interaction_count} msg</span>
          </>
        )}
      </div>
    </div>
  )
}
