'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchPipelineData, timeAgo } from '@/lib/api'
import type { PipelinePatient, PipelineStage } from '@/types'
import {
  Users, UserCheck, CalendarCheck, CheckCircle2, DollarSign, Repeat,
  RefreshCw, Phone, Star, ChevronRight, TrendingUp, ArrowRight
} from 'lucide-react'
import { useTranslations } from 'next-intl'

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
    gradient: 'from-status-info to-blue-600',
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
    gradient: 'from-brand-cyan to-emerald-600',
    border: 'border-brand-cyan/30',
    bg: 'bg-brand-cyan/5',
    text: 'text-brand-cyan',
    dot: 'bg-brand-cyan',
  },
  {
    key: 'PAGADO',
    label: 'Pagado',
    icon: <DollarSign size={14} />,
    gradient: 'from-status-success to-emerald-600',
    border: 'border-status-success/30',
    bg: 'bg-status-success/5',
    text: 'text-status-success',
    dot: 'bg-status-success',
  },
  {
    key: 'RECURRENTE',
    label: 'Recurrente',
    icon: <Repeat size={14} />,
    gradient: 'from-brand-gold to-amber-600',
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
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-xs mt-0.5">
            {totalPatients} pacientes en {STAGES.filter(s => grouped[s.key].length > 0).length} etapas
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
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stage.gradient} flex items-center justify-center text-white`}>
                  {stage.icon}
                </div>
                <span className={`text-lg font-bold font-mono ${stage.text}`}>{count}</span>
              </div>
              <p className="text-[11px] font-semibold text-text-primary truncate">{stage.label}</p>
              <p className="text-[10px] text-text-dim">{pct}% del total</p>
            </div>
          )
        })}
      </div>

      {/* CONVERSION FLOW */}
      {totalPatients > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-brand-purple" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Flujo de Conversión</span>
          </div>
          <div className="flex items-center justify-between">
            {STAGES.map((stage, i) => {
              const count = grouped[stage.key].length
              const pct = totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0
              const barWidth = Math.max(pct, 4)
              return (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-semibold ${stage.text}`}>{stage.label}</span>
                      <span className="text-[10px] font-mono text-text-dim">{count}</span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${stage.gradient} transition-all duration-700`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  {i < STAGES.length - 1 && (
                    <ArrowRight size={12} className="text-text-dim mx-2 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
            <span className="text-xs font-semibold text-text-primary">{stage.label}</span>
          </div>
          <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded-md ${stage.bg} ${stage.text}`}>
            {patients.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2 max-h-[520px] overflow-y-auto">
        {patients.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[11px] text-text-dim">Sin pacientes</p>
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
  return (
    <div className="bg-surface-3/50 hover:bg-surface-3 rounded-lg px-3 py-2.5 transition-colors group cursor-default">
      {/* Name + avatar */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${stage.gradient} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
          {patient.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-xs font-semibold text-text-primary truncate group-hover:text-brand-purple-light transition-colors">
          {patient.full_name || 'Sin nombre'}
        </span>
      </div>

      {/* Metadata */}
      <div className="space-y-1 ml-8">
        <div className="flex items-center gap-1.5">
          <Phone size={9} className="text-text-dim" />
          <span className="text-[10px] text-text-muted font-mono">{patient.phone}</span>
        </div>
        {patient.service_interest && patient.service_interest !== 'Por identificar' && (
          <div className="flex items-center gap-1.5">
            <Star size={9} className="text-text-dim" />
            <span className="text-[10px] text-text-muted truncate">{patient.service_interest}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-text-dim">{timeAgo(patient.created_at)}</span>
          {patient.interaction_count > 0 && (
            <span className="text-[9px] text-text-dim font-mono">{patient.interaction_count} msg</span>
          )}
        </div>
      </div>
    </div>
  )
}
