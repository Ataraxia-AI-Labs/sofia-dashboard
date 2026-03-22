'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface RouteErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RouteErrorFallback({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const errorId = Date.now().toString(36).toUpperCase()
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-[400px] flex items-center justify-center p-5">
      <div className="glass-card p-5 max-w-sm text-center space-y-3">
        <div className="w-10 h-10 rounded-lg bg-status-danger/8 border border-status-danger/15 flex items-center justify-center mx-auto">
          <span className="text-status-danger text-sm font-mono font-bold">!</span>
        </div>
        <h3 className="text-text-primary font-mono font-semibold text-xs">Algo salio mal</h3>
        <p className="text-text-muted text-[10px] font-mono">
          Ocurrio un error inesperado. Intenta recargar la pagina.
        </p>
        {isDev && (
          <details className="text-left mt-2">
            <summary className="text-text-dim text-[9px] font-mono cursor-pointer hover:text-text-muted transition-colors">
              Detalles del error (solo desarrollo)
            </summary>
            <pre className="mt-1.5 p-2 rounded-md bg-surface-2 border border-border text-status-danger text-[9px] font-mono overflow-auto max-h-40 text-left whitespace-pre-wrap break-all">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        )}
        <p className="text-text-dim text-[9px] font-mono">Ref: {error.digest || errorId}</p>
        <button
          onClick={() => reset()}
          className="px-3 py-1.5 rounded-md bg-brand-purple/10 text-brand-purple text-[10px] font-mono font-semibold hover:bg-brand-purple/20 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
