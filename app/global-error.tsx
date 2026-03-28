'use client'

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
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
    <html>
      <body className="bg-[#07070D] text-[#F0EEF5]">
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mx-auto">
              <span className="text-[#ef4444] text-xl">!</span>
            </div>
            <h2 className="text-lg font-semibold">Algo salio mal</h2>
            <p className="text-sm text-[#9ca3af]">
              Ocurrio un error inesperado. Intenta recargar la pagina.
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg bg-brand-purple/15 text-brand-purple text-sm font-semibold hover:bg-brand-purple/25 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
