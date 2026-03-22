'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Calendar, MessageSquare, AlertTriangle, CreditCard, X } from 'lucide-react'
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
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors relative"
        aria-label="Notificaciones"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-danger text-white text-[9px] font-mono font-bold flex items-center justify-center animate-fade-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-40 w-80 bg-surface border border-border rounded-lg animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-xs font-mono font-semibold text-text-primary">Notificaciones</h3>
              <button onClick={() => setOpen(false)} className="text-text-dim hover:text-text-muted transition-colors">
                <X size={14} />
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
                  <p className="text-text-dim text-[10px] font-mono">Sin notificaciones recientes</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border/50 hover:bg-surface-2/50 transition-colors ${!n.read ? 'bg-brand-purple/3' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center flex-shrink-0">
                        {ICON_MAP[n.type] || <Bell size={14} className="text-text-dim" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono font-semibold text-text-primary">{n.title}</p>
                        <p className="text-[10px] font-mono text-text-dim mt-0.5 line-clamp-2">{n.description}</p>
                        <p className="text-[9px] font-mono text-text-dim mt-1">{timeAgo(n.created_at)}</p>
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
