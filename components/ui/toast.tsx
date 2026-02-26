'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import clsx from 'clsx'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-status-success flex-shrink-0" />,
  error: <XCircle size={16} className="text-status-danger flex-shrink-0" />,
  warning: <AlertTriangle size={16} className="text-status-warning flex-shrink-0" />,
  info: <Info size={16} className="text-status-info flex-shrink-0" />,
}

const bgMap: Record<ToastType, string> = {
  success: 'border-status-success/20 bg-status-success/5',
  error: 'border-status-danger/20 bg-status-danger/5',
  warning: 'border-status-warning/20 bg-status-warning/5',
  info: 'border-status-info/20 bg-status-info/5',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const value: ToastContextValue = {
    toast: addToast,
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info: (msg) => addToast('info', msg),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg shadow-black/20 animate-slide-in min-w-[280px] max-w-[420px]',
              bgMap[t.type],
            )}
          >
            {iconMap[t.type]}
            <p className="text-text-primary text-sm flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-text-dim hover:text-text-muted transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
