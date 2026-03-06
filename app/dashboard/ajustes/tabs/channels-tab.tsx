'use client'

import { useEffect, useState, useCallback } from 'react'
import Script from 'next/script'
import { fetchChannelStatus, connectWhatsApp, connectWhatsAppEmbedded } from '@/lib/api/channels'
import { MessageCircle, Instagram, PhoneCall, Wifi, CheckCircle, XCircle, Loader2, Zap, ChevronDown, ChevronUp } from 'lucide-react'

interface ChannelsTabProps {
  orgId: string
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

const FB_CONFIG_ID = process.env.NEXT_PUBLIC_FB_CONFIG_ID || ''

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp Business', icon: MessageCircle, color: 'text-status-success', configurable: true },
  { key: 'instagram', label: 'Instagram DM', icon: Instagram, color: 'text-brand-purple', configurable: false },
  { key: 'messenger', label: 'Messenger', icon: MessageCircle, color: 'text-status-info', configurable: false },
  { key: 'voice', label: 'Voice AI', icon: PhoneCall, color: 'text-brand-cyan', configurable: false },
] as const

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void
      login: (callback: (response: { authResponse?: { code?: string } }) => void, params: { config_id: string; response_type: string; override_default_response_type: boolean }) => void
    }
    fbAsyncInit?: () => void
  }
}

export function ChannelsTab({ orgId, isReadOnly, onMessage }: ChannelsTabProps) {
  const [status, setStatus] = useState<Record<string, { connected: boolean; phone_id?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [phoneId, setPhoneId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [embeddedConnecting, setEmbeddedConnecting] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false)

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

  const handleEmbeddedSignup = useCallback(() => {
    if (!window.FB) {
      onMessage('Facebook SDK no cargado. Intenta de nuevo en unos segundos.')
      return
    }
    if (!FB_CONFIG_ID) {
      onMessage('Meta Embedded Signup no disponible aun. Usa el formulario manual.')
      setShowManualForm(true)
      return
    }

    setEmbeddedConnecting(true)

    window.FB.login(
      async (response) => {
        const code = response.authResponse?.code
        if (!code) {
          setEmbeddedConnecting(false)
          onMessage('Inicio de sesion cancelado o fallido')
          return
        }

        try {
          const result = await connectWhatsAppEmbedded(orgId, code)
          onMessage('WhatsApp conectado exitosamente via Meta')
          setStatus(prev => ({
            ...prev,
            whatsapp: { connected: true, phone_id: result.phone_number_id },
          }))
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error conectando WhatsApp'
          onMessage(message)
          if (message.includes('not configured') || message.includes('503')) {
            setShowManualForm(true)
          }
        }
        setEmbeddedConnecting(false)
      },
      {
        config_id: FB_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
      }
    )
  }, [orgId, onMessage])

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
      {/* Load Facebook SDK for Embedded Signup */}
      {FB_CONFIG_ID && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="lazyOnload"
          onLoad={() => {
            window.fbAsyncInit = () => {
              window.FB?.init({
                appId: FB_CONFIG_ID,
                cookie: true,
                xfbml: true,
                version: 'v21.0',
              })
              setFbSdkLoaded(true)
            }
            window.fbAsyncInit()
          }}
        />
      )}

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

            {/* WhatsApp connection options */}
            {ch.key === 'whatsapp' && ch.configurable && !connected && !isReadOnly && (
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                {/* Embedded Signup button (primary) */}
                <button
                  onClick={handleEmbeddedSignup}
                  disabled={embeddedConnecting || (!fbSdkLoaded && !!FB_CONFIG_ID)}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {embeddedConnecting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Zap size={14} />
                  )}
                  Conectar WhatsApp con un clic
                </button>
                <p className="text-[10px] text-text-dim text-center">
                  Vincula tu cuenta de WhatsApp Business directamente desde Meta
                </p>

                {/* Manual form toggle */}
                <button
                  onClick={() => setShowManualForm(prev => !prev)}
                  className="flex items-center gap-1 text-[10px] text-text-dim hover:text-text-secondary transition-colors mx-auto"
                >
                  {showManualForm ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  Configuracion manual
                </button>

                {/* Manual form (collapsed by default) */}
                {showManualForm && (
                  <div className="space-y-3 pt-2">
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
            )}
          </div>
        )
      })}
    </div>
  )
}
