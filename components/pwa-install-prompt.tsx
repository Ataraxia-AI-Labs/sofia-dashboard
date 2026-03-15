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
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user dismissed before (respect for 7 days)
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
  }, [])

  if (!showBanner || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl border border-white/10 bg-[#12121A] p-4 shadow-2xl shadow-purple-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-emerald-500/20">
            <Download className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Instalar SofIA</p>
            <p className="mt-0.5 text-xs text-white/50">
              Accede al dashboard desde tu pantalla de inicio
            </p>
          </div>
          <button onClick={handleDismiss} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3 py-2 text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
