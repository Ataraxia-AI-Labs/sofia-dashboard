'use client'

import { useEffect, useState } from 'react'
import { Brain } from 'lucide-react'
import { fetchSofiaLearnings, type SofiaLearning } from '@/lib/api/zombies'
import { timeAgo } from '@/lib/api/helpers'
import * as Sentry from '@sentry/nextjs'

const SOURCE_LABELS: Record<string, string> = {
  conversation: 'Conversaciones',
  appointment: 'Citas',
  payment: 'Pagos',
  review: 'Reseñas',
  funnel: 'Funnel',
  outcome: 'Resultados',
}

interface Props { orgId: string }

export function SofiaLearningsPanel({ orgId }: Props) {
  const [items, setItems] = useState<SofiaLearning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    fetchSofiaLearnings(orgId)
      .then(setItems)
      .catch(err => Sentry.captureException(err, { tags: { feature: 'sofia_learnings' } }))
      .finally(() => setLoading(false))
  }, [orgId])

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[13px] font-display font-semibold tracking-tight text-text-primary flex items-center gap-2">
          <Brain size={14} className="text-brand-purple" strokeWidth={1.8} />
          Aprendizajes de SofIA
        </h3>
        <p className="text-[11px] font-body text-text-dim">
          Patrones que SofIA descubre analizando todas las conversaciones de tu clínica
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <div key={i} className="h-16 bg-surface-2/40 rounded animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <Brain size={20} className="text-text-dim mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[12px] font-body text-text-dim">
            Aún no hay aprendizajes. Se generan semanalmente al cruzar conversaciones con outcomes.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map(l => (
            <div key={l.id} className="glass-card p-3 space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-brand-purple">
                  {SOURCE_LABELS[l.source_type] || l.source_type}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-text-dim">
                    {Math.round((l.confidence || 0) * 100)}% confianza
                  </span>
                  <span className="text-[10px] font-mono text-text-dim">{timeAgo(l.created_at)}</span>
                </div>
              </div>
              <p className="text-[12.5px] font-body text-text-primary leading-relaxed">
                {l.pattern}
              </p>
              {l.rule_extracted && (
                <div className="bg-brand-purple/[0.06] border-l-2 border-brand-purple/40 pl-2.5 py-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand-purple block mb-0.5">
                    Regla aplicada
                  </span>
                  <span className="text-[11.5px] font-body text-text-primary">{l.rule_extracted}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
