'use client'

import { useEffect, useState } from 'react'
import { Brain } from 'lucide-react'
import { fetchSofiaLearnings, type SofiaLearning } from '@/lib/api/zombies'
import { timeAgo } from '@/lib/api/helpers'
import * as Sentry from '@sentry/nextjs'

const CATEGORY_LABELS: Record<string, string> = {
  pricing_resistance: 'Resistencia a precios',
  high_intent_signals: 'Señales de alta intención',
  closing_friction: 'Fricción al cerrar',
  channel_preference: 'Preferencia de canal',
  popular_question: 'Pregunta popular',
  service_demand: 'Demanda de servicios',
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
            <div key={l.id} className="glass-card p-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-brand-purple">
                  {CATEGORY_LABELS[l.category] || l.category}
                </span>
                <span className="text-[10px] font-mono text-text-dim">{timeAgo(l.created_at)}</span>
              </div>
              <p className="text-[12.5px] font-body text-text-primary leading-relaxed">{l.insight_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
