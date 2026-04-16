'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { API_URL, authFetch } from '@/lib/api/helpers'
import { MessageCircle, Copy, Check, Eye, Code } from 'lucide-react'

interface WebchatConfig {
  enabled: boolean
  position: 'bottom-right' | 'bottom-left'
  primary_color: string
  welcome_message: string
  allowed_domains: string[]
  auto_open_delay_ms: number
  avatar_url: string | null
  bubble_text: string
}

const DEFAULT_CONFIG: WebchatConfig = {
  enabled: false,
  position: 'bottom-right',
  primary_color: '#7C3AED',
  welcome_message: 'Hola! ¿En qué podemos ayudarte?',
  allowed_domains: [],
  auto_open_delay_ms: 0,
  avatar_url: null,
  bubble_text: 'Chatea con nosotros',
}

async function getWebchatConfig(orgId: string): Promise<WebchatConfig> {
  try {
    const res = await authFetch(`${API_URL}/webchat/${orgId}/config`)
    if (!res.ok) return DEFAULT_CONFIG
    return res.json()
  } catch { return DEFAULT_CONFIG }
}

async function updateWebchatConfig(orgId: string, data: Partial<WebchatConfig>): Promise<boolean> {
  try {
    const res = await authFetch(`${API_URL}/webchat/${orgId}/config`, {
      method: 'PATCH', body: JSON.stringify(data),
    })
    return res.ok
  } catch { return false }
}

interface Props {
  orgId: string
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

export function WebchatTab({ orgId, isReadOnly, onMessage }: Props) {
  const t = useTranslations('settings')
  const [config, setConfig] = useState<WebchatConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [domainsText, setDomainsText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const cfg = await getWebchatConfig(orgId)
    setConfig(cfg)
    setDomainsText(cfg.allowed_domains.join('\n'))
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (isReadOnly) return
    setSaving(true)
    const domains = domainsText.split('\n').map(d => d.trim()).filter(Boolean)
    const ok = await updateWebchatConfig(orgId, { ...config, allowed_domains: domains })
    if (ok) {
      onMessage(t('webchat.saved') || 'Configuración guardada')
    } else {
      onMessage('Error al guardar configuración')
    }
    setSaving(false)
  }

  const widgetOrigin = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://sofia-dashboard-mu.vercel.app')
  const embedCode = `<script src="${widgetOrigin}/widget.js" data-org-id="${orgId}" data-color="${config.primary_color}" data-position="${config.position}" async></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-3 bg-surface-3 rounded w-32 mb-2" />
            <div className="h-8 bg-surface-3 rounded w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-mono font-semibold uppercase tracking-wide text-text-primary flex items-center gap-1.5">
              <MessageCircle size={13} className="text-brand-purple" />
              Web Chat Widget
            </h3>
            <p className="text-[9px] font-mono text-text-dim mt-0.5">{t('webchat.desc') || 'Widget embebible para tu sitio web'}</p>
          </div>
          <button
            onClick={() => !isReadOnly && setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            disabled={isReadOnly}
            className={`relative w-10 h-5 rounded-full transition-colors ${config.enabled ? 'bg-brand-purple' : 'bg-surface-3 border border-border'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.enabled ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-[10px] font-mono font-semibold text-text-primary flex items-center gap-1.5">
          <Eye size={12} className="text-text-dim" />
          {t('webchat.appearance') || 'Apariencia'}
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-mono text-text-dim uppercase tracking-wider block mb-1">{t('webchat.color') || 'Color primario'}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.primary_color}
                onChange={e => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                disabled={isReadOnly}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={config.primary_color}
                onChange={e => setConfig(prev => ({ ...prev, primary_color: e.target.value }))}
                disabled={isReadOnly}
                className="flex-1 text-[10px] font-mono bg-surface border border-border rounded px-2 py-1.5 text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-mono text-text-dim uppercase tracking-wider block mb-1">{t('webchat.position') || 'Posición'}</label>
            <select
              value={config.position}
              onChange={e => setConfig(prev => ({ ...prev, position: e.target.value as WebchatConfig['position'] }))}
              disabled={isReadOnly}
              className="w-full text-[10px] font-mono bg-surface border border-border rounded px-2 py-1.5 text-text-primary"
            >
              <option value="bottom-right">{t('webchat.bottomRight') || 'Abajo derecha'}</option>
              <option value="bottom-left">{t('webchat.bottomLeft') || 'Abajo izquierda'}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[9px] font-mono text-text-dim uppercase tracking-wider block mb-1">{t('webchat.bubbleText') || 'Texto del botón'}</label>
          <input
            type="text"
            value={config.bubble_text}
            onChange={e => setConfig(prev => ({ ...prev, bubble_text: e.target.value }))}
            disabled={isReadOnly}
            className="w-full text-[10px] font-mono bg-surface border border-border rounded px-2 py-1.5 text-text-primary"
          />
        </div>

        <div>
          <label className="text-[9px] font-mono text-text-dim uppercase tracking-wider block mb-1">{t('webchat.welcome') || 'Mensaje de bienvenida'}</label>
          <textarea
            value={config.welcome_message}
            onChange={e => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
            disabled={isReadOnly}
            rows={2}
            className="w-full text-[10px] font-mono bg-surface border border-border rounded px-2 py-1.5 text-text-primary resize-none"
          />
        </div>

        <div>
          <label className="text-[9px] font-mono text-text-dim uppercase tracking-wider block mb-1">{t('webchat.autoOpen') || 'Auto-abrir después de (ms, 0 = desactivado)'}</label>
          <input
            type="number"
            value={config.auto_open_delay_ms}
            onChange={e => setConfig(prev => ({ ...prev, auto_open_delay_ms: parseInt(e.target.value) || 0 }))}
            disabled={isReadOnly}
            className="w-32 text-[10px] font-mono bg-surface border border-border rounded px-2 py-1.5 text-text-primary"
          />
        </div>
      </div>

      {/* Security */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-[10px] font-mono font-semibold text-text-primary">{t('webchat.security') || 'Dominios permitidos'}</h4>
        <p className="text-[9px] font-mono text-text-dim">{t('webchat.domainsHint') || 'Un dominio por línea. Dejar vacío para permitir todos.'}</p>
        <textarea
          value={domainsText}
          onChange={e => setDomainsText(e.target.value)}
          disabled={isReadOnly}
          rows={3}
          placeholder="www.miclinica.com&#10;miclinica.com"
          className="w-full text-[10px] font-mono bg-surface border border-border rounded px-2 py-1.5 text-text-primary resize-none"
        />
      </div>

      {/* Embed Code */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-[10px] font-mono font-semibold text-text-primary flex items-center gap-1.5">
          <Code size={12} className="text-text-dim" />
          {t('webchat.embedCode') || 'Código de instalación'}
        </h4>
        <p className="text-[9px] font-mono text-text-dim">{t('webchat.embedHint') || 'Pega este código antes de </body> en tu sitio web.'}</p>
        <div className="relative">
          <pre className="text-[9px] font-mono bg-surface border border-border rounded p-3 text-text-muted overflow-x-auto whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded bg-surface-2 border border-border text-text-dim hover:text-text-primary transition-colors"
          >
            {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="glass-card p-4">
        <h4 className="text-[10px] font-mono font-semibold text-text-primary mb-3">{t('webchat.preview') || 'Vista previa'}</h4>
        <div className="relative h-[440px] bg-gradient-to-br from-surface-2 to-surface rounded-lg border border-border overflow-hidden">
          {/* Fake webpage backdrop */}
          <div className="absolute inset-0 p-4">
            <div className="h-2 w-24 bg-surface-3 rounded mb-2" />
            <div className="h-1.5 w-full bg-surface-3/60 rounded mb-1" />
            <div className="h-1.5 w-3/4 bg-surface-3/60 rounded mb-1" />
            <div className="h-1.5 w-5/6 bg-surface-3/60 rounded" />
          </div>

          {/* Opened widget window — matches live widget 1:1 */}
          <div
            className={`absolute ${config.position === 'bottom-right' ? 'right-4' : 'left-4'} bottom-4 w-[300px]`}
            style={{ fontFamily: "'Geist', -apple-system, system-ui, sans-serif" }}
          >
            <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ height: 380, boxShadow: '0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.06)' }}>
              {/* Header */}
              <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: config.primary_color, color: '#fff' }}>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-semibold">
                  {(config.bubble_text || 'SofIA').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SofIA</div>
                  <div className="text-[7px] opacity-80 uppercase tracking-[1px] flex items-center gap-1 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span className="w-1 h-1 rounded-full bg-green-400" /> EN LINEA
                  </div>
                </div>
                <span className="text-[16px] opacity-80 leading-none font-light">&times;</span>
              </div>
              {/* Messages */}
              <div className="flex-1 px-3 py-3 flex flex-col gap-2 overflow-hidden" style={{ background: '#f8f8fa' }}>
                <div className="self-start max-w-[80%] bg-white rounded-[14px] px-2.5 py-1.5 text-[10px] text-gray-800 leading-snug" style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)' }}>
                  {config.welcome_message}
                </div>
                <div className="self-end max-w-[80%] rounded-[14px] px-2.5 py-1.5 text-[10px] text-white leading-snug" style={{ background: config.primary_color, boxShadow: `0 2px 6px ${config.primary_color}33` }}>
                  Hola, quiero agendar una cita
                </div>
                <div className="self-start max-w-[80%] bg-white rounded-[14px] px-2.5 py-1.5 text-[10px] text-gray-800 leading-snug" style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04)', border: '1px solid rgba(0,0,0,.04)' }}>
                  ¡Claro! ¿Que procedimiento te interesa?
                </div>
              </div>
              {/* Input */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white" style={{ borderTop: '1px solid #f0f0f3' }}>
                <div className="flex-1 h-7 rounded-full border border-gray-200 bg-[#f8f8fa] px-3 flex items-center text-[9px] text-gray-400">
                  Escribe un mensaje...
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: config.primary_color }}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </div>
              </div>
              <div className="text-center py-1 text-[6px] tracking-[1.5px] text-gray-400 uppercase bg-white" style={{ fontFamily: "'JetBrains Mono', monospace", borderTop: '1px solid #f3f4f6' }}>
                POWERED BY <span style={{ color: config.primary_color }} className="font-semibold">SOFIA</span>
              </div>
            </div>
          </div>

          {/* Bubble (closed state indicator) */}
          <div
            className={`absolute ${config.position === 'bottom-right' ? 'right-4' : 'left-4'} bottom-4 opacity-0 pointer-events-none`}
            aria-hidden
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: config.primary_color }}>
              <MessageCircle size={18} className="text-white" />
            </div>
          </div>
        </div>
        <p className="mt-2 text-[8px] font-mono text-text-dim uppercase tracking-wider">Asi se vera en el sitio web del cliente</p>
      </div>

      {/* Save */}
      {!isReadOnly && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple/90 transition-colors disabled:opacity-50"
        >
          {saving ? (t('saving') || 'Guardando...') : (t('webchat.save') || 'Guardar configuración')}
        </button>
      )}
    </div>
  )
}
