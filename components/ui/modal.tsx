'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showClose?: boolean
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, description, children, size = 'md', showClose = true }: ModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={clsx(
        'relative w-full bg-surface border border-border rounded-2xl shadow-2xl shadow-black/40 animate-fade-up overflow-hidden',
        sizeStyles[size],
      )}>
        {(title || showClose) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-0">
            <div>
              {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
              {description && <p className="text-xs text-text-dim mt-0.5">{description}</p>}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors -mt-0.5"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
