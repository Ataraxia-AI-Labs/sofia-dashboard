'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, X, Clock } from 'lucide-react'
import { fetchProactiveQueue, cancelProactiveMessage, type ProactiveMessage } from '@/lib/api/zombies'
import { timeAgo } from '@/lib/api/helpers'
import * as Sentry from '@sentry/nextjs'

interface Props { orgId: string }

const CHANNEL_BADGE: Record<string, string> = {
  WHATSAPP: 'bg-status-success/15 text-status-success',
  INSTAGRAM: 'bg-brand-purple/15 text-brand-purple',
  MESSENGER: 'bg-brand-cyan/15 text-brand-cyan',
  WEB: 'bg-status-warning/15 text-status-warning',
  VOICE: 'bg-status-info/15 text-status-info',
}

const TRIGGER_LABELS: Record<string, string> = {
  followup_no_response: 'Seguimiento sin respuesta',
  appointment_reminder: 'Recordatorio de cita',
  birthday: 'Cumpleaños',
  reactivation: 'Reactivación',
  post_treatment: 'Post-tratamiento',
}

export function ProactiveQueuePanel({ orgId }: Props) {
  const [items, setItems] = useState<ProactiveMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'PENDING' | 'SENT' | 'CANCELLED'>('PENDING')

  const load = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const rows = await fetchProactiveQueue(orgId, tab)
      setItems(rows || [])
    } catch (err) {
      Sentry.captureException(err, { tags: { feature: 'proactive_queue' } })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId, tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    if (orgId) await cancelProactiveMessage(orgId, id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-display font-semibold tracking-tight text-text-primary">
            Cola proactiva
          </h3>
          <p className="text-[11px] font-body text-text-dim">
            Mensajes que SofIA quiere enviar antes de que el paciente pregunte
          </p>
        </div>
        <div className="flex gap-1">
          {(['PENDING', 'SENT', 'CANCELLED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-mono uppercase tracking-wider transition-all ${
                tab === s ? 'bg-brand-purple/15 text-brand-purple' : 'bg-surface-2/40 text-text-dim hover:text-text-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 bg-surface-2/40 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <MessageSquare size={20} className="text-text-dim mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[12px] font-body text-text-dim">
            No hay mensajes {tab.toLowerCase()}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(m => (
            <div key={m.id} className="glass-card p-3 flex items-start gap-3">
              <div className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                CHANNEL_BADGE[m.channel] || 'bg-surface-2 text-text-dim'
              }`}>
                {m.channel}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11.5px] font-mono text-text-muted">
                    {TRIGGER_LABELS[m.trigger_type] || m.trigger_type}
                  </span>
                  <span className="text-[10px] font-mono text-text-dim flex items-center gap-1">
                    <Clock size={9} /> {timeAgo(m.scheduled_for)}
                  </span>
                </div>
                <p className="text-[12px] font-body text-text-primary leading-relaxed line-clamp-2">
                  {m.message_text}
                </p>
              </div>
              {tab === 'PENDING' && (
                <button
                  onClick={() => handleCancel(m.id)}
                  className="text-text-dim hover:text-status-danger transition-colors flex-shrink-0"
                  title="Cancelar"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
