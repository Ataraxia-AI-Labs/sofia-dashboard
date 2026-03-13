'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchUserOrganization, fetchBranches } from '@/lib/api'
import { isSuperAdmin } from '@/lib/admin-api'
import { getImpersonatedOrgId, getImpersonatedOrgName, stopImpersonation, isImpersonating } from '@/lib/impersonation'
import { OrgContext } from '@/lib/org-context'
import { ErrorBoundary } from '@/components/error-boundary'
import * as Sentry from '@sentry/nextjs'
import OnboardingWizard from '@/components/onboarding-wizard'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { SofiaLogo } from '@/components/sofia-logo'
import { CommandPalette } from '@/components/command-palette'
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog'
import { useKeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcut'
import type { User } from '@supabase/supabase-js'
import type { Organization, Branch } from '@/types'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, Calendar, Target, Settings,
  LogOut, ChevronLeft, ChevronRight, CreditCard, Database, Activity, Kanban, Menu, X,
  MapPin, ChevronDown, MessageSquare, UserCog, Shield, ArrowLeft, Gem, Clock, AlertTriangle, Receipt,
  Zap, ArrowRight, Keyboard, FileText
} from 'lucide-react'

function useNavGroups() {
  const t = useTranslations('nav')
  return [
    {
      label: t('principal'),
      items: [
        { href: '/dashboard', icon: LayoutDashboard, label: t('overview') },
        { href: '/dashboard/conversaciones', icon: MessageSquare, label: t('conversations') },
        { href: '/dashboard/pacientes', icon: Users, label: t('patients') },
        { href: '/dashboard/calendario', icon: Calendar, label: t('calendar') },
      ],
    },
    {
      label: t('sales'),
      items: [
        { href: '/dashboard/pipeline', icon: Kanban, label: t('pipeline') },
        { href: '/dashboard/oportunidades', icon: Target, label: t('opportunities') },
        { href: '/dashboard/pagos', icon: CreditCard, label: t('payments') },
      ],
    },
    {
      label: t('admin'),
      items: [
        { href: '/dashboard/equipo', icon: UserCog, label: t('team') },
        { href: '/dashboard/reportes', icon: FileText, label: t('reports') },
        { href: '/dashboard/datalake', icon: Database, label: t('datalake') },
        { href: '/dashboard/health', icon: Activity, label: t('systemHealth') },
      ],
    },
    {
      label: t('config'),
      items: [
        { href: '/dashboard/planes', icon: Gem, label: t('plans') },
        { href: '/dashboard/facturacion', icon: Receipt, label: t('billing') },
        { href: '/dashboard/ajustes', icon: Settings, label: t('settings') },
      ],
    },
  ]
}

// ============================================================
// SIDEBAR (extracted as a standalone component — not inside render)
// ============================================================

function Sidebar({
  isOpen,
  mobile,
  pathname,
  orgName,
  navGroups,
  onNavigate,
  onLogout,
  onClose,
  godMode,
  onExitGodMode,
  backLabel,
  logoutLabel,
}: {
  isOpen: boolean
  mobile?: boolean
  pathname: string
  orgName: string
  navGroups: ReturnType<typeof useNavGroups>
  onNavigate: (href: string) => void
  onLogout: () => void
  onClose?: () => void
  godMode?: boolean
  onExitGodMode?: () => void
  backLabel: string
  logoutLabel: string
}) {
  return (
    <>
      {/* Logo */}
      <div className={`px-4 py-5 flex items-center ${isOpen ? 'gap-2' : 'justify-center'} border-b border-border/50`}>
        {isOpen ? (
          <div className="animate-fade-in flex-1 min-w-0">
            <SofiaLogo size="sm" variant="full" />
            <div className="text-text-dim text-[10px] truncate mt-1 pl-[38px]">{orgName}</div>
          </div>
        ) : (
          <SofiaLogo size="sm" variant="mark" />
        )}
        {mobile && onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors ml-auto flex-shrink-0" aria-label="Cerrar menu">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" role="navigation" aria-label="Menu principal">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
            {/* Group label — only visible when sidebar is expanded */}
            {isOpen && (
              <div className="px-3 mb-1 animate-fade-in">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-dim">
                  {group.label}
                </span>
              </div>
            )}
            {/* Collapsed: thin divider between groups */}
            {!isOpen && gi > 0 && (
              <div className="mx-3 mb-2 border-t border-border/50" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                // Exact match for /dashboard, startsWith for all other sections
                // so nested routes like /dashboard/pacientes/[id] still highlight the parent nav item
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <button
                    key={item.href}
                    onClick={() => onNavigate(item.href)}
                    className={`sidebar-link w-full ${isActive ? 'active' : ''} cursor-pointer`}
                    title={!isOpen ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {isOpen && (
                      <span className="animate-fade-in truncate">{item.label}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        {/* God Mode: back to admin panel */}
        {godMode && onExitGodMode && (
          <button
            onClick={onExitGodMode}
            className={`sidebar-link w-full text-status-danger/70 hover:text-status-danger hover:bg-status-danger/5 ${!isOpen ? 'justify-center' : ''}`}
            aria-label={backLabel}
          >
            <ArrowLeft size={18} className="flex-shrink-0" />
            {isOpen && <span className="animate-fade-in">{backLabel}</span>}
          </button>
        )}
        <button
          onClick={onLogout}
          className={`sidebar-link w-full text-status-danger/70 hover:text-status-danger hover:bg-status-danger/5 ${!isOpen ? 'justify-center' : ''}`}
          aria-label={logoutLabel}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {isOpen && <span className="animate-fade-in">{logoutLabel}</span>}
        </button>
      </div>
    </>
  )
}

// ============================================================
// GOD MODE BANNER — shown when super admin is impersonating
// ============================================================

function GodModeBanner({ orgName, onExit }: { orgName: string; onExit: () => void }) {
  return (
    <div className="bg-gradient-to-r from-status-danger/10 via-brand-purple/10 to-status-danger/10 border-b border-status-danger/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-status-danger to-brand-purple flex items-center justify-center">
          <Shield size={12} className="text-white" />
        </div>
        <div>
          <span className="text-xs font-bold text-status-danger">GOD MODE</span>
          <span className="text-xs text-text-muted ml-2">Viendo dashboard de <strong className="text-text-primary">{orgName}</strong></span>
        </div>
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-[10px] font-semibold hover:bg-status-danger/20 transition-colors"
      >
        <ArrowLeft size={10} />
        Volver a Admin
      </button>
    </div>
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
// TRIAL BANNER — Dismissible, loss-aversion copywriting
// ============================================================

function TrialBanner({
  org,
  godMode,
  onNavigate,
}: {
  org: Organization | null
  godMode: boolean
  onNavigate: (href: string) => void
}) {
  const [dismissed, setDismissed] = useState(false)

  // Read dismiss state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = `sofia_trial_banner_dismissed_${org?.id}`
      const val = localStorage.getItem(key)
      if (val) setDismissed(true)
    }
  }, [org?.id])

  if (!org || org.plan !== 'TRIAL' || org.status === 'TRIAL_EXPIRED' || godMode || dismissed) {
    return null
  }

  const trialEnds = org.trial_ends_at ? new Date(org.trial_ends_at) : null
  if (!trialEnds) return null

  const daysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const isUrgent = daysLeft <= 5

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`sofia_trial_banner_dismissed_${org.id}`, '1')
    }
    setDismissed(true)
  }

  const copy = isUrgent
    ? daysLeft === 0
      ? 'Tu prueba gratuita expira hoy. No pierdas tu configuracion ni tus pacientes.'
      : `Quedan solo ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} de prueba. No pierdas tu configuracion.`
    : `Tu prueba gratuita termina en ${daysLeft} dias. Elige un plan para seguir creciendo.`

  return (
    <div
      className={`px-4 py-2.5 flex items-center justify-between border-b transition-all ${
        isUrgent
          ? 'bg-status-warning/8 border-status-warning/20'
          : 'bg-amber-950/30 border-amber-800/20'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-status-warning/20' : 'bg-amber-700/20'}`}>
          {isUrgent ? (
            <Clock size={11} className="text-status-warning" />
          ) : (
            <Zap size={11} className="text-amber-400" />
          )}
        </div>
        <span className={`text-xs font-medium truncate ${isUrgent ? 'text-status-warning' : 'text-amber-300'}`}>
          {copy}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        <button
          onClick={() => onNavigate('/dashboard/planes')}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
            isUrgent
              ? 'bg-status-warning/15 text-status-warning hover:bg-status-warning/25'
              : 'bg-amber-700/20 text-amber-300 hover:bg-amber-700/35'
          }`}
        >
          Elegir plan
          <ArrowRight size={10} />
        </button>
        <button
          onClick={handleDismiss}
          className="w-5 h-5 rounded flex items-center justify-center text-text-dim hover:text-text-muted transition-colors"
          aria-label="Cerrar banner"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ============================================================
// DASHBOARD LAYOUT
// ============================================================

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const NAV_GROUPS = useNavGroups()
  const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)
  const t = useTranslations('nav')
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'STAFF'>('STAFF')
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [godMode, setGodMode] = useState(false)
  const [godModeOrgName, setGodModeOrgName] = useState('')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)

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
      Sentry.setUser({ id: session.user.id, email: session.user.email ?? undefined })

      // Check God Mode: super admin impersonating a clinic
      const impersonatedOrgId = getImpersonatedOrgId()
      const impersonatedOrgName = getImpersonatedOrgName()
      const isAdmin = isSuperAdmin(session.user)

      if (isAdmin && impersonatedOrgId) {
        // God Mode — load the impersonated org directly
        setGodMode(true)
        setGodModeOrgName(impersonatedOrgName || 'Org desconocida')

        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('id, name, status')
            .eq('id', impersonatedOrgId)
            .single()
          if (!error && data) {
            setOrg(data as Organization)
            Sentry.setContext('organization', { id: data.id, name: data.name })
            setRole('OWNER') // Super admin has full access in God Mode
          }
        } catch {
          // Impersonated org not found — clear and redirect
          stopImpersonation()
          router.replace('/admin')
          return
        }
      } else if (isAdmin && !impersonatedOrgId) {
        // Super admin without impersonation — redirect to admin panel
        router.replace('/admin')
        return
      } else {
        // Normal clinic user
        try {
          const { organization, role: userRole } = await fetchUserOrganization(session.user.id)
          setOrg(organization)
          setRole(userRole)
          if (organization) {
            Sentry.setContext('organization', { id: organization.id, name: organization.name })
          }
        } catch {
          // Organization fetch failed — will show fallback UI
        }
      }

      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
      if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user)
      }
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
    stopImpersonation()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleExitGodMode = () => {
    stopImpersonation()
    router.replace('/admin')
  }

  const navigateTo = (href: string) => {
    router.push(href)
    setMobileMenuOpen(false)
  }

  // Global keyboard shortcuts — must be declared after navigateTo
  useKeyboardShortcut('k', () => setCommandPaletteOpen(true), { ctrlOrMeta: true })
  useKeyboardShortcut('n', () => navigateTo('/dashboard/pacientes'), { ctrl: true })
  useKeyboardShortcut('a', () => navigateTo('/dashboard/calendario'), { ctrl: true, shift: true })
  useKeyboardShortcut('?', () => setShortcutsDialogOpen(true), { ctrl: true })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse-soft">
            <SofiaLogo size="md" variant="mark" />
          </div>
          <p className="text-text-muted text-sm">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const sidebarProps = {
    pathname,
    orgName: org?.name || 'Dashboard',
    navGroups: NAV_GROUPS,
    onNavigate: navigateTo,
    onLogout: handleLogout,
    godMode,
    onExitGodMode: handleExitGodMode,
    backLabel: t('backToAdmin'),
    logoutLabel: t('logout'),
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* GOD MODE BANNER */}
      {godMode && <GodModeBanner orgName={godModeOrgName} onExit={handleExitGodMode} />}

      {/* TRIAL BANNER */}
      <TrialBanner org={org} godMode={godMode} onNavigate={navigateTo} />

      {/* TRIAL EXPIRED OVERLAY */}
      {org?.status === 'TRIAL_EXPIRED' && !godMode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-status-danger" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Tu periodo de prueba ha expirado</h2>
            <p className="text-text-muted text-xs mb-4">
              Para seguir usando SofIA y que tus pacientes sigan siendo atendidos, activa un plan.
            </p>
            <button
              onClick={() => navigateTo('/dashboard/planes')}
              className="px-6 py-2.5 rounded-xl bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple-dark transition-colors"
            >
              Ver planes
            </button>
            <p className="text-text-dim text-[10px] mt-3">
              ¿Necesitas ayuda? Escribenos a gestion@ataraxiaialabs.ai
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
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
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-text-primary font-semibold text-sm">
                  {NAV_ITEMS.find(i => i.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(i.href))?.label || 'Dashboard'}
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

              <NotificationsDropdown orgId={org?.id || ''} />

              {/* Keyboard shortcuts hint */}
              <button
                onClick={() => setShortcutsDialogOpen(true)}
                className="hidden md:flex w-9 h-9 rounded-lg bg-surface-2 border border-border items-center justify-center text-text-dim hover:text-text-primary hover:border-brand-purple/30 transition-colors"
                aria-label="Ver atajos de teclado (Ctrl+?)"
                title="Atajos de teclado (Ctrl+?)"
              >
                <Keyboard size={16} />
              </button>

              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-semibold text-xs ${godMode ? 'bg-gradient-to-br from-status-danger/20 to-brand-purple/20 border-status-danger/20 text-status-danger' : 'bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 border-brand-purple/20 text-brand-purple'}`}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto" role="main">
            {org && user ? (
              <OrgContext.Provider value={{ user, org, orgId: org.id, role, branches, branchId: selectedBranchId, setBranchId }}>
                <ErrorBoundary>
                  {org.status === 'SETUP' && !godMode ? (
                    <OnboardingWizard org={org} orgId={org.id} onComplete={() => window.location.reload()} />
                  ) : (
                    children
                  )}
                </ErrorBoundary>
              </OrgContext.Provider>
            ) : (
              <div className="glass-card p-8 text-center">
                <p className="text-text-muted">No se encontro organizacion asociada a tu cuenta.</p>
                <p className="text-text-dim text-sm mt-2">Contacta al administrador de Ataraxia.</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Global overlays — keyboard-driven */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <KeyboardShortcutsDialog open={shortcutsDialogOpen} onClose={() => setShortcutsDialogOpen(false)} />
    </div>
  )
}
