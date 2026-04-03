'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function APIKeysError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const errorId = Date.now().toString(36).toUpperCase()

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="glass-card p-8 max-w-md text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center mx-auto">
          <span className="text-status-danger text-xl">!</span>
        </div>
        <h3 className="text-text-primary font-semibold">Error al cargar API Keys</h3>
        <p className="text-text-muted text-sm">
          Ocurrió un error inesperado. Intenta recargar la sección.
        </p>
        <p className="text-text-dim text-[10px] font-mono">Ref: {errorId}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-brand-purple/15 text-brand-purple text-sm font-semibold hover:bg-brand-purple/25 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
