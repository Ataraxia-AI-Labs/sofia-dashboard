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
    const res = await authFetch(`${API_URL}/api/webchat/${orgId}/config`)
    if (!res.ok) return DEFAULT_CONFIG
    return res.json()
  } catch { return DEFAULT_CONFIG }
}

async function updateWebchatConfig(orgId: string, data: Partial<WebchatConfig>): Promise<boolean> {
  try {
    const res = await authFetch(`${API_URL}/api/webchat/${orgId}/config`, {
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

  const embedCode = `<script src="https://sofia-widget.vercel.app/widget.js" data-org-id="${orgId}" data-color="${config.primary_color}" data-position="${config.position}" async></script>`

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
        <div className="relative h-32 bg-surface-2 rounded-lg border border-border overflow-hidden">
          <div className={`absolute ${config.position === 'bottom-right' ? 'right-4' : 'left-4'} bottom-4 flex flex-col items-${config.position === 'bottom-right' ? 'end' : 'start'} gap-2`}>
            <div className="bg-white rounded-lg shadow-lg p-3 max-w-[200px] border">
              <p className="text-[9px] text-text-primary">{config.welcome_message}</p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
              style={{ backgroundColor: config.primary_color }}
            >
              <MessageCircle size={20} className="text-white" />
            </div>
          </div>
        </div>
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
