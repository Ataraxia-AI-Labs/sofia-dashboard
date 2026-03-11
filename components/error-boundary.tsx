'use client'

import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  eventId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, eventId: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, eventId: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    })
    this.setState({ eventId })
  }

  render() {
    if (this.state.hasError) {
      // Generate a short error ID for support reference (never expose internal message to user)
      const errorId = Date.now().toString(36).toUpperCase()
      const isDev = process.env.NODE_ENV === 'development'

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="glass-card p-8 max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center mx-auto">
              <span className="text-status-danger text-xl">!</span>
            </div>
            <h3 className="text-text-primary font-semibold">Algo salió mal</h3>
            <p className="text-text-muted text-sm">
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
            {isDev && this.state.error && (
              <details className="text-left mt-2">
                <summary className="text-text-dim text-xs cursor-pointer hover:text-text-muted transition-colors">
                  Detalles del error (solo desarrollo)
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-surface-1 border border-border text-status-danger text-[10px] font-mono overflow-auto max-h-48 text-left whitespace-pre-wrap break-all">
                  {this.state.error.message}
                  {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                </pre>
              </details>
            )}
            <p className="text-text-dim text-[10px] font-mono">Ref: {this.state.eventId || errorId}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-brand-purple/15 text-brand-purple text-sm font-semibold hover:bg-brand-purple/25 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
