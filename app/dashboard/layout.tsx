'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchUserOrganization, fetchBranches } from '@/lib/api'
import { OrgContext } from '@/lib/org-context'
import { filterNavByRole } from '@/lib/role-permissions'
import { canAccessByPlan } from '@/lib/plan-features'
import { RoleGuard } from '@/components/role-guard'
import { ErrorBoundary } from '@/components/error-boundary'
import * as Sentry from '@sentry/nextjs'
import OnboardingWizard from '@/components/onboarding-wizard'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { ThemeToggle } from '@/components/theme-toggle'
import { AtaraxiaLogo, AtaraxiaLogoCompact } from '@/components/ataraxia-logo'
import { Tooltip } from '@/components/ui/tooltip'
import { SidebarNavButton } from '@/components/sidebar-nav-button'

const SentientEye = ({ size = 48, className = '' }: { size?: number; className?: string }) => (
  <AtaraxiaLogo size={size} className={className} />
)

const SentientEyeSmall = ({ className = '' }: { className?: string }) => (
  <AtaraxiaLogoCompact size={28} className={className} />
)
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import type { User } from '@supabase/supabase-js'
import type { Organization, Branch } from '@/types'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, Calendar, Target, Settings,
  LogOut, CreditCard, Database, Activity, Kanban, Menu, X,
  MapPin, ChevronDown, MessageSquare, UserCog, Shield, ArrowLeft, Gem, Clock, AlertTriangle, Receipt,
  Zap, ArrowRight, FileText, Brain, Megaphone, Radio, Crosshair, DollarSign, Gauge, Lock,
  TrendingUp, Palette, Gift, Star, Store, Webhook, Puzzle
} from 'lucide-react'

/* ================================================================
   NAV GROUPS — Sentient naming system
   Routes stay the same. Only display labels change.
   ================================================================ */

function useNavGroups() {
  const t = useTranslations('nav')
  return [
    {
      label: t('principal'),
      items: [
        { href: '/dashboard', icon: Gauge, label: t('overview') },
        { href: '/dashboard/conversaciones', icon: Radio, label: t('conversations') },
        { href: '/dashboard/pacientes', icon: Users, label: t('patients') },
        { href: '/dashboard/calendario', icon: Calendar, label: t('calendar') },
      ],
    },
    {
      label: t('sales'),
      items: [
        { href: '/dashboard/pipeline', icon: Kanban, label: t('pipeline') },
        { href: '/dashboard/oportunidades', icon: Crosshair, label: t('opportunities') },
        { href: '/dashboard/campanas', icon: Zap, label: t('campaigns') },
        { href: '/dashboard/pagos', icon: DollarSign, label: t('payments') },
        { href: '/dashboard/referidos', icon: Gift, label: t('referrals') },
      ],
    },
    {
      label: t('growth'),
      items: [
        { href: '/dashboard/crecimiento', icon: TrendingUp, label: t('growthCenter') },
        { href: '/dashboard/contenido', icon: Palette, label: t('contentStudio') },
        { href: '/dashboard/resenas', icon: Star, label: t('reviews') },
      ],
    },
    {
      label: t('admin'),
      items: [
        { href: '/dashboard/equipo', icon: UserCog, label: t('team') },
        { href: '/dashboard/reportes', icon: FileText, label: t('reports') },
        { href: '/dashboard/datalake', icon: Database, label: t('datalake') },
        { href: '/dashboard/auditoria', icon: Shield, label: t('audit') },
        { href: '/dashboard/automatizaciones', icon: Zap, label: t('automations') },
      ],
    },
    {
      label: t('platform'),
      items: [
        { href: '/dashboard/marketplace', icon: Store, label: t('marketplace') },
        { href: '/dashboard/webhooks', icon: Webhook, label: t('webhooks') },
        { href: '/dashboard/network', icon: Brain, label: t('network') },
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

/* ================================================================
   SIDEBAR — Sentient Interface
   Mono labels, left-border active, tight spacing, no noise.
   ================================================================ */

function Sidebar({
  mobile,
  pathname,
  orgName,
  navGroups,
  plan,
  onNavigate,
  onLogout,
  onClose,
  logoutLabel,
  closeMenuLabel,
  logoUrl,
}: {
  mobile?: boolean
  pathname: string
  orgName: string
  navGroups: ReturnType<typeof useNavGroups>
  plan: Organization['plan']
  onNavigate: (href: string) => void
  onLogout: () => void
  onClose?: () => void
  logoutLabel: string
  closeMenuLabel: string
  logoUrl?: string
}) {
  return (
    <>
      {/* Mobile close button (only on mobile drawer) */}
      {mobile && onClose && (
        <button onClick={onClose} className="absolute top-2 right-2 w-6 h-6 rounded-md bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors z-10" aria-label={closeMenuLabel}>
          <X size={12} />
        </button>
      )}

      {/* Navigation — Hyprland naked floating icons, fit-without-scroll. No brand mark in sidebar. */}
      <nav className="flex-1 pt-2 pb-0.5 overflow-y-auto scrollbar-thin space-y-[1px]" role="navigation" aria-label="Navigation">
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-1 pt-1' : ''}>
            {group.items.map((item) => {
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
              const locked = !canAccessByPlan(plan, item.href)
              return (
                <SidebarNavButton
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActive}
                  locked={locked}
                  onNavigate={onNavigate}
                />
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom — logout naked */}
      <div className="py-1.5 flex justify-center">
        <Tooltip label={logoutLabel} side="right" delay={120}>
          <button
            onClick={onLogout}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-dim hover:text-status-danger transition-all active:scale-[0.9] hover:drop-shadow-[0_0_4px_rgba(239,68,68,0.4)]"
            aria-label={logoutLabel}
          >
            <LogOut size={13} strokeWidth={1.6} />
          </button>
        </Tooltip>
      </div>
    </>
  )
}

/* ================================================================
   BRANCH SELECTOR — Dropdown, minimal
   ================================================================ */

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
  const tLayout = useTranslations('layout')

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="sentient-btn w-8 h-8 rounded-xl bg-surface/60 backdrop-blur-md flex items-center justify-center text-text-muted hover:text-text-primary relative"
        style={{
          boxShadow: '0 0 0 1px rgba(139,92,246,0.12), 0 2px 10px -4px rgba(139,92,246,0.15)',
        }}
        title={selected ? selected.name : tLayout('allBranches')}
        aria-label={selected ? selected.name : tLayout('allBranches')}
      >
        <MapPin size={13} strokeWidth={1.6} className={selectedBranchId ? 'text-brand-purple' : ''} />
        {selectedBranchId && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-brand-purple shadow-[0_0_4px_rgba(139,92,246,0.7)]" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 z-40 w-48 bg-surface/75 backdrop-blur-2xl rounded-xl py-1 animate-sentient-float-in"
            style={{
              boxShadow:
                '0 0 0 1px rgba(139,92,246,0.15), 0 12px 40px -8px rgba(139,92,246,0.3), 0 1px 0 0 rgba(255,255,255,0.04) inset',
            }}
          >
            <button
              onClick={() => { onSelect(null); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[12px] font-body hover:bg-surface-2 transition-colors ${!selectedBranchId ? 'text-brand-purple font-semibold' : 'text-text-muted'}`}
            >
              {tLayout('allBranches')}
            </button>
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => { onSelect(b.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-[12px] font-body hover:bg-surface-2 transition-colors ${selectedBranchId === b.id ? 'text-brand-purple font-semibold' : 'text-text-muted'}`}
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

/* ================================================================
   TRIAL PILL — Inline, minimal, one click to upgrade
   ================================================================ */

function TrialPill({
  org,
  onNavigate,
}: {
  org: Organization | null
  onNavigate: (href: string) => void
}) {
  const t = useTranslations('trial')

  if (!org || org.plan !== 'TRIAL' || org.status === 'TRIAL_EXPIRED') return null

  const trialEnds = org.trial_ends_at ? new Date(org.trial_ends_at) : null
  if (!trialEnds) return null

  const daysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  const isUrgent = daysLeft <= 5

  return (
    <button
      onClick={() => onNavigate('/dashboard/planes')}
      className={`sentient-btn hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-body font-medium ${
        isUrgent
          ? 'bg-status-warning/10 text-status-warning'
          : 'bg-surface-2 text-text-muted hover:text-text-primary'
      }`}
      style={{
        boxShadow: isUrgent
          ? '0 0 0 1px rgba(245,200,66,0.22), 0 2px 10px -4px rgba(245,200,66,0.2)'
          : '0 0 0 1px rgba(139,92,246,0.12), 0 2px 10px -4px rgba(139,92,246,0.15)',
      }}
    >
      {isUrgent ? <Clock size={10} /> : <Zap size={10} />}
      <span>{daysLeft === 0 ? t('expiresToday') : t('daysLeft', { days: daysLeft })}</span>
    </button>
  )
}

/* ================================================================
   DASHBOARD LAYOUT — Nucleus
   ================================================================ */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const NAV_GROUPS = useNavGroups()
  const t = useTranslations('nav')
  const tLayout = useTranslations('layout')
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'STAFF'>('STAFF')
  const FILTERED_NAV_GROUPS = NAV_GROUPS.map(group => ({
    ...group,
    items: filterNavByRole(group.items, role),
  })).filter(group => group.items.length > 0)
  const NAV_ITEMS = FILTERED_NAV_GROUPS.flatMap(g => g.items)
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const setBranchId = useCallback((id: string | null) => {
    setSelectedBranchId(id)
  }, [])

  useEffect(() => {
    const init = async () => {
      // AUTH-002: Use getUser() for server-validated session
      const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !validatedUser) {
        router.replace('/login')
        return
      }

      setUser(validatedUser)
      Sentry.setUser({ id: validatedUser.id, email: validatedUser.email ?? undefined })

      try {
        const { organization, role: userRole } = await fetchUserOrganization(validatedUser.id)
        setOrg(organization)
        setRole(userRole)
        if (organization) {
          Sentry.setContext('organization', { id: organization.id, name: organization.name })
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { context: 'org_bootstrap' } })
      }

      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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

  const whiteLabel = useMemo(() => (org?.config_settings as Record<string, unknown>)?.white_label as Record<string, unknown> | undefined, [org?.config_settings])
  const logoUrl = (whiteLabel?.logo_url as string) || ''
  const brandPrimary = (whiteLabel?.brand_colors as Record<string, string> | undefined)?.primary || ''
  const brandSecondary = (whiteLabel?.brand_colors as Record<string, string> | undefined)?.secondary || ''
  const brandAccent = (whiteLabel?.brand_colors as Record<string, string> | undefined)?.accent || ''

  useEffect(() => {
    const root = document.documentElement
    if (brandPrimary) root.style.setProperty('--color-brand-primary', brandPrimary)
    if (brandSecondary) root.style.setProperty('--color-brand-secondary', brandSecondary)
    if (brandAccent) root.style.setProperty('--color-brand-accent', brandAccent)
    return () => {
      root.style.removeProperty('--color-brand-primary')
      root.style.removeProperty('--color-brand-secondary')
      root.style.removeProperty('--color-brand-accent')
    }
  }, [brandPrimary, brandSecondary, brandAccent])

  /* ---- Loading state: sentient breathe ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-4">
          <SentientEye size={48} className="animate-sentient-breathe" />
          <div className="flex items-center gap-1.5">
            <div className="sentient-dot" style={{ animationDelay: '0ms' }} />
            <div className="sentient-dot" style={{ animationDelay: '200ms' }} />
            <div className="sentient-dot" style={{ animationDelay: '400ms' }} />
          </div>
          <p className="text-text-dim text-[12px] font-body tracking-[0.2em] uppercase">{tLayout('loadingDashboard')}</p>
        </div>
      </div>
    )
  }

  const sidebarProps = {
    pathname,
    orgName: org?.name || 'Nucleus',
    navGroups: FILTERED_NAV_GROUPS,
    plan: org?.plan || ('TRIAL' as Organization['plan']),
    onNavigate: navigateTo,
    onLogout: handleLogout,
    logoutLabel: t('logout'),
    closeMenuLabel: tLayout('closeMenu'),
    logoUrl,
  }

  const currentPageLabel = NAV_ITEMS.find(i => i.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(i.href))?.label || 'Nucleus'

  return (
    <div className="min-h-screen flex flex-col bg-void">
      {/* TRIAL EXPIRED OVERLAY */}
      {org?.status === 'TRIAL_EXPIRED' && (
        <div className="fixed inset-0 z-50 bg-void/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm text-center">
            <div className="w-12 h-12 rounded-lg bg-status-danger/8 border border-status-danger/15 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} className="text-status-danger" />
            </div>
            <h2 className="text-lg font-display text-text-primary mb-2 tracking-tight">Tu periodo de prueba ha expirado</h2>
            <p className="text-text-muted text-[13px] font-body mb-4 leading-relaxed">
              Para seguir usando SofIA y que tus pacientes sigan siendo atendidos, activa un plan.
            </p>
            <button
              onClick={() => navigateTo('/dashboard/planes')}
              className="px-5 py-2.5 rounded-lg bg-brand-purple text-white text-[13px] font-body font-semibold hover:bg-brand-purple-dark transition-colors active:scale-[0.97]"
            >
              Ver planes
            </button>
            <p className="text-text-dim text-[11px] font-body mt-2">
              gestion@ataraxiaialabs.ai
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 flex relative">
        {/* ========== DESKTOP SIDEBAR — Hyprland naked floating icons ========== */}
        <aside className="hidden lg:flex w-10 flex-shrink-0 bg-transparent flex-col relative z-30">
          <Sidebar {...sidebarProps} />
        </aside>

        {/* ========== MOBILE SIDEBAR OVERLAY ========== */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-64 h-full bg-surface/90 backdrop-blur-xl flex flex-col animate-slide-in">
              <Sidebar mobile onClose={() => setMobileMenuOpen(false)} {...sidebarProps} />
            </aside>
          </div>
        )}

        {/* ========== MAIN CONTENT — no topbar, controls float top-right ========== */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Mobile hamburger — floating top-left on small screens */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="sentient-btn absolute top-3 left-3 w-9 h-9 rounded-xl bg-surface/60 backdrop-blur-md flex lg:hidden items-center justify-center text-text-muted hover:text-text-primary z-20"
            style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.14), 0 2px 10px -3px rgba(139,92,246,0.18)' }}
            aria-label={tLayout('mainMenu')}
          >
            <Menu size={16} />
          </button>

          {/*
            Floating controls cluster — top-right.
            pointer-events-none on the wrapper so empty gaps between controls
            don't intercept clicks on underlying page tabs/buttons.
            pointer-events-auto on each direct child restores interactivity
            exactly where a visible control exists. Fix for S99 audit bugs
            #6/#24/#27/#35/#39/#46/#50 where Playwright confirmed this div
            was blocking tabs (Transmisiones, Impulsos, Revenue, Reseñas,
            Inteligencia, Auditoría, Salud).
          */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 pointer-events-none [&>*]:pointer-events-auto">
            <TrialPill org={org} onNavigate={navigateTo} />
            {branches.length > 1 && (
              <BranchSelector
                branches={branches}
                selectedBranchId={selectedBranchId}
                onSelect={setBranchId}
              />
            )}
            <NotificationsDropdown orgId={org?.id || ''} />
            <ThemeToggle />
            <button
              className="sentient-btn w-8 h-8 rounded-xl bg-gradient-to-b from-brand-purple/25 to-brand-purple/10 flex items-center justify-center font-display font-semibold text-[13px] text-brand-purple cursor-pointer"
              style={{
                boxShadow:
                  '0 0 0 1px rgba(139,92,246,0.28), 0 2px 10px -2px rgba(139,92,246,0.3), 0 1px 0 0 rgba(255,255,255,0.08) inset',
              }}
              aria-label="Cuenta"
            >
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </button>
          </div>

          {/* Page content — full canvas, topbar area ~56px reserved */}
          <main className="flex-1 pt-14 pb-4 px-4 lg:px-6 overflow-auto" role="main">
            {org && user ? (
              <OrgContext.Provider value={{ user, org, orgId: org.id, role, branches, branchId: selectedBranchId, setBranchId }}>
                <ErrorBoundary>
                  {org.status === 'SETUP' ? (
                    <OnboardingWizard org={org} orgId={org.id} onComplete={() => window.location.reload()} />
                  ) : (
                    <RoleGuard>{children}</RoleGuard>
                  )}
                </ErrorBoundary>
              </OrgContext.Provider>
            ) : (
              <div className="glass-card p-6 text-center">
                <p className="text-text-muted text-[13px] font-body">No se encontro organizacion asociada a tu cuenta.</p>
                <p className="text-text-dim text-[12px] font-body mt-1">Contacta al administrador de Ataraxia.</p>
                <button
                  onClick={handleLogout}
                  className="mt-4 px-4 py-2 rounded-lg bg-surface-2 border border-border text-text-muted text-[12px] font-body hover:text-status-danger hover:border-status-danger/30 transition-all inline-flex items-center gap-1.5"
                >
                  <LogOut size={12} />
                  {t('logout')}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* PWA */}
      <ServiceWorkerRegister />
      <PWAInstallPrompt />
    </div>
  )
}
