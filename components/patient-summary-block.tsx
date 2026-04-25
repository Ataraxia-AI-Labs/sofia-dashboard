'use client'

import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { useOrg } from '@/lib/org-context'
import { generatePatientSummary, type PatientSummary } from '@/lib/api/zombies'
import * as Sentry from '@sentry/nextjs'

interface Props {
  patientId: string
  /** Auto-load on mount if a cached summary exists. Default true. */
  autoLoad?: boolean
}

const EMOTION_LABEL: Record<string, { label: string; color: string }> = {
  POSITIVE: { label: 'Positivo', color: 'text-status-success' },
  NEUTRAL: { label: 'Neutral', color: 'text-text-muted' },
  FRUSTRATED: { label: 'Frustrado', color: 'text-status-danger' },
  CONFUSED: { label: 'Confundido', color: 'text-status-warning' },
  ENTHUSIASTIC: { label: 'Entusiasta', color: 'text-brand-purple' },
}

export function PatientSummaryBlock({ patientId, autoLoad = true }: Props) {
  const { orgId } = useOrg()
  const [summary, setSummary] = useState<PatientSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [requested, setRequested] = useState(false)

  const loadSummary = async (force: boolean = false) => {
    if (!orgId || !patientId) return
    if (force) setRefreshing(true); else setLoading(true)
    setRequested(true)
    try {
      const res = await generatePatientSummary(orgId, patientId, force)
      setSummary(res)
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'patient_summary' } })
      setSummary({ ok: false, error: 'No se pudo generar el resumen' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (autoLoad && !requested) loadSummary(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, patientId])

  // Initial load state
  if (loading && !summary) {
    return (
      <div className="glass-card p-4 flex items-center gap-3">
        <Loader2 size={14} className="text-brand-purple animate-spin" />
        <span className="text-[12px] font-body text-text-dim">SofIA está leyendo el historial…</span>
      </div>
    )
  }

  // Error or "not enough conversation"
  if (summary && !summary.ok) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-dim flex items-center gap-1.5">
            <Sparkles size={11} className="text-brand-purple" /> Resumen IA
          </span>
        </div>
        <p className="text-[12px] font-body text-text-dim leading-relaxed">
          {summary.error?.includes('Not enough') || summary.error?.includes('No usable')
            ? 'No hay suficiente conversación para resumir. Habla con el paciente y vuelve.'
            : summary.error || 'Sin resumen disponible.'}
        </p>
      </div>
    )
  }

  if (!summary) return null

  const emotion = summary.emotional_state ? EMOTION_LABEL[summary.emotional_state] : null

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-brand-purple flex items-center gap-1.5">
          <Sparkles size={11} strokeWidth={2} />
          Resumen IA
          {summary.cached && <span className="text-text-dim normal-case tracking-normal text-[10px]">· cacheado</span>}
        </span>
        <button
          onClick={() => loadSummary(true)}
          disabled={refreshing}
          className="text-[10.5px] font-mono uppercase tracking-wider text-text-dim hover:text-brand-purple transition-colors flex items-center gap-1 disabled:opacity-50"
          title="Regenerar"
        >
          <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} strokeWidth={1.8} />
          {refreshing ? '…' : 'actualizar'}
        </button>
      </div>

      {summary.summary_text && (
        <p className="text-[12.5px] font-body text-text-primary leading-relaxed">
          {summary.summary_text}
        </p>
      )}

      {summary.next_best_action && (
        <div className="bg-brand-purple/[0.06] border-l-2 border-brand-purple/40 pl-2.5 py-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-brand-purple block mb-0.5">
            Próxima acción sugerida
          </span>
          <span className="text-[12px] font-body text-text-primary">{summary.next_best_action}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
        {summary.key_topics && summary.key_topics.length > 0 && (
          <div className="flex-1 min-w-[120px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-1">Temas</span>
            <div className="flex flex-wrap gap-1">
              {summary.key_topics.slice(0, 5).map((topic, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-surface-2 text-[10.5px] font-mono text-text-muted">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
        {emotion && (
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-1">Estado</span>
            <span className={`text-[11.5px] font-body font-semibold ${emotion.color}`}>
              {emotion.label}
            </span>
          </div>
        )}
      </div>

      {summary.pending_actions && summary.pending_actions.length > 0 && (
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-dim block mb-1">Pendientes</span>
          <ul className="space-y-0.5">
            {summary.pending_actions.slice(0, 4).map((action, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11.5px] font-body text-text-muted">
                <span className="text-text-dim mt-0.5">·</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
