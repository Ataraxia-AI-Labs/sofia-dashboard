'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchUserOrganization, fetchBranches } from '@/lib/api'
import { OrgContext } from '@/lib/org-context'
import { ErrorBoundary } from '@/components/error-boundary'
import OnboardingWizard from '@/components/onboarding-wizard'
import type { User } from '@supabase/supabase-js'
import type { Organization, Branch } from '@/types'
import {
  LayoutDashboard, Users, Calendar, Target, Settings,
  LogOut, ChevronLeft, ChevronRight, Bell, CreditCard, Database, Activity, Kanban, Menu, X,
  MapPin, ChevronDown
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/pacientes', icon: Users, label: 'Pacientes' },
  { href: '/dashboard/pipeline', icon: Kanban, label: 'Pipeline' },
  { href: '/dashboard/calendario', icon: Calendar, label: 'Calendario' },
  { href: '/dashboard/pagos', icon: CreditCard, label: 'Pagos' },
  { href: '/dashboard/datalake', icon: Database, label: 'Data Lake' },
  { href: '/dashboard/oportunidades', icon: Target, label: 'Oportunidades' },
  { href: '/dashboard/health', icon: Activity, label: 'System Health' },
  { href: '/dashboard/ajustes', icon: Settings, label: 'Ajustes' },
]

// ============================================================
// SIDEBAR (extracted as a standalone component — not inside render)
// ============================================================

function Sidebar({
  isOpen,
  mobile,
  pathname,
  orgName,
  onNavigate,
  onLogout,
  onClose,
}: {
  isOpen: boolean
  mobile?: boolean
  pathname: string
  orgName: string
  onNavigate: (href: string) => void
  onLogout: () => void
  onClose?: () => void
}) {
  return (
    <>
      {/* Logo */}
      <div className={`px-5 py-6 flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`}>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        {isOpen && (
          <div className="animate-fade-in overflow-hidden flex-1 min-w-0">
            <div className="text-text-primary font-semibold text-sm leading-tight">SofIA</div>
            <div className="text-text-dim text-[10px] truncate">{orgName}</div>
          </div>
        )}
        {mobile && onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors ml-auto" aria-label="Cerrar menú">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={`sidebar-link w-full ${isActive ? 'active' : ''} cursor-pointer`}
              title={!isOpen ? item.label : undefined}
              aria-label={item.label}
            >
              <Icon size={18} className="flex-shrink-0" />
              {isOpen && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={onLogout}
          className={`sidebar-link w-full text-status-danger/70 hover:text-status-danger hover:bg-status-danger/5 ${!isOpen ? 'justify-center' : ''}`}
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {isOpen && <span className="animate-fade-in">Cerrar sesión</span>}
        </button>
      </div>
    </>
  )
}

// ============================================================
// BRANCH SELECTOR (B10 — Multi-Sede)
// ============================================================

function BranchSelector({
  branches,
  selectedBranchId,
  onSelect,
}: {
  branches: Branch[]
  selectedBranchId: string | null
  onSelect: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = branches.find(b => b.id === selectedBranchId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:border-brand-purple/30 transition-all"
      >
        <MapPin size={12} className={selectedBranchId ? 'text-brand-purple' : ''} />
        <span className="hidden sm:inline max-w-[120px] truncate">
          {selected ? selected.name : 'Todas las sedes'}
        </span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-52 bg-surface border border-border rounded-xl shadow-lg py-1 animate-fade-in">
            <button
              onClick={() => { onSelect(null); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-2 transition-colors ${!selectedBranchId ? 'text-brand-purple font-semibold' : 'text-text-muted'}`}
            >
              Todas las sedes
            </button>
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => { onSelect(b.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-2 transition-colors ${selectedBranchId === b.id ? 'text-brand-purple font-semibold' : 'text-text-muted'}`}
              >
                {b.name}
                {b.city && <span className="text-text-dim ml-1">({b.city})</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// DASHBOARD LAYOUT
// ============================================================

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'VIEWER'>('VIEWER')
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const setBranchId = useCallback((id: string | null) => {
    setSelectedBranchId(id)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      setUser(session.user)

      try {
        const { organization, role: userRole } = await fetchUserOrganization(session.user.id)
        setOrg(organization)
        setRole(userRole)
      } catch (e) {
        console.error('Error fetching org:', e)
      }

      // Show dashboard immediately — don't block on backend calls
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Fetch branches in background — never blocks dashboard loading
  useEffect(() => {
    if (!org?.id) return
    fetchBranches(org.id)
      .then(list => setBranches(list.filter(b => b.is_active)))
      .catch(() => {})
  }, [org?.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const navigateTo = (href: string) => {
    router.push(href)
    setMobileMenuOpen(false)
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

  const sidebarProps = {
    pathname,
    orgName: org?.name || 'Dashboard',
    onNavigate: navigateTo,
    onLogout: handleLogout,
  }

  return (
    <div className="min-h-screen flex">
      {/* ========== DESKTOP SIDEBAR ========== */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-surface border-r border-border hidden lg:flex flex-col transition-all duration-300 relative flex-shrink-0`}>
        <Sidebar isOpen={sidebarOpen} {...sidebarProps} />
        {/* Collapse button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-brand-purple/30 transition-all z-10"
          aria-label={sidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
        >
          {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </aside>

      {/* ========== MOBILE SIDEBAR OVERLAY ========== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 h-full bg-surface border-r border-border flex flex-col animate-slide-in">
            <Sidebar isOpen mobile onClose={() => setMobileMenuOpen(false)} {...sidebarProps} />
          </aside>
        </div>
      )}

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 lg:h-16 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex lg:hidden items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-text-primary font-semibold text-sm">
                {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Dashboard'}
              </h1>
              <p className="text-text-dim text-xs hidden sm:block">{org?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Branch selector — only if org has multiple branches (B10) */}
            {branches.length > 1 && (
              <BranchSelector
                branches={branches}
                selectedBranchId={selectedBranchId}
                onSelect={setBranchId}
              />
            )}

            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-status-success/5 border border-status-success/10">
              <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              <span className="text-status-success text-xs font-medium">SofIA Online</span>
            </div>
            {/* Mobile: just the dot */}
            <div className="sm:hidden w-2 h-2 rounded-full bg-status-success animate-pulse" />

            <button className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors relative" aria-label="Notificaciones">
              <Bell size={16} />
            </button>

            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-semibold text-xs">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {org && user ? (
            <OrgContext.Provider value={{ user, org, orgId: org.id, role, branches, branchId: selectedBranchId, setBranchId }}>
              <ErrorBoundary>
                {org.status === 'SETUP' ? (
                  <OnboardingWizard org={org} orgId={org.id} onComplete={() => window.location.reload()} />
                ) : (
                  children
                )}
              </ErrorBoundary>
            </OrgContext.Provider>
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
