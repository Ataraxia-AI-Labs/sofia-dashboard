'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // S133 PWA-008: surface SW registration failures to Sentry. Was a
      // silent no-op so when the SW broke (cache mismatch, fetch handler
      // throwing, scope conflict) we had no signal in monitoring. Tagged
      // by feature so the noise stays filterable.
      import('@sentry/nextjs')
        .then((Sentry) => Sentry.captureException(err, {
          tags: { feature: 'pwa', component: 'sw-register' },
          level: 'warning',
        }))
        .catch(() => { /* Sentry optional in dev */ })
    })
  }, [])

  return null
}
