'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Calendar, MessageSquare, AlertTriangle, CreditCard, X } from 'lucide-react'
import { Tooltip } from '@/components/ui'
import { authFetch, API_URL } from '@/lib/supabase'
import { timeAgo } from '@/lib/api'

interface Notification {
  id: string
  type: 'appointment' | 'message' | 'alert' | 'payment'
  title: string
  description: string
  created_at: string
  read: boolean
}

const ICON_MAP = {
  appointment: <Calendar size={14} className="text-brand-cyan" />,
  message: <MessageSquare size={14} className="text-status-success" />,
  alert: <AlertTriangle size={14} className="text-status-warning" />,
  payment: <CreditCard size={14} className="text-brand-purple" />,
}

export function NotificationsDropdown({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()

  // Close panel automatically on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const loadNotifications = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await authFetch(`${API_URL}/dashboard/notifications/${orgId}?limit=10`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : data.notifications || [])
      }
    } catch {
      // Notifications are non-critical — fail silently
      // Generate some placeholder notifications from recent activity
    }
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    if (open && notifications.length === 0) {
      loadNotifications()
    }
  }, [open, notifications.length, loadNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative">
      <Tooltip label="Notificaciones" side="left" delay={120}>
      <button
        onClick={() => setOpen(!open)}
        className="hyp-topbar-btn"
        data-active={unreadCount > 0 ? 'true' : 'false'}
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="notifications-menu"
      >
        <Bell size={15} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-status-danger text-white text-[9px] font-mono font-bold flex items-center justify-center animate-fade-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      </Tooltip>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          {/* LiquidGlass — same language as the sidebar capsule + memory
              dropdown. Denser tint (0.88) so notification text stays crisp. */}
          <div
            id="notifications-menu"
            role="menu"
            aria-label="Notificaciones"
            className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl animate-fade-in overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgb(var(--color-surface-rgb) / 0.88) 0%, rgb(var(--color-surface-2-rgb) / 0.82) 100%)',
              backdropFilter: 'blur(22px) saturate(150%)',
              WebkitBackdropFilter: 'blur(22px) saturate(150%)',
              boxShadow:
                '0 0 0 1px rgba(139,92,246,0.14), 0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 48px -8px rgba(0,0,0,0.55), 0 0 28px -6px rgba(139,92,246,0.22)',
            }}
          >
            {/* Hyprland hairlines — brand language shared with the sidebar. */}
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
            {/* Header */}
            <div className="relative flex items-center justify-between px-4 py-3">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-3 bottom-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.25) 50%, transparent)' }}
              />
              <h3 className="text-xs font-body font-semibold text-text-primary">Notificaciones</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar notificaciones"
                className="text-text-dim hover:text-text-muted transition-colors"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-surface-3" />
                      <div className="flex-1">
                        <div className="h-3 bg-surface-3 rounded w-3/4 mb-2" />
                        <div className="h-2 bg-surface-3 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={20} className="mx-auto text-text-dim mb-2" />
                  <p className="text-text-dim text-[12px] font-body">Sin notificaciones recientes</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`sentient-row px-4 py-3 hover:bg-surface-2/50 transition-colors ${!n.read ? 'bg-brand-purple/5' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center flex-shrink-0">
                        {ICON_MAP[n.type] || <Bell size={14} className="text-text-dim" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-body font-semibold text-text-primary">{n.title}</p>
                        <p className="text-[12px] font-body text-text-dim mt-0.5 line-clamp-2">{n.description}</p>
                        <p className="text-[11px] font-body text-text-dim mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
