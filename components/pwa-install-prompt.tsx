'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check session-level dismiss first (prevents reappearing on every navigation)
    if (sessionStorage.getItem('pwa-dismissed-session')) return

    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
    setShowBanner(false)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    sessionStorage.setItem('pwa-dismissed-session', '1')
  }, [])

  if (!showBanner || isInstalled) return null

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-sm animate-fade-up">
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-purple/8 border border-brand-purple/15">
            <Download className="h-4 w-4 text-brand-purple" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-body font-semibold text-text-primary">Instalar SofIA</p>
            <p className="mt-0.5 text-[11px] font-body text-text-dim">
              Accede al dashboard desde tu pantalla de inicio
            </p>
          </div>
          <button onClick={handleDismiss} className="text-text-dim hover:text-text-muted transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={handleInstall}
            className="flex-1 rounded-md bg-brand-purple px-3 py-1.5 text-[12px] font-body font-semibold text-white transition-colors hover:bg-brand-purple-dark"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md px-3 py-1.5 text-[12px] font-body text-text-dim hover:text-text-muted transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
