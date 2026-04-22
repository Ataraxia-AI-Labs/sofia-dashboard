'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  label: string
  children: React.ReactNode
  side?: 'right' | 'top' | 'bottom' | 'left'
  delay?: number
  kbd?: string
  className?: string
}

/**
 * Minimal floating tooltip chip — Vapi/Linear style.
 * Positioned fixed so it escapes any overflow:hidden ancestors.
 */
export function Tooltip({ label, children, side = 'right', delay = 150, kbd, className = '' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      let x = rect.right + 10
      let y = rect.top + rect.height / 2
      if (side === 'left') { x = rect.left - 10; y = rect.top + rect.height / 2 }
      if (side === 'top') { x = rect.left + rect.width / 2; y = rect.top - 8 }
      if (side === 'bottom') { x = rect.left + rect.width / 2; y = rect.bottom + 8 }
      setCoords({ x, y })
      setOpen(true)
    }, delay)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpen(false)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const transform =
    side === 'right' ? 'translate(0, -50%)' :
    side === 'left' ? 'translate(-100%, -50%)' :
    side === 'top' ? 'translate(-50%, -100%)' :
    'translate(-50%, 0)'

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`inline-flex ${className}`}
      >
        {children}
      </span>
      {open && mounted && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            transform,
            zIndex: 9999,
          }}
          className="pointer-events-none animate-fade-in"
        >
          <div className="flex items-center gap-1.5 bg-surface-2/95 backdrop-blur-md border border-border/60 text-text-primary text-[11px] font-body font-medium px-2.5 py-1 rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.4)] whitespace-nowrap">
            <span>{label}</span>
            {kbd && (
              <kbd className="text-[10px] font-mono text-text-dim bg-surface border border-border/60 rounded px-1 py-px">{kbd}</kbd>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
