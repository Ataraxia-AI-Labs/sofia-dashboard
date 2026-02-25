'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  const errorId = Date.now().toString(36).toUpperCase()

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="glass-card p-8 max-w-md text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center mx-auto">
          <span className="text-status-danger text-xl">!</span>
        </div>
        <h3 className="text-text-primary font-semibold">Error en Admin</h3>
        <p className="text-text-muted text-sm">
          Ocurrio un error inesperado en el panel de admin. Intenta recargar.
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
