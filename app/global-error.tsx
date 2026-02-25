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
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <h2 className="text-lg font-semibold">Algo salio mal</h2>
            <p className="text-sm text-gray-400">
              Ocurrio un error inesperado. Intenta recargar la pagina.
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg bg-purple-600/15 text-purple-400 text-sm font-semibold hover:bg-purple-600/25 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
