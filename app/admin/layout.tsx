'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isSuperAdmin } from '@/lib/admin-api'
import { fetchSystemHealth } from '@/lib/api/health'
import { ErrorBoundary } from '@/components/error-boundary'
import type { User } from '@supabase/supabase-js'
import {
  Shield, Building2, BarChart3, Plus, LogOut, ChevronLeft,
  ChevronRight, Menu, X, Activity, GitPullRequest, Wifi
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin', icon: Building2, label: 'Organizaciones' },
  { href: '/admin/organizaciones/nueva', icon: Plus, label: 'Crear Org' },
  { href: '/admin/metricas', icon: BarChart3, label: 'Metricas' },
  { href: '/admin/pipeline', icon: GitPullRequest, label: 'Pipeline' },
  { href: '/admin/health', icon: Activity, label: 'System Health' },
  { href: '/admin/audit-logs', icon: Shield, label: 'Audit Log' },
]

export interface AdminContextValue {
  user: User
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      setUser(session.user)

      // Only super admin can access /admin — no OWNER fallback
      setAuthorized(isSuperAdmin(session.user))

      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }, [router])

  const navigateTo = useCallback((href: string) => {
    router.push(href)
    setMobileMenuOpen(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center animate-pulse-soft">
            <Shield className="text-white" size={24} />
          </div>
          <p className="text-text-muted text-sm">Verificando acceso admin...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <Shield size={40} className="mx-auto text-status-danger mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">Acceso Denegado</h2>
          <p className="text-text-muted text-sm mb-6">No tienes permisos de Super Admin.</p>
          <button
            onClick={() => router.replace('/login')}
            className="px-6 py-2.5 rounded-xl bg-brand-purple/15 text-brand-purple font-semibold text-sm hover:bg-brand-purple/25 transition-colors"
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-surface border-r border-border hidden lg:flex flex-col transition-all duration-300 relative flex-shrink-0`}>
        {/* Logo */}
        <div className={`px-5 py-6 flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-status-danger to-brand-purple flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in overflow-hidden flex-1 min-w-0">
              <div className="text-text-primary font-semibold text-sm leading-tight">Super Admin</div>
              <div className="text-text-dim text-[10px] truncate">Ataraxia IA Labs</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <button
                key={item.href}
                onClick={() => navigateTo(item.href)}
                className={`sidebar-link w-full ${isActive ? 'active' : ''} cursor-pointer`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="animate-fade-in truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleLogout}
            className={`sidebar-link w-full text-status-danger/70 hover:text-status-danger hover:bg-status-danger/5 ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="animate-fade-in">Cerrar sesion</span>}
          </button>
        </div>

        {/* Collapse */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-brand-purple/30 transition-all z-10"
        >
          {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 h-full bg-surface border-r border-border flex flex-col animate-slide-in">
            <div className="px-5 py-6 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-status-danger to-brand-purple flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-text-primary font-semibold text-sm">Super Admin</div>
                <div className="text-text-dim text-[10px]">Ataraxia IA Labs</div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.href} onClick={() => navigateTo(item.href)} className={`sidebar-link w-full ${pathname === item.href ? 'active' : ''} cursor-pointer`}>
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex lg:hidden items-center justify-center text-text-muted hover:text-text-primary transition-colors">
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-text-primary font-semibold text-sm">
                {ADMIN_NAV.find(i => i.href === pathname)?.label || 'Admin'}
              </h1>
              <p className="text-text-dim text-xs hidden sm:block">Panel de Administracion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LivePulse />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-danger/5 border border-status-danger/10">
              <Shield size={12} className="text-status-danger" />
              <span className="text-status-danger text-xs font-medium">Super Admin</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-status-danger/20 to-brand-purple/20 border border-status-danger/20 flex items-center justify-center text-status-danger font-semibold text-xs">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

/** Live system pulse indicator in header — polls health every 30s */
function LivePulse() {
  const [status, setStatus] = useState<'ok' | 'warn' | 'error' | 'loading'>('loading')

  useEffect(() => {
    const check = async () => {
      try {
        const health = await fetchSystemHealth()
        setStatus(health?.status === 'HEALTHY' ? 'ok' : health?.status === 'DEGRADED' ? 'warn' : 'error')
      } catch {
        setStatus('error')
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  const dotColor = status === 'ok' ? 'bg-status-success' : status === 'warn' ? 'bg-status-warning' : status === 'error' ? 'bg-status-danger' : 'bg-text-dim'
  const label = status === 'ok' ? 'Online' : status === 'warn' ? 'Degraded' : status === 'error' ? 'Offline' : '...'

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-[10px] font-medium text-text-muted">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        {status === 'ok' && <div className="absolute inset-0 w-2 h-2 rounded-full bg-status-success animate-ping opacity-40" />}
      </div>
      {label}
    </div>
  )
}
