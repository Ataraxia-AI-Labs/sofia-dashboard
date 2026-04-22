'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Brain, Plus, Users, User, X, Search, Pencil, Trash2, Check, MessageCircle,
} from 'lucide-react'
import { Tooltip } from '@/components/ui'
import {
  listConsoleSessions,
  patchConsoleSession,
  deleteConsoleSession,
  type ConsoleSession,
} from '@/lib/api/console'

interface MemoryDropdownProps {
  canSeeTeam: boolean
  userId?: string
  orgId: string
  /** Exposed so the home page can open a selected session and trigger refresh */
  onOpenSession?: (sessionId: string) => void
  onNewThread?: () => void
  /** Increment this from parent to force reload (e.g. after new turn) */
  reloadKey?: number
}

function relTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'ahora'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const day = Math.floor(h / 24)
  if (day < 7) return `${day}d`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function MemoryDropdown({
  canSeeTeam,
  userId,
  orgId,
  onOpenSession,
  onNewThread,
  reloadKey,
}: MemoryDropdownProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<'mine' | 'team'>('mine')
  const [sessions, setSessions] = useState<ConsoleSession[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await listConsoleSessions({ scope, limit: 80 })
      setSessions(res.sessions)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [scope, orgId])

  useEffect(() => {
    if (open) load()
  }, [open, load, reloadKey])

  const filtered = useMemo(() => {
    if (!query.trim()) return sessions
    const q = query.trim().toLowerCase()
    return sessions.filter(s => (s.title || '').toLowerCase().includes(q))
  }, [sessions, query])

  const groups = useMemo(() => {
    const today: ConsoleSession[] = []
    const week: ConsoleSession[] = []
    const older: ConsoleSession[] = []
    const now = Date.now()
    filtered.forEach(s => {
      const t = s.last_message_at ? new Date(s.last_message_at).getTime() : 0
      const diffDays = (now - t) / 86_400_000
      if (diffDays < 1) today.push(s)
      else if (diffDays < 7) week.push(s)
      else older.push(s)
    })
    return { today, week, older }
  }, [filtered])

  const totalCount = sessions.length

  function openAt(sessionId: string) {
    setOpen(false)
    if (onOpenSession) onOpenSession(sessionId)
    else {
      const params = new URLSearchParams({ session: sessionId })
      router.push(`/dashboard?${params.toString()}`)
    }
  }

  function newThread() {
    setOpen(false)
    if (onNewThread) onNewThread()
    else router.push('/dashboard')
  }

  async function handleRename(sessionId: string, title: string) {
    const clean = title.trim().slice(0, 120)
    if (!clean) return
    try {
      await patchConsoleSession(sessionId, { org_id: orgId, title: clean })
      setSessions(rows => rows.map(r => (r.id === sessionId ? { ...r, title: clean } : r)))
    } catch {
      /* optimistic */
    } finally {
      setEditing(null)
      setDraftTitle('')
    }
  }

  async function handleArchive(sessionId: string) {
    try {
      await deleteConsoleSession(sessionId)
      setSessions(rows => rows.filter(r => r.id !== sessionId))
    } catch {
      /* silent */
    }
  }

  function renderItem(s: ConsoleSession) {
    const notOwn = !!userId && s.user_id !== userId
    const isEditing = editing === s.id
    return (
      <li key={s.id}>
        <div className="group relative rounded-lg px-2.5 py-2 hover:bg-surface-2/60 border border-transparent hover:border-border transition-colors cursor-pointer">
          {isEditing ? (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename(s.id, draftTitle)
                  if (e.key === 'Escape') {
                    setEditing(null)
                    setDraftTitle('')
                  }
                }}
                className="flex-1 bg-surface-3/60 text-text-primary text-[12px] rounded-md px-2 py-1 outline-none border border-border focus:border-brand-purple/40"
              />
              <button onClick={() => handleRename(s.id, draftTitle)} className="text-brand-purple hover:opacity-80" aria-label="Guardar">
                <Check size={13} strokeWidth={2} />
              </button>
              <button onClick={() => { setEditing(null); setDraftTitle('') }} className="text-text-dim hover:text-text-primary" aria-label="Cancelar">
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div onClick={() => openAt(s.id)}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-text-primary truncate flex-1 font-body">
                  {s.title || 'Sin título'}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-text-dim shrink-0 font-mono">
                  {relTime(s.last_message_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {notOwn && (
                  <span className="text-[9px] text-brand-purple/80 font-mono uppercase tracking-wider">
                    equipo
                  </span>
                )}
                <span className="text-[9px] text-text-dim font-mono uppercase tracking-wider">
                  {s.message_count} msgs
                </span>
              </div>
              <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notOwn && (
                  <button
                    onClick={e => { e.stopPropagation(); setEditing(s.id); setDraftTitle(s.title || '') }}
                    className="p-1 rounded hover:bg-surface-3/80 text-text-dim hover:text-text-primary"
                    aria-label="Renombrar"
                  >
                    <Pencil size={11} strokeWidth={1.8} />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleArchive(s.id) }}
                  className="p-1 rounded hover:bg-surface-3/80 text-text-dim hover:text-status-danger"
                  aria-label="Archivar"
                >
                  <Trash2 size={11} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          )}
        </div>
      </li>
    )
  }

  function renderGroup(label: string, items: ConsoleSession[]) {
    if (!items.length) return null
    return (
      <div className="space-y-0.5">
        <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-text-dim font-mono">
          {label}
        </div>
        <ul className="space-y-0.5">{items.map(renderItem)}</ul>
      </div>
    )
  }

  return (
    <div className="relative">
      <Tooltip label="Memoria — tu diálogo continuo con SofIA" side="left" delay={120}>
        <button
          onClick={() => setOpen(!open)}
          className="relative w-7 h-7 flex items-center justify-center rounded-md text-text-dim hover:text-text-primary hover:drop-shadow-[0_0_4px_rgba(139,92,246,0.35)] active:scale-[0.9] transition-all duration-150"
          aria-label="Memoria SofIA"
        >
          <Brain size={14} strokeWidth={1.6} />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-brand-purple/95 text-white text-[9px] font-mono font-semibold flex items-center justify-center">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          {/* LiquidGlass sibling of the sidebar capsule: same 22px blur +
              saturate. Body uses a denser base (~0.88) so text stays
              readable even with chat content showing through. */}
          <div
            className="absolute right-0 top-full mt-2 z-40 w-[360px] rounded-2xl overflow-hidden animate-fade-in"
            style={{
              background:
                'linear-gradient(180deg, rgb(var(--color-surface-rgb) / 0.88) 0%, rgb(var(--color-surface-2-rgb) / 0.82) 100%)',
              backdropFilter: 'blur(22px) saturate(150%)',
              WebkitBackdropFilter: 'blur(22px) saturate(150%)',
              boxShadow:
                '0 0 0 1px rgba(139,92,246,0.14), 0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 48px -8px rgba(0,0,0,0.55), 0 0 28px -6px rgba(139,92,246,0.22)',
            }}
          >
            {/* Hyprland hairline accents — match the sidebar capsule language. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.45), transparent)' }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3 bottom-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.22), transparent)' }}
            />
            <div className="relative flex items-center justify-between px-4 py-3">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 bottom-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.25) 50%, transparent)' }}
              />
              <div>
                <h3 className="text-[12px] font-body font-semibold text-text-primary flex items-center gap-1.5">
                  <Brain size={13} strokeWidth={1.6} className="text-brand-purple" />
                  Memoria viva
                </h3>
                <p className="text-[10px] text-text-dim font-body mt-0.5">
                  Cada conversación con SofIA se queda contigo.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={newThread}
                  className="p-1.5 rounded-lg bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple transition-colors"
                  aria-label="Nuevo diálogo"
                  title="Nuevo diálogo"
                >
                  <Plus size={13} strokeWidth={2} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-text-dim hover:text-text-primary transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="px-3 pt-3 pb-2 space-y-2">
              <div className="relative">
                <Search
                  size={12}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
                />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar en tu memoria…"
                  className="w-full bg-surface-2/60 text-text-primary text-[12px] rounded-lg pl-9 pr-3 py-2 outline-none border border-border focus:border-brand-purple/40 placeholder:text-text-dim font-body"
                />
              </div>

              {canSeeTeam && (
                <div className="flex items-center gap-1 rounded-lg bg-surface-2/50 p-0.5">
                  <button
                    onClick={() => setScope('mine')}
                    className={[
                      'flex-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-mono py-1.5 rounded-md transition-colors',
                      scope === 'mine'
                        ? 'bg-surface text-text-primary'
                        : 'text-text-dim hover:text-text-primary',
                    ].join(' ')}
                  >
                    <User size={11} strokeWidth={1.8} />
                    míos
                  </button>
                  <button
                    onClick={() => setScope('team')}
                    className={[
                      'flex-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-mono py-1.5 rounded-md transition-colors',
                      scope === 'team'
                        ? 'bg-surface text-text-primary'
                        : 'text-text-dim hover:text-text-primary',
                    ].join(' ')}
                  >
                    <Users size={11} strokeWidth={1.8} />
                    equipo
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto scrollbar-thin px-2 pb-2 space-y-2">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-md bg-surface-3/50 h-8" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <MessageCircle size={18} strokeWidth={1.2} className="mx-auto text-text-dim" />
                  <p className="text-text-dim text-[11px] font-body">
                    {query ? 'Nada con ese nombre en tu memoria.' : 'Aún no hay conversaciones. Empieza una.'}
                  </p>
                  {!query && (
                    <button
                      onClick={newThread}
                      className="text-[11px] font-body text-brand-purple hover:opacity-80 underline-offset-2 hover:underline"
                    >
                      Pregúntale a SofIA
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {renderGroup('hoy', groups.today)}
                  {renderGroup('esta semana', groups.week)}
                  {renderGroup('más antiguo', groups.older)}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
