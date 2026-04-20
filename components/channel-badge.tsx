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
    color: 'text-status-success',
    bg: 'bg-status-success/10',
    border: 'border-status-success/25',
  },
  INSTAGRAM: {
    icon: Instagram,
    label: 'Instagram',
    color: 'text-brand-purple',
    bg: 'bg-brand-purple/10',
    border: 'border-brand-purple/25',
  },
  MESSENGER: {
    icon: MessagesSquare,
    label: 'Messenger',
    color: 'text-brand-cyan',
    bg: 'bg-brand-cyan/10',
    border: 'border-brand-cyan/25',
  },
  WEBCHAT: {
    icon: Globe,
    label: 'Web Chat',
    color: 'text-status-info',
    bg: 'bg-status-info/10',
    border: 'border-status-info/25',
  },
  VOICE: {
    icon: PhoneCall,
    label: 'Voz',
    color: 'text-brand-gold',
    bg: 'bg-brand-gold/10',
    border: 'border-brand-gold/25',
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
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-body font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color} ${className}`}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

export { CHANNEL_CONFIG }
