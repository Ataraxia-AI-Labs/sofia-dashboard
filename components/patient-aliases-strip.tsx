'use client'

import { useEffect, useState } from 'react'
import { fetchPatientAliases } from '@/lib/api/patients'
import type { PatientAlias } from '@/lib/api/patients'
import {
  MessageCircle, Instagram, Phone, Globe, PhoneCall, Heart,
} from 'lucide-react'
import { timeAgo } from '@/lib/api/helpers'

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  phone: {
    label: 'Teléfono',
    icon: <Phone size={11} />,
    color: 'text-status-success',
    bg: 'bg-status-success/8 border-status-success/20',
  },
  instagram: {
    label: 'Instagram',
    icon: <Instagram size={11} />,
    color: 'text-brand-purple',
    bg: 'bg-brand-purple/8 border-brand-purple/20',
  },
  messenger: {
    label: 'Messenger',
    icon: <MessageCircle size={11} />,
    color: 'text-status-info',
    bg: 'bg-status-info/8 border-status-info/20',
  },
  web_session: {
    label: 'Web Chat',
    icon: <Globe size={11} />,
    color: 'text-brand-cyan',
    bg: 'bg-brand-cyan/8 border-brand-cyan/20',
  },
  voice_caller: {
    label: 'Llamada de voz',
    icon: <PhoneCall size={11} />,
    color: 'text-brand-gold',
    bg: 'bg-brand-gold/8 border-brand-gold/20',
  },
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return value
  return `··· ${digits.slice(-4)}`
}

function looksLikeSessionId(value: string): boolean {
  return /^web[_-]/i.test(value) || /^session[_-]/i.test(value)
}

function maskAlias(type: string, value: string): string {
  // S148: mis-typed aliases come back from the backend with type='phone'
  // even when the value is clearly a web-chat session id like
  // "web_smoke_1776007406". The masker would format that as "··· 7406"
  // and pretend the patient had a phone number. Detect the session-id
  // shape FIRST and short-circuit so the correct visual (truncated id)
  // wins over the type label.
  if (looksLikeSessionId(value)) {
    return value.length > 12 ? `${value.slice(0, 12)}…` : value
  }
  if (type === 'phone' || type === 'voice_caller') return maskPhone(value)
  if (type === 'web_session') {
    return value.length > 12 ? `${value.slice(0, 12)}…` : value
  }
  return value
}

// S148: pick the actual chip metadata. If the alias type says 'phone' but
// the value is a session id, use Web Chat metadata so the icon and color
// don't lie. Backend will eventually correct the type via the channel
// resolution pipeline; this guards the dashboard until then.
function resolveTypeMeta(type: string, value: string) {
  if (looksLikeSessionId(value)) return TYPE_META.web_session
  return TYPE_META[type]
}

interface Props {
  patientId: string
  /** When true the component fetches aliases on mount; set false in tests. */
  autoLoad?: boolean
}

export function PatientAliasesStrip({ patientId, autoLoad = true }: Props) {
  const [aliases, setAliases] = useState<PatientAlias[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!autoLoad || !patientId) return
    let cancelled = false
    setLoading(true)
    fetchPatientAliases(patientId)
      .then((rows) => { if (!cancelled) setAliases(rows) })
      .finally(() => { if (!cancelled) { setLoading(false); setLoaded(true) } })
    return () => { cancelled = true }
  }, [patientId, autoLoad])

  if (loading || !loaded) {
    return (
      <div className="glass-card p-3 animate-pulse">
        <div className="h-4 w-32 bg-surface-3 rounded mb-2" />
        <div className="h-6 w-full bg-surface-3 rounded" />
      </div>
    )
  }
  if (aliases.length === 0) return null

  // Group + summarize for the headline
  const channelCount = new Set(aliases.map(a => a.alias_type)).size
  const hasRelativeNote = aliases.some(a => (a.notes || '').toLowerCase().includes('familiar') || (a.notes || '').toLowerCase().includes('esposa') || (a.notes || '').toLowerCase().includes('cuidador'))

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-[11px] font-body font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Heart size={11} className="text-brand-purple" />
          Lo conocemos desde
        </h4>
        <span className="text-[10px] font-body font-mono text-text-dim">
          {aliases.length} {aliases.length === 1 ? 'identidad' : 'identidades'} · {channelCount} {channelCount === 1 ? 'canal' : 'canales'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {aliases.map((a, i) => {
          const meta = resolveTypeMeta(a.alias_type, a.alias_value) || {
            label: a.alias_type, icon: null,
            color: 'text-text-muted', bg: 'bg-surface-3 border-border/30',
          }
          const isRelative = (a.notes || '').toLowerCase().match(/familiar|esposa|esposo|hijo|hija|madre|padre|cuidador|asistente/)
          return (
            <div
              key={i}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${meta.bg} ${meta.color}`}
              title={[
                meta.label,
                a.alias_value,
                a.notes ? `(${a.notes})` : '',
                `Visto: ${timeAgo(a.last_seen_at)}`,
              ].filter(Boolean).join(' · ')}
            >
              {meta.icon}
              <span className="text-[11px] font-body font-mono">{maskAlias(a.alias_type, a.alias_value)}</span>
              {a.is_primary && (
                <span className="text-[8px] uppercase tracking-wider opacity-60">primario</span>
              )}
              {isRelative && (
                <span className="text-[8px] uppercase tracking-wider opacity-70 italic">{a.notes?.split(' ')[0]}</span>
              )}
            </div>
          )
        })}
      </div>
      {hasRelativeNote && (
        <p className="text-[10.5px] font-body text-text-dim mt-2 leading-relaxed">
          Algunos contactos son familiares o cuidadores que llaman por este paciente. SofIA reconoce la relación automáticamente en cada canal.
        </p>
      )}
    </div>
  )
}
