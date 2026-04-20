'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { generatePortalToken } from '@/lib/api/portal'
import { Link, Copy, Check, Loader2, MessageCircle, ExternalLink } from 'lucide-react'

interface PortalLinkGeneratorProps {
  orgId: string
  patientId: string
  patientName?: string
  compact?: boolean
  className?: string
}

export function PortalLinkGenerator({
  orgId,
  patientId,
  patientName,
  compact = false,
  className = '',
}: PortalLinkGeneratorProps) {
  const t = useTranslations('portal')

  const [generating, setGenerating] = useState(false)
  const [portalUrl, setPortalUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const result = await generatePortalToken(orgId, patientId)
      if (result) {
        const url = `${window.location.origin}/portal/${result.token}`
        setPortalUrl(url)
      } else {
        setError(t('generateError'))
      }
    } catch {
      setError(t('generateError'))
    }
    setGenerating(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const name = patientName ? patientName.split(' ')[0] : ''
    const msg = encodeURIComponent(
      `Hola ${name}! Aqui puedes ver tus citas, puntos y mas: ${portalUrl}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  // Not generated yet — show button
  if (!portalUrl) {
    return (
      <div className={className}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`flex items-center gap-1.5 font-semibold transition-colors disabled:opacity-50 ${
            compact
              ? 'px-2 py-1 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[12px] font-body hover:bg-brand-purple/15'
              : 'px-2.5 py-1.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[12px] font-body hover:bg-brand-purple/15'
          }`}
        >
          {generating ? (
            <Loader2 size={compact ? 10 : 12} className="animate-spin" />
          ) : (
            <Link size={compact ? 10 : 12} />
          )}
          {t('generateLink')}
        </button>
        {error && <p className="text-[11px] font-body text-status-danger mt-1">{error}</p>}
      </div>
    )
  }

  // Generated — show link + copy + WhatsApp
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border">
          <p className="text-[10px] text-text-muted truncate font-body">{portalUrl}</p>
        </div>
        <button
          onClick={handleCopy}
          className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-brand-purple transition-colors flex-shrink-0"
          title={t('copy')}
        >
          {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
        </button>
        <button
          onClick={handleWhatsApp}
          className="w-7 h-7 rounded-lg bg-status-success/10 border border-status-success/20 flex items-center justify-center text-status-success hover:bg-status-success/20 transition-colors flex-shrink-0"
          title={t('sendWhatsApp')}
        >
          <MessageCircle size={12} />
        </button>
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-brand-purple transition-colors flex-shrink-0"
          title={t('openPortal')}
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}
