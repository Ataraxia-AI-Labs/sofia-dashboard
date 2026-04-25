'use client'

import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { fetchCoachingTips, type CoachingTip } from '@/lib/api/zombies'
import { timeAgo } from '@/lib/api/helpers'
import * as Sentry from '@sentry/nextjs'

const CATEGORY_COLOR: Record<string, string> = {
  bedside_manner: 'text-status-info',
  closing_technique: 'text-status-success',
  objection_handling: 'text-status-warning',
  followup_speed: 'text-brand-purple',
  default: 'text-text-muted',
}

const CATEGORY_LABEL: Record<string, string> = {
  bedside_manner: 'Trato al paciente',
  closing_technique: 'Cierre',
  objection_handling: 'Objeciones',
  followup_speed: 'Velocidad de respuesta',
  pricing_communication: 'Comunicación de precios',
}

interface Props { orgId: string }

export function CoachingTipsPanel({ orgId }: Props) {
  const [tips, setTips] = useState<CoachingTip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    fetchCoachingTips(orgId, 30)
      .then(setTips)
      .catch(err => Sentry.captureException(err, { tags: { feature: 'coaching_tips' } }))
      .finally(() => setLoading(false))
  }, [orgId])

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[13px] font-display font-semibold tracking-tight text-text-primary flex items-center gap-2">
          <GraduationCap size={14} className="text-brand-purple" strokeWidth={1.8} />
          Tips de coaching semanales
        </h3>
        <p className="text-[11px] font-body text-text-dim">
          SofIA analiza las conversaciones de la semana y extrae patrones para mejorar
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <div key={i} className="h-20 bg-surface-2/40 rounded animate-pulse" />)}
        </div>
      ) : tips.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <GraduationCap size={20} className="text-text-dim mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[12px] font-body text-text-dim">
            Aún no hay tips. Se generan cada domingo después de analizar la semana.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {tips.map(t => {
            const color = CATEGORY_COLOR[t.category] || CATEGORY_COLOR.default
            return (
              <div key={t.id} className="glass-card p-3">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className={`text-[10.5px] font-mono uppercase tracking-wider ${color}`}>
                    {CATEGORY_LABEL[t.category] || t.category}
                  </span>
                  <div className="flex items-baseline gap-2">
                    {typeof t.conviction === 'number' && (
                      <span className="text-[10px] font-mono text-text-dim">
                        {Math.round(t.conviction * 100)}% confianza
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-text-dim">
                      {timeAgo(t.created_at)}
                    </span>
                  </div>
                </div>
                <p className="text-[12.5px] font-body text-text-primary leading-relaxed">
                  {t.insight}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
