'use client'

import { useState, useRef, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Lock, ChevronRight } from 'lucide-react'
import { getSubpages } from '@/lib/nav-subpages'

interface Props {
  href: string
  icon: LucideIcon
  label: string
  isActive: boolean
  locked?: boolean
  onNavigate: (href: string) => void
}

/**
 * Hyprland-style naked floating icon.
 * - Sin bg ni border. Solo el SVG flotante.
 * - Hover: icon brilla (text-primary) + drop-shadow morado + translate-x micro.
 * - Active: text-brand-purple + dot indicator + glow.
 * - Mini-panel glass ramificado si el href tiene subpaginas; tooltip chip si no.
 */
export function SidebarNavButton({ href, icon: Icon, label, isActive, locked, onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const timer = useRef<NodeJS.Timeout | null>(null)

  const subpages = getSubpages(href)
  const hasSubpages = !locked && !!subpages && subpages.length > 0

  const show = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const rect = wrapRef.current?.getBoundingClientRect()
      if (!rect) return
      // Panel grows DOWNWARD from icon top — avoids collision with topbars/searchbars of inner pages
      const estHeight = hasSubpages ? (subpages!.length * 36 + 44) : 28
      const vh = typeof window !== 'undefined' ? window.innerHeight : 900
      let y = rect.top
      // If panel would overflow bottom, push up
      if (y + estHeight > vh - 12) {
        y = Math.max(12, vh - estHeight - 12)
      }
      setCoords({ x: rect.right + 8, y })
      setOpen(true)
    }, 100)
  }

  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <>
      <div
        ref={wrapRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="relative flex justify-center"
      >
        <button
          onClick={() => onNavigate(locked ? '/dashboard/planes' : href)}
          aria-label={locked ? `${label} — próximamente` : label}
          aria-current={isActive ? 'page' : undefined}
          className={`
            group relative w-7 h-7 flex items-center justify-center rounded-md
            transition-all duration-150 ease-out
            active:scale-[0.9]
            ${locked
              ? 'text-text-dim/35 hover:text-text-muted hover:translate-x-[1px]'
              : isActive
                ? 'text-brand-purple drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]'
                : 'text-text-dim hover:text-text-primary hover:translate-x-[1px] hover:drop-shadow-[0_0_4px_rgba(139,92,246,0.35)]'
            }
          `}
        >
          <Icon size={15} strokeWidth={isActive ? 2 : 1.6} />
          {isActive && (
            <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-brand-purple rounded-full shadow-[0_0_5px_rgba(139,92,246,0.7)]" />
          )}
          {locked && (
            <Lock size={6} className="absolute -top-0.5 -right-0.5 text-text-dim/50" />
          )}
        </button>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            zIndex: 9999,
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
          className="pointer-events-auto animate-sentient-float-in"
        >
          {hasSubpages ? (
            <div className="relative bg-surface/60 backdrop-blur-2xl border border-brand-purple/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_20px_-8px_rgba(139,92,246,0.25)] p-1.5 min-w-[160px]">
              {/* Connecting dot — suggests branch */}
              <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-brand-purple/50" />

              <div className="px-2 pt-0.5 pb-1 text-[10px] font-body font-semibold uppercase tracking-[0.12em] text-text-dim flex items-center gap-1">
                {label}
                {locked && <Lock size={8} className="text-text-dim/60" />}
              </div>
              <div className="space-y-px">
                {subpages!.map(sp => (
                  <button
                    key={sp.href}
                    onClick={() => { onNavigate(sp.href); setOpen(false) }}
                    className="w-full group/item flex items-center gap-1.5 px-2 py-1 rounded-md text-left hover:bg-surface-2/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-body text-text-primary truncate leading-tight">{sp.label}</div>
                      {sp.description && (
                        <div className="text-[9.5px] font-body text-text-dim truncate leading-tight mt-0.5">{sp.description}</div>
                      )}
                    </div>
                    <ChevronRight size={9} className="text-text-dim/0 group-hover/item:text-brand-purple transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative bg-surface-2/90 backdrop-blur-md border border-border/50 text-text-primary text-[10.5px] font-body font-medium px-2 py-0.5 rounded-md shadow-[0_3px_12px_rgba(0,0,0,0.4)] whitespace-nowrap flex items-center gap-1">
              <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-0.5 rounded-full bg-brand-purple/60" />
              <span>{label}</span>
              {locked && <Lock size={8} className="text-text-dim/60" />}
            </div>
          )}
        </div>
      )}
    </>
  )
}
