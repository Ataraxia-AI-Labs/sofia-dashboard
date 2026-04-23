'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, Lock, Sparkles, Command } from 'lucide-react'
import {
  toolsByCategory,
  flattenForKeyboard,
  canUseTool,
  CATEGORY_LABELS,
  type ToolDef,
  type ToolRole,
} from '@/lib/tool-registry'

interface ToolMarketplaceProps {
  open: boolean
  onClose: () => void
  userRole: ToolRole
  onPickTool: (tool: ToolDef) => void
  initialQuery?: string
}

/**
 * Command-palette tipo Linear/Raycast — Cmd+K.
 * Lenguaje Hyprland + Sentient: naked items, LiquidGlass backdrop,
 * hairlines lila gradient, rounded-2xl, sin cards opacos.
 */
export function ToolMarketplace({ open, onClose, userRole, onPickTool, initialQuery = '' }: ToolMarketplaceProps) {
  const [query, setQuery] = useState(initialQuery)
  const [activeIdx, setActiveIdx] = useState(0)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Grouped + flattened
  const grouped = useMemo(() => toolsByCategory(userRole, query), [userRole, query])
  const flat = useMemo(() => flattenForKeyboard(grouped), [grouped])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setActiveIdx(0)
      // Focus delay for smooth animation
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, initialQuery])

  // Clamp active index
  useEffect(() => {
    if (activeIdx >= flat.length) setActiveIdx(Math.max(0, flat.length - 1))
  }, [flat.length, activeIdx])

  // Keyboard handlers
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, flat.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const tool = flat[activeIdx]
        if (tool && canUseTool(userRole, tool) && tool.status === 'live') {
          onPickTool(tool)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, activeIdx, flat, userRole, onPickTool, onClose])

  // Scroll active into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector<HTMLButtonElement>(`[data-idx="${activeIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIdx, open])

  if (!open || !mounted) return null

  // Build flat order map for highlighting
  const indexOf = (tool: ToolDef) => flat.findIndex(t => t.id === tool.id)

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop blur para toda la pantalla */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'rgba(5,5,11,0.55)',
          backdropFilter: 'blur(12px) saturate(120%)',
          WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        }}
      />
      {/* Palette */}
      <div
        className="relative w-[640px] max-w-[92vw] rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, rgb(var(--color-surface-rgb) / 0.92) 0%, rgb(var(--color-surface-2-rgb) / 0.88) 100%)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          boxShadow:
            '0 0 0 1px rgba(139,92,246,0.18), 0 1px 0 0 rgba(255,255,255,0.06) inset, 0 28px 56px -8px rgba(0,0,0,0.65), 0 0 40px -6px rgba(139,92,246,0.28)',
        }}
      >
        {/* Hyprland hairlines */}
        <span aria-hidden className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.45), transparent)' }} />
        <span aria-hidden className="pointer-events-none absolute inset-x-4 bottom-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.22), transparent)' }} />

        {/* Header */}
        <div className="relative flex items-center gap-2 px-4 pt-3.5 pb-2">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-4 bottom-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.22) 50%, transparent)' }}
          />
          <Sparkles size={13} strokeWidth={1.6} className="text-brand-purple shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-mono shrink-0">
            Capacidades de SofIA
          </span>
          <span className="flex-1" />
          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-text-dim">
            <Command size={9} strokeWidth={1.6} /> K
          </span>
        </div>

        {/* Search */}
        <div className="relative px-4 pt-3 pb-2">
          <Search size={12} strokeWidth={1.8}
            className="pointer-events-none absolute left-6 top-1/2 -translate-y-[calc(50%-2px)] text-text-dim" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            placeholder="Busca una capacidad…"
            className="w-full bg-transparent text-text-primary text-[13px] rounded-md pl-6 pr-2 py-1.5 outline-none font-body placeholder:text-text-dim"
          />
        </div>

        {/* List */}
        <div
          ref={listRef}
          className="max-h-[56vh] overflow-y-auto scrollbar-hide px-2 pb-2 space-y-2"
        >
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center text-[11px] font-body text-text-dim">
              Ninguna capacidad coincide con <span className="text-text-primary">"{query}"</span>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([cat, tools]) => (
              <div key={cat} className="space-y-0.5">
                <div className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest text-text-dim font-mono">
                  {CATEGORY_LABELS[cat]}
                </div>
                <div>
                  {tools.map(tool => {
                    const idx = indexOf(tool)
                    const allowed = canUseTool(userRole, tool)
                    const isSoon = tool.status === 'soon'
                    const isActive = idx === activeIdx
                    const disabled = !allowed || isSoon
                    return (
                      <button
                        key={tool.id}
                        data-idx={idx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => {
                          if (disabled) return
                          onPickTool(tool)
                        }}
                        disabled={disabled}
                        className={[
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                          'hyp-tool-row',
                          isActive
                            ? 'bg-gradient-to-r from-brand-purple/10 via-brand-purple/6 to-transparent'
                            : 'hover:bg-brand-purple/5',
                          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                      >
                        <tool.icon
                          size={14}
                          strokeWidth={isActive ? 1.9 : 1.6}
                          className={isActive ? 'text-brand-purple' : 'text-text-dim'}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={[
                              'text-[12px] font-body truncate',
                              isActive ? 'text-text-primary font-medium' : 'text-text-muted',
                            ].join(' ')}>
                              {tool.label}
                            </span>
                            {tool.hot && !isSoon && (
                              <span className="text-[8px] font-mono uppercase text-brand-purple/80 tracking-wider">hot</span>
                            )}
                            {isSoon && (
                              <span className="text-[8px] font-mono uppercase text-text-dim tracking-wider">pronto</span>
                            )}
                            {!allowed && (
                              <Lock size={9} strokeWidth={1.6} className="text-text-dim" />
                            )}
                          </div>
                          <div className="text-[10.5px] text-text-dim font-body truncate leading-tight mt-px">
                            {tool.description}
                          </div>
                        </div>
                        {!allowed ? (
                          <span className="text-[8.5px] font-mono uppercase text-text-dim tracking-wider">
                            {tool.minRole.toLowerCase()}
                          </span>
                        ) : !isSoon && isActive ? (
                          <span className="text-[9px] font-mono uppercase text-brand-purple/80 tracking-wider">
                            ↵
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint — Hyprland keyboard legend */}
        <div className="relative flex items-center justify-between gap-3 px-4 py-2 text-[9px] font-mono text-text-dim uppercase tracking-[0.16em]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.18) 50%, transparent)' }}
          />
          <span>↑↓ navegar</span>
          <span>↵ seleccionar</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
