'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { fetchReviewRequests, type ReviewRequest } from '@/lib/api/zombies'
import { timeAgo } from '@/lib/api/helpers'
import * as Sentry from '@sentry/nextjs'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-status-warning/15 text-status-warning',
  SENT: 'bg-status-info/15 text-status-info',
  COMPLETED: 'bg-status-success/15 text-status-success',
  FAILED: 'bg-status-danger/15 text-status-danger',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  SENT: 'Enviado',
  COMPLETED: 'Recibido',
  FAILED: 'Fallido',
}

interface Props { orgId: string }

export function ReviewRequestsPanel({ orgId }: Props) {
  const [items, setItems] = useState<ReviewRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    fetchReviewRequests(orgId, tab)
      .then(setItems)
      .catch(err => Sentry.captureException(err, { tags: { feature: 'review_requests' } }))
      .finally(() => setLoading(false))
  }, [orgId, tab])

  const counts = {
    all: items.length,
    pending: items.filter(i => i.status === 'PENDING').length,
    sent: items.filter(i => i.status === 'SENT').length,
    completed: items.filter(i => i.status === 'COMPLETED').length,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-display font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <Star size={14} className="text-status-warning" strokeWidth={1.8} />
            Solicitudes de reseña
          </h3>
          <p className="text-[11px] font-body text-text-dim">
            SofIA pide reseñas a pacientes felices después de cada cita completada
          </p>
        </div>
        <div className="flex gap-1">
          {([
            { id: undefined, label: `Todos (${counts.all})` },
            { id: 'PENDING', label: `Pendiente (${counts.pending})` },
            { id: 'SENT', label: `Enviado (${counts.sent})` },
            { id: 'COMPLETED', label: `Reseñado (${counts.completed})` },
          ] as const).map(t => (
            <button
              key={t.id || 'all'}
              onClick={() => setTab(t.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all ${
                tab === t.id ? 'bg-brand-purple/15 text-brand-purple' : 'bg-surface-2/40 text-text-dim hover:text-text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <div key={i} className="h-12 bg-surface-2/40 rounded animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <Star size={20} className="text-text-dim mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[12px] font-body text-text-dim">
            Sin solicitudes en esta categoría.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-[11.5px] font-body">
            <thead>
              <tr className="border-b border-border/30">
                {/* S120-A11Y-015: scope="col" */}
                <th scope="col" className="text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-text-dim">Paciente</th>
                <th scope="col" className="text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-text-dim">Estado</th>
                <th scope="col" className="text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-text-dim">Calificación</th>
                <th scope="col" className="text-right px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-text-dim">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="border-b border-border/10 last:border-0 hover:bg-surface-2/30">
                  <td className="px-3 py-2 text-text-primary font-body text-[10.5px] truncate max-w-[180px]" title={r.patient_phone || r.patient_id}>
                    {r.patient_name || (r.patient_id ? r.patient_id.slice(0, 8) : 'Paciente sin nombre')}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-body uppercase tracking-wider ${STATUS_BADGE[r.status] || ''}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-muted">
                    {r.response_score ? `${r.response_score} ★`.padEnd(2, '★') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-text-dim text-[10.5px] font-mono">
                    {timeAgo(r.responded_at || r.sent_at || r.scheduled_for)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
