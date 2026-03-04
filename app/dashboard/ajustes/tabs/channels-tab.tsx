'use client'

import { useEffect, useState } from 'react'
import { fetchChannelStatus, connectWhatsApp } from '@/lib/api/channels'
import { MessageCircle, Instagram, PhoneCall, Wifi, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ChannelsTabProps {
  orgId: string
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp Business', icon: MessageCircle, color: 'text-status-success', configurable: true },
  { key: 'instagram', label: 'Instagram DM', icon: Instagram, color: 'text-brand-purple', configurable: false },
  { key: 'messenger', label: 'Messenger', icon: MessageCircle, color: 'text-status-info', configurable: false },
  { key: 'voice', label: 'Voice AI', icon: PhoneCall, color: 'text-brand-cyan', configurable: false },
] as const

export function ChannelsTab({ orgId, isReadOnly, onMessage }: ChannelsTabProps) {
  const [status, setStatus] = useState<Record<string, { connected: boolean; phone_id?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [phoneId, setPhoneId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchChannelStatus(orgId).then((s) => {
      setStatus(s as unknown as Record<string, { connected: boolean; phone_id?: string }>)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [orgId])

  const handleConnect = async () => {
    if (!phoneId.trim()) return
    setConnecting(true)
    try {
      await connectWhatsApp(orgId, { phone_number_id: phoneId.trim(), api_key: apiKey.trim() })
      onMessage('WhatsApp conectado exitosamente')
      setStatus(prev => ({ ...prev, whatsapp: { connected: true, phone_id: phoneId } }))
      setPhoneId('')
      setApiKey('')
    } catch {
      onMessage('Error conectando WhatsApp')
    }
    setConnecting(false)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-5 bg-surface-3 rounded w-40" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {CHANNELS.map((ch) => {
        const Icon = ch.icon
        const channelStatus = status[ch.key]
        const connected = channelStatus?.connected || false

        return (
          <div key={ch.key} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? 'bg-status-success/10' : 'bg-surface-3'}`}>
                  <Icon size={20} className={connected ? ch.color : 'text-text-dim'} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{ch.label}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {connected ? (
                      <>
                        <CheckCircle size={11} className="text-status-success" />
                        <span className="text-[10px] text-status-success font-medium">Conectado</span>
                        {channelStatus?.phone_id && (
                          <span className="text-[10px] text-text-dim ml-1">ID: {channelStatus.phone_id}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle size={11} className="text-text-dim" />
                        <span className="text-[10px] text-text-dim font-medium">
                          {ch.configurable ? 'No conectado' : 'Proximamente'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp config form */}
            {ch.key === 'whatsapp' && ch.configurable && !connected && !isReadOnly && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                <div>
                  <label className="text-[10px] text-text-dim font-semibold uppercase tracking-wider block mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="Ej: 123456789012345"
                    className="w-full px-3 py-2 bg-surface-3 border border-border rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-dim font-semibold uppercase tracking-wider block mb-1">API Key (360dialog / Meta)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Tu API key"
                    className="w-full px-3 py-2 bg-surface-3 border border-border rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                  />
                </div>
                <button
                  onClick={handleConnect}
                  disabled={connecting || !phoneId.trim()}
                  className="px-4 py-2 rounded-lg bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {connecting ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                  Conectar WhatsApp
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
