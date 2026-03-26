'use client'

import { MessageCircle, Instagram, Globe, PhoneCall, MessagesSquare } from 'lucide-react'
import type { ChannelType } from '@/types'

// ============================================================
// CHANNEL BADGE (P5-07)
// Colored badge identifying the communication channel
// ============================================================

interface ChannelBadgeProps {
  channel: ChannelType
  /** Compact mode — icon only, no label */
  compact?: boolean
  className?: string
}

const CHANNEL_CONFIG: Record<ChannelType, {
  icon: typeof MessageCircle
  label: string
  color: string
  bg: string
  border: string
}> = {
  WHATSAPP: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  INSTAGRAM: {
    icon: Instagram,
    label: 'Instagram',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/25',
  },
  MESSENGER: {
    icon: MessagesSquare,
    label: 'Messenger',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/25',
  },
  WEBCHAT: {
    icon: Globe,
    label: 'Web Chat',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
  },
  VOICE: {
    icon: PhoneCall,
    label: 'Voz',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
  },
}

export function ChannelBadge({ channel, compact = false, className = '' }: ChannelBadgeProps) {
  const cfg = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.WHATSAPP
  const Icon = cfg.icon

  if (compact) {
    return (
      <div
        className={`w-6 h-6 rounded-md ${cfg.bg} border ${cfg.border} flex items-center justify-center ${className}`}
        title={cfg.label}
      >
        <Icon size={12} className={cfg.color} />
      </div>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

export { CHANNEL_CONFIG }
