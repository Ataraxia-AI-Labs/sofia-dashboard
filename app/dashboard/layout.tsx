'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchUserOrganization } from '@/lib/api'
import {
  LayoutDashboard, Users, Calendar, Target, Settings,
  LogOut, ChevronLeft, ChevronRight, Zap, Bell, CreditCard
} from 'lucide-react'
import type { Organization } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview', ready: true },
  { href: '/dashboard/pacientes', icon: Users, label: 'Pacientes', ready: true },
  { href: '/dashboard/calendario', icon: Calendar, label: 'Calendario', ready: true },
  { href: '/dashboard/pagos', icon: CreditCard, label: 'Pagos', ready: true },
  { href: '/dashboard/oportunidades', icon: Target, label: 'Oportunidades', ready: true },
  { href: '/dashboard/ajustes', icon: Settings, label: 'Ajustes', ready: true },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      setUser(session.user)

      try {
        const organization = await fetchUserOrganization(session.user.id)
        setOrg(organization as Organization | null)
      } catch (e) {
        console.error('Error fetching org:', e)
      }

      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center animate-pulse-soft">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <p className="text-text-muted text-sm">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* ========== SIDEBAR ========== */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-surface border-r border-border flex flex-col transition-all duration-300 relative flex-shrink-0`}>
        {/* Logo */}
        <div className={`px-5 py-6 flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in overflow-hidden">
              <div className="text-text-primary font-semibold text-sm leading-tight">SofIA</div>
              <div className="text-text-dim text-[10px] truncate">{org?.name || 'Dashboard'}</div>
            </div>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-brand-purple/30 transition-all z-10"
        >
          {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <button
                key={item.href}
                onClick={() => item.ready ? router.push(item.href) : null}
                className={`sidebar-link w-full ${isActive ? 'active' : ''} ${!item.ready ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && (
                  <span className="animate-fade-in truncate">{item.label}</span>
                )}
                {sidebarOpen && !item.ready && (
                  <span className="ml-auto text-[9px] bg-surface-3 text-text-dim px-1.5 py-0.5 rounded-full">Pronto</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleLogout}
            className={`sidebar-link w-full text-status-danger/70 hover:text-status-danger hover:bg-status-danger/5 ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="animate-fade-in">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
          <div>
            <h1 className="text-text-primary font-semibold text-sm">
              {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Dashboard'}
            </h1>
            <p className="text-text-dim text-xs">{org?.name}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-success/5 border border-status-success/10">
              <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              <span className="text-status-success text-xs font-medium">SofIA Online</span>
            </div>

            <button className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors relative">
              <Bell size={16} />
            </button>

            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-semibold text-xs">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {org ? (
            // Pass org to children via a wrapper div with data attribute
            <div data-org-id={org.id} data-org-name={org.name}>
              {children}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-text-muted">No se encontró organización asociada a tu cuenta.</p>
              <p className="text-text-dim text-sm mt-2">Contacta al administrador de Ataraxia.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
