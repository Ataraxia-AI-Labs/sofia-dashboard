'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Search, LayoutDashboard, Users, Calendar, MessageSquare, Kanban, Target,
  CreditCard, Database, Activity, UserCog, Settings, Gem, Receipt, X,
} from 'lucide-react'
import clsx from 'clsx'

interface CommandDef {
  id: string
  navKey: string
  descKey: string
  icon: React.ElementType
  href: string
  shortcut?: string
}

const COMMAND_DEFS: CommandDef[] = [
  { id: 'overview', navKey: 'overview', descKey: 'overview', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'pacientes', navKey: 'patients', descKey: 'patients', icon: Users, href: '/dashboard/pacientes', shortcut: 'Ctrl+N' },
  { id: 'calendario', navKey: 'calendar', descKey: 'calendar', icon: Calendar, href: '/dashboard/calendario', shortcut: 'Ctrl+Shift+A' },
  { id: 'conversaciones', navKey: 'conversations', descKey: 'conversations', icon: MessageSquare, href: '/dashboard/conversaciones' },
  { id: 'pipeline', navKey: 'pipeline', descKey: 'pipeline', icon: Kanban, href: '/dashboard/pipeline' },
  { id: 'oportunidades', navKey: 'opportunities', descKey: 'opportunities', icon: Target, href: '/dashboard/oportunidades' },
  { id: 'pagos', navKey: 'payments', descKey: 'payments', icon: CreditCard, href: '/dashboard/pagos' },
  { id: 'equipo', navKey: 'team', descKey: 'team', icon: UserCog, href: '/dashboard/equipo' },
  { id: 'datalake', navKey: 'datalake', descKey: 'datalake', icon: Database, href: '/dashboard/datalake' },
  { id: 'health', navKey: 'systemHealth', descKey: 'health', icon: Activity, href: '/dashboard/health' },
  { id: 'planes', navKey: 'plans', descKey: 'plans', icon: Gem, href: '/dashboard/planes' },
  { id: 'facturacion', navKey: 'billing', descKey: 'billing', icon: Receipt, href: '/dashboard/facturacion' },
  { id: 'ajustes', navKey: 'config', descKey: 'settings', icon: Settings, href: '/dashboard/ajustes' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const tNav = useTranslations('nav')
  const tCmd = useTranslations('commandPalette')
  const tCommon = useTranslations('common')
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = COMMAND_DEFS.map(def => ({
    ...def,
    label: tNav(def.navKey),
    description: tCmd(def.descKey),
  }))

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  // Focus input and reset state when palette opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlighted(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Reset highlighted index when search results change
  useEffect(() => {
    setHighlighted(0)
  }, [query])

  // Keyboard navigation within the palette
  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlighted(h => Math.min(h + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlighted(h => Math.max(h - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[highlighted]) navigate(filtered[highlighted].href)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, filtered, highlighted, navigate, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={tCommon('searchPages')}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-lg animate-fade-up overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-dim flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tCommon('searchPages')}
            className="flex-1 bg-transparent text-text-primary text-xs font-mono placeholder:text-text-dim outline-none"
            autoComplete="off"
            aria-label={tCommon('searchPages')}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-text-dim hover:text-text-primary transition-colors"
              aria-label={tCommon('close')}
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-dim text-[10px] font-mono">
            esc
          </kbd>
        </div>

        {/* Results list */}
        <ul className="max-h-80 overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-text-dim text-[10px] font-mono">
              {tCommon('noResults')} &quot;{query}&quot;
            </li>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              return (
                <li key={item.id} role="option" aria-selected={idx === highlighted}>
                  <button
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      idx === highlighted
                        ? 'bg-brand-purple/10 text-text-primary'
                        : 'text-text-muted hover:bg-surface-2 hover:text-text-primary',
                    )}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setHighlighted(idx)}
                  >
                    <div className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                      idx === highlighted
                        ? 'bg-brand-purple/20 text-brand-purple'
                        : 'bg-surface-2 text-text-dim',
                    )}>
                      <Icon size={14} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-medium">{item.label}</div>
                      <div className="text-[9px] font-mono text-text-dim">{item.description}</div>
                    </div>
                    {item.shortcut && (
                      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-dim text-[10px] font-mono flex-shrink-0">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                </li>
              )
            })
          )}
        </ul>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-text-dim">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-surface-2 border border-border font-mono">↑↓</kbd>
              nav
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-surface-2 border border-border font-mono">↵</kbd>
              go
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-text-dim">
            <kbd className="px-1 rounded bg-surface-2 border border-border font-mono">Ctrl+?</kbd>
            shortcuts
          </span>
        </div>
      </div>
    </div>
  )
}
