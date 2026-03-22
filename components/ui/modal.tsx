'use client'

import { useEffect, useCallback, useRef } from 'react'
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

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, description, children, size = 'md', showClose = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab' || !panelRef.current) return

    const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [onClose])

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      // Auto-focus first focusable element inside modal
      requestAnimationFrame(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
        first?.focus()
      })
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      // Return focus to the element that opened the modal
      previousFocusRef.current?.focus()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title || 'Modal'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div ref={panelRef} className={clsx(
        'relative w-full bg-surface border border-border rounded-lg animate-fade-up overflow-hidden',
        sizeStyles[size],
      )}>
        {(title || showClose) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-0">
            <div>
              {title && <h3 className="text-xs font-mono font-semibold text-text-primary">{title}</h3>}
              {description && <p className="text-[10px] font-mono text-text-dim mt-0.5">{description}</p>}
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
