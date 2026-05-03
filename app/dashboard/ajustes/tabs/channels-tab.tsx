'use client'

import { useEffect, useState, useCallback } from 'react'
import Script from 'next/script'
import {
  fetchChannelStatus, connectWhatsApp, connectWhatsAppEmbedded,
  connectVoice, disconnectVoice,
  connectInstagram, disconnectInstagram,
  connectMessenger, disconnectMessenger,
} from '@/lib/api/channels'
import { updateOrganization } from '@/lib/api'
import { API_URL, authFetch } from '@/lib/api/helpers'
import { MessageCircle, Instagram, PhoneCall, Wifi, CheckCircle, XCircle, Loader2, Zap, ChevronDown, ChevronUp, Save, Eye, EyeOff, Globe, ArrowRight } from 'lucide-react'
import type { Organization } from '@/types'
import { WhatsAppMigrationWizard } from '@/components/whatsapp-migration-wizard'

interface ChannelsTabProps {
  orgId: string
  org: Organization | null
  isReadOnly: boolean
  onMessage: (msg: string) => void
  onRefresh: () => void
  onNavigateToTab?: (tab: string) => void
}

const FB_CONFIG_ID = process.env.NEXT_PUBLIC_FB_CONFIG_ID || ''
const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID || FB_CONFIG_ID

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp Business', icon: MessageCircle, color: 'text-status-success', configurable: true },
  { key: 'instagram', label: 'Instagram DM', icon: Instagram, color: 'text-brand-purple', configurable: true },
  { key: 'messenger', label: 'Messenger', icon: MessageCircle, color: 'text-status-info', configurable: true },
  { key: 'voice', label: 'Voice AI', icon: PhoneCall, color: 'text-brand-cyan', configurable: true },
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

export function ChannelsTab({ orgId, org, isReadOnly, onMessage, onRefresh, onNavigateToTab }: ChannelsTabProps) {
  const [status, setStatus] = useState<Record<string, { connected: boolean; phone_id?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [phoneId, setPhoneId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [embeddedConnecting, setEmbeddedConnecting] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false)

  // Voice transfer number from config_settings
  const configSettings = (org?.config_settings || {}) as Record<string, Record<string, string>>
  const currentTransferNumber = configSettings?.twilio?.transfer_number || ''
  const [transferNumber, setTransferNumber] = useState(currentTransferNumber)
  const [savingTransfer, setSavingTransfer] = useState(false)

  // Voice (Twilio) per-clinic credentials
  const [voiceAccountSid, setVoiceAccountSid] = useState('')
  const [voiceAuthToken, setVoiceAuthToken] = useState('')
  const [voicePhoneNumber, setVoicePhoneNumber] = useState('')
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [voiceConnecting, setVoiceConnecting] = useState(false)
  const [voiceDisconnecting, setVoiceDisconnecting] = useState(false)
  const [showVoiceForm, setShowVoiceForm] = useState(false)

  const voiceConnected = !!status['voice']?.connected
  const voicePerClinic = !!(status['voice'] as { per_clinic?: boolean } | undefined)?.per_clinic
  const voicePhoneConnected = (status['voice'] as { phone_number?: string } | undefined)?.phone_number || ''

  // Web Chat status — fetched separately since it has its own config endpoint
  const [webchatCfg, setWebchatCfg] = useState<{ enabled: boolean; allowed_domains: string[]; primary_color: string } | null>(null)

  useEffect(() => {
    if (!orgId) return
    authFetch(`${API_URL}/webchat/${orgId}/config`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setWebchatCfg({
          enabled: !!data.enabled,
          allowed_domains: Array.isArray(data.allowed_domains) ? data.allowed_domains : [],
          primary_color: data.primary_color || '#7C3AED',
        })
      })
      .catch(() => {})
  }, [orgId])

  useEffect(() => {
    setTransferNumber(currentTransferNumber)
  }, [currentTransferNumber])

  const handleConnectVoice = async () => {
    if (isReadOnly) return
    if (!voiceAccountSid.trim() || !voiceAuthToken.trim() || !voicePhoneNumber.trim()) {
      onMessage('Completa el ID de cuenta, token de autenticacion y numero')
      return
    }
    setVoiceConnecting(true)
    try {
      await connectVoice(orgId, {
        account_sid: voiceAccountSid.trim(),
        auth_token: voiceAuthToken.trim(),
        phone_number: voicePhoneNumber.trim(),
        transfer_number: transferNumber.trim() || undefined,
      })
      onMessage('Voice AI conectado — webhook configurado en Twilio')
      setStatus(prev => ({ ...prev, voice: { connected: true, phone_number: voicePhoneNumber.trim(), per_clinic: true } as { connected: boolean; phone_id?: string } }))
      setVoiceAccountSid('')
      setVoiceAuthToken('')
      setVoicePhoneNumber('')
      setShowVoiceForm(false)
      onRefresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error conectando Voice AI'
      onMessage(msg)
    }
    setVoiceConnecting(false)
  }

  const handleDisconnectVoice = async () => {
    if (isReadOnly) return
    if (!confirm('¿Desconectar Voice AI? Las credenciales Twilio se eliminarán de la clínica.')) return
    setVoiceDisconnecting(true)
    try {
      await disconnectVoice(orgId)
      onMessage('Voice AI desconectado')
      setStatus(prev => ({ ...prev, voice: { connected: false } as { connected: boolean; phone_id?: string } }))
      onRefresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconectando Voice AI'
      onMessage(msg)
    }
    setVoiceDisconnecting(false)
  }

  // ============================================================
  // Instagram + Messenger manual connect (P3)
  // ============================================================
  const [igForm, setIgForm] = useState({ pageId: '', token: '', igUserId: '', show: false, busy: false })
  const [msgForm, setMsgForm] = useState({ pageId: '', token: '', show: false, busy: false })

  const handleConnectInstagram = async () => {
    if (isReadOnly) return
    if (!igForm.pageId.trim() || !igForm.token.trim()) {
      onMessage('Completa el ID de la página de Facebook y el token de acceso')
      return
    }
    setIgForm(f => ({ ...f, busy: true }))
    try {
      const res = await connectInstagram(orgId, {
        page_id: igForm.pageId.trim(),
        page_access_token: igForm.token.trim(),
        instagram_business_account_id: igForm.igUserId.trim() || undefined,
      })
      onMessage(`Instagram conectado: ${res.page_name || res.page_id}`)
      setStatus(prev => ({ ...prev, instagram: { connected: true, page_id: res.page_id } as { connected: boolean; phone_id?: string } }))
      setIgForm({ pageId: '', token: '', igUserId: '', show: false, busy: false })
      onRefresh()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error conectando Instagram')
      setIgForm(f => ({ ...f, busy: false }))
    }
  }

  const handleDisconnectInstagram = async () => {
    if (isReadOnly) return
    if (!confirm('¿Desconectar Instagram? La página se liberará.')) return
    try {
      await disconnectInstagram(orgId)
      setStatus(prev => ({ ...prev, instagram: { connected: false } as { connected: boolean; phone_id?: string } }))
      onMessage('Instagram desconectado')
      onRefresh()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error desconectando Instagram')
    }
  }

  const handleConnectMessenger = async () => {
    if (isReadOnly) return
    if (!msgForm.pageId.trim() || !msgForm.token.trim()) {
      onMessage('Completa el ID de la página y el token de acceso')
      return
    }
    setMsgForm(f => ({ ...f, busy: true }))
    try {
      const res = await connectMessenger(orgId, {
        page_id: msgForm.pageId.trim(),
        page_access_token: msgForm.token.trim(),
      })
      onMessage(`Messenger conectado: ${res.page_name || res.page_id}`)
      setStatus(prev => ({ ...prev, messenger: { connected: true, page_id: res.page_id } as { connected: boolean; phone_id?: string } }))
      setMsgForm({ pageId: '', token: '', show: false, busy: false })
      onRefresh()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error conectando Messenger')
      setMsgForm(f => ({ ...f, busy: false }))
    }
  }

  const handleDisconnectMessenger = async () => {
    if (isReadOnly) return
    if (!confirm('¿Desconectar Messenger? La página se liberará.')) return
    try {
      await disconnectMessenger(orgId)
      setStatus(prev => ({ ...prev, messenger: { connected: false } as { connected: boolean; phone_id?: string } }))
      onMessage('Messenger desconectado')
      onRefresh()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error desconectando Messenger')
    }
  }

  const handleSaveTransferNumber = async () => {
    if (isReadOnly || !orgId) return
    setSavingTransfer(true)
    try {
      const existingConfig = (org?.config_settings || {}) as Record<string, unknown>
      const existingTwilio = (existingConfig.twilio || {}) as Record<string, unknown>
      const merged = {
        ...existingConfig,
        twilio: {
          ...existingTwilio,
          transfer_number: transferNumber.trim(),
        },
      }
      await updateOrganization(orgId, { config_settings: merged })
      onMessage('Numero de transferencia guardado')
      onRefresh()
    } catch {
      onMessage('Error guardando numero de transferencia')
    }
    setSavingTransfer(false)
  }

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
      <div className="space-y-3 animate-sentient-breathe">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="h-5 bg-surface-3 rounded-md w-40" />
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
                appId: FB_APP_ID,
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

      {/* Web Chat card — links to its own dedicated tab */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: webchatCfg?.enabled ? `${webchatCfg.primary_color}15` : 'rgb(40 40 50 / .4)',
              }}
            >
              <Globe size={20} style={{ color: webchatCfg?.enabled ? webchatCfg.primary_color : undefined }} className={webchatCfg?.enabled ? '' : 'text-text-dim'} />
            </div>
            <div>
              <h3 className="text-xs font-body font-semibold text-text-primary">Web Chat Widget</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {webchatCfg === null ? (
                  <span className="text-[12px] font-body text-text-dim">Cargando...</span>
                ) : webchatCfg.enabled ? (
                  <>
                    <CheckCircle size={11} className="text-status-success" />
                    <span className="text-[12px] font-body text-status-success font-medium">Activo</span>
                    {webchatCfg.allowed_domains.length > 0 ? (
                      <span className="text-[12px] font-body text-text-dim">· {webchatCfg.allowed_domains.length} dominio{webchatCfg.allowed_domains.length === 1 ? '' : 's'}</span>
                    ) : (
                      <span className="text-[12px] font-body text-status-warning">· sin restriccion de dominios</span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle size={11} className="text-text-dim" />
                    <span className="text-[12px] font-body text-text-dim font-medium">Desactivado</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab?.('webchat')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-surface-3 border border-border hover:border-brand-purple/30 text-[12px] font-body font-semibold text-text-primary uppercase tracking-wider transition-colors"
          >
            Configurar
            <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {CHANNELS.map((ch) => {
        const Icon = ch.icon
        const channelStatus = status[ch.key]
        const connected = channelStatus?.connected || false

        // Build status detail per channel
        let statusDetail = ''
        if (connected) {
          if (ch.key === 'whatsapp' && channelStatus?.phone_id) statusDetail = `Numero: ${channelStatus.phone_id}`
          else if (ch.key === 'voice') {
            const v = channelStatus as { phone_number?: string; per_clinic?: boolean }
            if (v.phone_number) statusDetail = v.per_clinic ? v.phone_number : `${v.phone_number} (modo demo)`
            else statusDetail = '(modo demo · env global)'
          }
          else if (ch.key === 'instagram') {
            const ig = channelStatus as { page_id?: string }
            if (ig.page_id) statusDetail = `Pagina: ${ig.page_id}`
          }
          else if (ch.key === 'messenger') {
            const fb = channelStatus as { page_id?: string }
            if (fb.page_id) statusDetail = `Pagina: ${fb.page_id}`
          }
        }

        return (
          <div key={ch.key} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connected ? 'bg-status-success/10' : 'bg-surface-3'}`}>
                  <Icon size={20} className={connected ? ch.color : 'text-text-dim'} />
                </div>
                <div>
                  <h3 className="text-xs font-body font-semibold text-text-primary">{ch.label}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {connected ? (
                      <>
                        <CheckCircle size={11} className="text-status-success" />
                        <span className="text-[12px] font-body text-status-success font-medium">Conectado</span>
                        {statusDetail && (
                          <span className="text-[12px] font-body text-text-dim ml-1">· {statusDetail}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle size={11} className="text-text-dim" />
                        <span className="text-[12px] font-body text-text-dim font-medium">
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
              <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                {/* Embedded Signup button (primary) */}
                <button
                  onClick={handleEmbeddedSignup}
                  disabled={embeddedConnecting || (!fbSdkLoaded && !!FB_CONFIG_ID)}
                  className="w-full px-4 py-2.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[12px] font-body font-semibold hover:bg-brand-purple/15 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {embeddedConnecting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Zap size={14} />
                  )}
                  Conectar WhatsApp con un clic
                </button>
                <p className="text-[12px] font-body text-text-dim text-center">
                  Vincula tu cuenta de WhatsApp Business directamente desde Meta.
                  Pendiente aprobación de Meta Technology Provider — usa configuración manual mientras tanto.
                </p>

                {/* Manual form toggle */}
                <button
                  onClick={() => setShowManualForm(prev => !prev)}
                  className="flex items-center gap-1 text-[12px] font-body text-text-dim hover:text-text-secondary transition-colors mx-auto"
                >
                  {showManualForm ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  Configuración manual
                </button>

                {/* Manual form (collapsed by default) */}
                {showManualForm && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">ID de numero de WhatsApp</label>
                      <input
                        type="text"
                        value={phoneId}
                        onChange={(e) => setPhoneId(e.target.value)}
                        placeholder="Ej: 123456789012345"
                        className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">Clave de acceso Meta</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Tu clave de acceso"
                        className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                      />
                    </div>
                    <button
                      onClick={handleConnect}
                      disabled={connecting || !phoneId.trim()}
                      className="px-3 py-2 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {connecting ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                      Conectar WhatsApp
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp SMS migration wizard — visible once phone_id+token saved */}
            {ch.key === 'whatsapp' && ch.configurable && connected && !isReadOnly && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <WhatsAppMigrationWizard
                  orgId={orgId}
                  isReadOnly={isReadOnly}
                  onMessage={onMessage}
                />
              </div>
            )}

            {/* Instagram connection options (P3) */}
            {ch.key === 'instagram' && ch.configurable && !isReadOnly && (
              <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                {connected ? (
                  <button
                    onClick={handleDisconnectInstagram}
                    className="text-[11px] font-body text-status-danger hover:underline uppercase tracking-wider"
                  >
                    Desconectar Instagram
                  </button>
                ) : (
                  <>
                    <p className="text-[12px] font-body text-text-dim leading-relaxed">
                      Conecta tu cuenta de Instagram Business vinculada a una página de Facebook.
                      Pendiente aprobación de Meta TP — usa configuración manual mientras tanto.
                    </p>
                    <button
                      onClick={() => setIgForm(f => ({ ...f, show: !f.show }))}
                      className="flex items-center gap-1 text-[12px] font-body text-text-dim hover:text-text-secondary transition-colors"
                    >
                      {igForm.show ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      Configuración manual
                    </button>
                    {igForm.show && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">ID de la página de Facebook</label>
                          <input
                            type="text"
                            value={igForm.pageId}
                            onChange={(e) => setIgForm(f => ({ ...f, pageId: e.target.value }))}
                            placeholder="Ej: 102345678901234"
                            className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">ID de cuenta de Instagram (opcional)</label>
                          <input
                            type="text"
                            value={igForm.igUserId}
                            onChange={(e) => setIgForm(f => ({ ...f, igUserId: e.target.value }))}
                            placeholder="Si tu IG ya está vinculado a la página, lo detectamos solos"
                            className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">Token de acceso de la página</label>
                          <input
                            type="password"
                            value={igForm.token}
                            onChange={(e) => setIgForm(f => ({ ...f, token: e.target.value }))}
                            placeholder="Página → Configuración → Generador de tokens"
                            className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                          />
                        </div>
                        <button
                          onClick={handleConnectInstagram}
                          disabled={igForm.busy || !igForm.pageId.trim() || !igForm.token.trim()}
                          className="px-3 py-2 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {igForm.busy ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                          Conectar Instagram
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Messenger connection options (P3) */}
            {ch.key === 'messenger' && ch.configurable && !isReadOnly && (
              <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                {connected ? (
                  <button
                    onClick={handleDisconnectMessenger}
                    className="text-[11px] font-body text-status-danger hover:underline uppercase tracking-wider"
                  >
                    Desconectar Messenger
                  </button>
                ) : (
                  <>
                    <p className="text-[12px] font-body text-text-dim leading-relaxed">
                      Conecta la página de Facebook desde la que quieres recibir mensajes.
                    </p>
                    <button
                      onClick={() => setMsgForm(f => ({ ...f, show: !f.show }))}
                      className="flex items-center gap-1 text-[12px] font-body text-text-dim hover:text-text-secondary transition-colors"
                    >
                      {msgForm.show ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      Configuración manual
                    </button>
                    {msgForm.show && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">ID de la página</label>
                          <input
                            type="text"
                            value={msgForm.pageId}
                            onChange={(e) => setMsgForm(f => ({ ...f, pageId: e.target.value }))}
                            placeholder="Ej: 102345678901234"
                            className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">Token de acceso</label>
                          <input
                            type="password"
                            value={msgForm.token}
                            onChange={(e) => setMsgForm(f => ({ ...f, token: e.target.value }))}
                            placeholder="Página → Configuración → Generador de tokens"
                            className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-purple/40"
                          />
                        </div>
                        <button
                          onClick={handleConnectMessenger}
                          disabled={msgForm.busy || !msgForm.pageId.trim() || !msgForm.token.trim()}
                          className="px-3 py-2 rounded-md bg-brand-purple text-white text-[12px] font-body font-semibold hover:bg-brand-purple-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {msgForm.busy ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                          Conectar Messenger
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Voice AI — Twilio per-clinic credentials + transfer number */}
      {!isReadOnly && (
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PhoneCall size={14} className="text-brand-cyan" />
              <h3 className="text-xs font-body font-semibold text-text-primary">Voice AI (Twilio)</h3>
              {voicePerClinic ? (
                <span className="text-[11px] font-body px-1.5 py-0.5 rounded bg-status-success/10 border border-status-success/20 text-status-success uppercase tracking-wider">Conectado</span>
              ) : voiceConnected ? (
                <span className="text-[11px] font-body px-1.5 py-0.5 rounded bg-status-warning/10 border border-status-warning/20 text-status-warning uppercase tracking-wider">Modo demo (env global)</span>
              ) : (
                <span className="text-[11px] font-body px-1.5 py-0.5 rounded bg-surface-3 border border-border text-text-dim uppercase tracking-wider">Desconectado</span>
              )}
            </div>
            {voicePerClinic && (
              <button
                onClick={handleDisconnectVoice}
                disabled={voiceDisconnecting}
                className="text-[11px] font-body text-status-danger hover:underline uppercase tracking-wider disabled:opacity-50"
              >
                {voiceDisconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            )}
          </div>

          {voicePerClinic && voicePhoneConnected && (
            <div className="text-[12px] font-body text-text-muted px-3 py-2 bg-surface-2 border border-border rounded-md">
              Numero activo: <span className="text-brand-cyan font-semibold">{voicePhoneConnected}</span>
            </div>
          )}

          {!voicePerClinic && (
            <>
              <button
                onClick={() => setShowVoiceForm(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-surface-3 border border-border hover:border-brand-cyan/30 transition-colors"
              >
                <span className="text-[12px] font-body font-semibold text-text-primary uppercase tracking-wider">Conectar mi cuenta Twilio</span>
                {showVoiceForm ? <ChevronUp size={12} className="text-text-dim" /> : <ChevronDown size={12} className="text-text-dim" />}
              </button>

              {showVoiceForm && (
                <div className="space-y-3 p-3 rounded-md bg-surface-2 border border-border">
                  <p className="text-[11px] font-body text-text-dim leading-relaxed">
                    Conecta tu cuenta Twilio para que SofIA atienda tu numero. Encuentra el ID de cuenta y token en console.twilio.com.
                  </p>

                  <div>
                    <label className="text-[11px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">ID de cuenta Twilio</label>
                    <input
                      type="text"
                      value={voiceAccountSid}
                      onChange={(e) => setVoiceAccountSid(e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-cyan/40"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">Token de autenticacion</label>
                    <div className="relative">
                      <input
                        type={showAuthToken ? 'text' : 'password'}
                        value={voiceAuthToken}
                        onChange={(e) => setVoiceAuthToken(e.target.value)}
                        placeholder="********************************"
                        className="w-full px-3 py-2 pr-9 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-cyan/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthToken(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary"
                        aria-label={showAuthToken ? 'Ocultar' : 'Mostrar'}
                      >
                        {showAuthToken ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-body text-text-dim font-semibold uppercase tracking-wider block mb-1">Numero de telefono (ej. +573001234567)</label>
                    <input
                      type="tel"
                      value={voicePhoneNumber}
                      onChange={(e) => setVoicePhoneNumber(e.target.value)}
                      placeholder="+573001234567"
                      className="w-full px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-cyan/40"
                    />
                  </div>

                  <button
                    onClick={handleConnectVoice}
                    disabled={voiceConnecting || !voiceAccountSid || !voiceAuthToken || !voicePhoneNumber}
                    className="w-full px-3 py-2 rounded-md bg-brand-cyan text-void text-[12px] font-body font-semibold uppercase tracking-wider hover:bg-brand-cyan/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {voiceConnecting ? (
                      <><Loader2 size={12} className="animate-spin" /> Verificando conexion...</>
                    ) : (
                      <><Zap size={12} /> Conectar Voice AI</>
                    )}
                  </button>

                  <p className="text-[10px] font-body text-text-dim/70 leading-relaxed">
                    Validamos las credenciales y configuramos automáticamente los webhooks de tu número (Voice + Status Callback).
                  </p>
                </div>
              )}
            </>
          )}

          {voiceConnected && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-body text-text-dim font-semibold uppercase tracking-wider block">
                Número de transferencia
              </label>
              <p className="text-[11px] font-body text-text-dim">
                Cuando un paciente pide hablar con alguien de tu equipo, la llamada se transfiere a este número.
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={transferNumber}
                  onChange={(e) => setTransferNumber(e.target.value)}
                  placeholder="+573001234567"
                  className="flex-1 px-3 py-2 bg-surface-3 border border-border rounded-md text-[12px] font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand-cyan/40"
                />
                <button
                  onClick={handleSaveTransferNumber}
                  disabled={savingTransfer || transferNumber.trim() === currentTransferNumber}
                  className="px-3 py-2 rounded-md bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[12px] font-body font-semibold hover:bg-brand-cyan/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingTransfer ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
