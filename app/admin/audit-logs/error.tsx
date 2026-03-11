'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Shield, RefreshCw } from 'lucide-react'

export default function AuditLogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="max-w-[1400px] flex items-center justify-center min-h-[400px]">
      <div className="glass-card p-8 text-center max-w-md">
        <Shield size={36} className="mx-auto text-status-danger mb-4" />
        <h2 className="text-base font-semibold text-text-primary mb-2">
          Error al cargar Audit Log
        </h2>
        <p className="text-text-dim text-xs mb-6">
          {error.message || 'Ocurrió un error inesperado.'}
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-5 py-2 rounded-xl bg-brand-purple/15 text-brand-purple font-semibold text-sm hover:bg-brand-purple/25 transition-colors"
        >
          <RefreshCw size={14} />
          Reintentar
        </button>
      </div>
    </div>
  )
}
