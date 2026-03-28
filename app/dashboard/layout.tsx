'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchUserOrganization, fetchBranches } from '@/lib/api'
import { isSuperAdmin } from '@/lib/admin-api'
import { getImpersonatedOrgId, getImpersonatedOrgName, stopImpersonation, isImpersonating } from '@/lib/impersonation'
import { OrgContext } from '@/lib/org-context'
import { filterNavByRole } from '@/lib/role-permissions'
import { canAccessByPlan } from '@/lib/plan-features'
import { RoleGuard } from '@/components/role-guard'
import { ErrorBoundary } from '@/components/error-boundary'
import * as Sentry from '@sentry/nextjs'
import OnboardingWizard from '@/components/onboarding-wizard'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { ThemeToggle } from '@/components/theme-toggle'
// Sentient eye SVG — replaces SofiaLogo for the default case
function SentientEye({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
      <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.4" />
      <circle cx="24" cy="24" r="6" fill="#8B5CF6" opacity="0.8">
        <animate attributeName="r" values="6;7;6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="24" r="2.5" fill="#F5F3FF" />
    </svg>
  )
}

function SentientEyeSmall({ className = '' }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" className={className}>
      <ellipse cx="24" cy="24" rx="20" ry="12" fill="none" stroke="#8B5CF6" strokeWidth="2" opacity="0.5" />
      <circle cx="24" cy="24" r="6" fill="#8B5CF6" opacity="0.8" />
      <circle cx="24" cy="24" r="2.5" fill="#F5F3FF" />
    </svg>
  )
}
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import type { User } from '@supabase/supabase-js'
import type { Organization, Branch } from '@/types'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, Calendar, Target, Settings,
  LogOut, ChevronLeft, ChevronRight, CreditCard, Database, Activity, Kanban, Menu, X,
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
  isOpen,
  mobile,
  pathname,
  orgName,
  navGroups,
  plan,
  onNavigate,
  onLogout,
  onClose,
  godMode,
  onExitGodMode,
  backLabel,
  logoutLabel,
  closeMenuLabel,
  logoUrl,
}: {
  isOpen: boolean
  mobile?: boolean
  pathname: string
  orgName: string
  navGroups: ReturnType<typeof useNavGroups>
  plan: Organization['plan']
  onNavigate: (href: string) => void
  onLogout: () => void
  onClose?: () => void
  godMode?: boolean
  onExitGodMode?: () => void
  backLabel: string
  logoutLabel: string
  closeMenuLabel: string
  logoUrl?: string
}) {
  return (
    <>
      {/* Logo + org identifier */}
      <div className={`px-4 py-4 flex items-center ${isOpen ? 'gap-2' : 'justify-center'} border-b border-border`}>
        {isOpen ? (
          <div className="animate-fade-in flex-1 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt={orgName || 'Logo'} className="h-7 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <SentientEyeSmall />
                <span className="text-xs font-mono font-bold text-brand-purple tracking-wide">Nucleus</span>
              </div>
            )}
            <div className="text-text-dim text-[9px] font-mono uppercase tracking-widest truncate mt-1">{orgName}</div>
          </div>
        ) : (
          logoUrl ? (
            <img src={logoUrl} alt={orgName || 'Logo'} className="h-7 w-7 object-contain rounded" />
          ) : (
            <SentientEyeSmall />
          )
        )}
        {mobile && onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors ml-auto flex-shrink-0" aria-label={closeMenuLabel}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto" role="navigation" aria-label={navGroups[0]?.label || 'Navigation'}>
        {navGroups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-3' : ''}>
            {isOpen && (
              <div className="px-3 mb-1 animate-fade-in">
                <span className="text-[9px] font-mono font-medium uppercase tracking-[0.2em] text-text-dim">
                  {group.label}
                </span>
              </div>
            )}
            {!isOpen && gi > 0 && (
              <div className="mx-3 mb-2 border-t border-border" />
            )}
            <div className="space-y-px">
              {group.items.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
                const Icon = item.icon
                const locked = !canAccessByPlan(plan, item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => onNavigate(locked ? '/dashboard/planes' : item.href)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-mono tracking-wide transition-all duration-150 cursor-pointer ${
                      locked
                        ? 'text-text-dim/50 hover:text-text-muted hover:bg-surface-2 rounded-md'
                        : isActive
                        ? 'text-brand-purple bg-brand-purple/5 border-l-2 border-brand-purple rounded-r-md -ml-px'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-2 rounded-md'
                    } ${!isOpen ? 'justify-center' : ''}`}
                    title={!isOpen ? (locked ? `${item.label} (Upgrade)` : item.label) : undefined}
                    aria-label={locked ? `${item.label} — requiere upgrade` : item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={16} className="flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                    {isOpen && (
                      <span className={`animate-fade-in truncate ${locked ? 'flex-1' : ''}`}>{item.label}</span>
                    )}
                    {isOpen && locked && (
                      <Lock size={12} className="flex-shrink-0 text-text-dim/40" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 border-t border-border space-y-px">
        {godMode && onExitGodMode && (
          <button
            onClick={onExitGodMode}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[11px] font-mono text-status-danger/70 hover:text-status-danger hover:bg-status-danger/5 transition-all ${!isOpen ? 'justify-center' : ''}`}
            aria-label={backLabel}
          >
            <ArrowLeft size={16} className="flex-shrink-0" />
            {isOpen && <span className="animate-fade-in">{backLabel}</span>}
          </button>
        )}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[11px] font-mono text-text-dim hover:text-status-danger hover:bg-status-danger/5 transition-all ${!isOpen ? 'justify-center' : ''}`}
          aria-label={logoutLabel}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {isOpen && <span className="animate-fade-in">{logoutLabel}</span>}
        </button>
      </div>
    </>
  )
}

/* ================================================================
   GOD MODE BANNER — Flat, minimal, mono
   ================================================================ */

function GodModeBanner({ orgName, onExit }: { orgName: string; onExit: () => void }) {
  const t = useTranslations('godMode')
  const tNav = useTranslations('nav')
  return (
    <div className="bg-status-danger/5 border-b border-status-danger/15 px-4 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield size={12} className="text-status-danger" />
        <span className="text-[10px] font-mono font-bold text-status-danger uppercase tracking-wider">{t('label')}</span>
        <span className="text-[10px] font-mono text-text-dim">{t('viewing')} <strong className="text-text-secondary">{orgName}</strong></span>
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-status-danger/8 border border-status-danger/15 text-status-danger text-[9px] font-mono font-semibold hover:bg-status-danger/15 transition-colors"
      >
        <ArrowLeft size={9} />
        {tNav('backToAdmin')}
      </button>
    </div>
  )
}

/* ================================================================
   BRANCH SELECTOR — Dropdown, mono, minimal
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
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2 border border-border text-[10px] font-mono text-text-muted hover:text-text-primary hover:border-brand-purple/30 transition-all"
      >
        <MapPin size={11} className={selectedBranchId ? 'text-brand-purple' : ''} />
        <span className="hidden sm:inline max-w-[100px] truncate">
          {selected ? selected.name : tLayout('allBranches')}
        </span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 animate-fade-in">
            <button
              onClick={() => { onSelect(null); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-surface-2 transition-colors ${!selectedBranchId ? 'text-brand-purple font-semibold' : 'text-text-muted'}`}
            >
              {tLayout('allBranches')}
            </button>
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => { onSelect(b.id); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-surface-2 transition-colors ${selectedBranchId === b.id ? 'text-brand-purple font-semibold' : 'text-text-muted'}`}
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
   TRIAL BANNER — Tight, urgent, mono
   ================================================================ */

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
  const t = useTranslations('trial')

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
      ? t('expiresToday')
      : t('daysLeft', { days: daysLeft })
    : t('daysLeft', { days: daysLeft })

  return (
    <div className={`px-4 py-1.5 flex items-center justify-between border-b transition-all ${
      isUrgent
        ? 'bg-status-warning/5 border-status-warning/15'
        : 'bg-surface-2 border-border'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        {isUrgent ? (
          <Clock size={10} className="text-status-warning flex-shrink-0" />
        ) : (
          <Zap size={10} className="text-brand-purple flex-shrink-0" />
        )}
        <span className={`text-[10px] font-mono truncate ${isUrgent ? 'text-status-warning' : 'text-text-muted'}`}>
          {copy}
        </span>
      </div>

      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
        <button
          onClick={() => onNavigate('/dashboard/planes')}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold transition-colors ${
            isUrgent
              ? 'bg-status-warning/10 text-status-warning hover:bg-status-warning/20'
              : 'bg-brand-purple/8 text-brand-purple hover:bg-brand-purple/15'
          }`}
        >
          {t('upgrade')}
          <ArrowRight size={9} />
        </button>
        <button
          onClick={handleDismiss}
          className="w-4 h-4 rounded flex items-center justify-center text-text-dim hover:text-text-muted transition-colors"
          aria-label={t('banner')}
        >
          <X size={10} />
        </button>
      </div>
    </div>
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [godMode, setGodMode] = useState(false)
  const [godModeOrgName, setGodModeOrgName] = useState('')

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

      const impersonatedOrgId = getImpersonatedOrgId()
      const impersonatedOrgName = getImpersonatedOrgName()
      const isAdmin = isSuperAdmin(session.user)

      if (isAdmin && impersonatedOrgId) {
        setGodMode(true)
        setGodModeOrgName(impersonatedOrgName || 'Org desconocida')

        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('id, name, status, plan, trial_ends_at, plan_started_at, billing_cycle, config_settings, specialty, country')
            .eq('id', impersonatedOrgId)
            .single()
          if (!error && data) {
            setOrg(data as Organization)
            Sentry.setContext('organization', { id: data.id, name: data.name })
            setRole('OWNER')
          }
        } catch {
          stopImpersonation()
          router.replace('/admin')
          return
        }
      } else if (isAdmin && !impersonatedOrgId) {
        router.replace('/admin')
        return
      } else {
        try {
          const { organization, role: userRole } = await fetchUserOrganization(session.user.id)
          setOrg(organization)
          setRole(userRole)
          if (organization) {
            Sentry.setContext('organization', { id: organization.id, name: organization.name })
          }
        } catch (err) {
          Sentry.captureException(err, { tags: { context: 'org_bootstrap' } })
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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
          <p className="text-text-dim text-[10px] font-mono tracking-[0.25em] uppercase">{tLayout('loadingDashboard')}</p>
        </div>
      </div>
    )
  }

  const sidebarProps = {
    pathname,
    orgName: org?.name || 'Nucleus',
    navGroups: FILTERED_NAV_GROUPS,
    plan: org?.plan || ('STARTER' as Organization['plan']),
    onNavigate: navigateTo,
    onLogout: handleLogout,
    godMode,
    onExitGodMode: handleExitGodMode,
    backLabel: t('backToAdmin'),
    logoutLabel: t('logout'),
    closeMenuLabel: tLayout('closeMenu'),
    logoUrl,
  }

  const currentPageLabel = NAV_ITEMS.find(i => i.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(i.href))?.label || 'Nucleus'

  return (
    <div className="min-h-screen flex flex-col bg-void">
      {/* GOD MODE BANNER */}
      {godMode && <GodModeBanner orgName={godModeOrgName} onExit={handleExitGodMode} />}

      {/* TRIAL BANNER */}
      <TrialBanner org={org} godMode={godMode} onNavigate={navigateTo} />

      {/* TRIAL EXPIRED OVERLAY */}
      {org?.status === 'TRIAL_EXPIRED' && !godMode && (
        <div className="fixed inset-0 z-50 bg-void/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm text-center">
            <div className="w-12 h-12 rounded-lg bg-status-danger/8 border border-status-danger/15 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={20} className="text-status-danger" />
            </div>
            <h2 className="text-sm font-bold font-mono text-text-primary mb-1.5">Tu periodo de prueba ha expirado</h2>
            <p className="text-text-muted text-[10px] font-mono mb-4">
              Para seguir usando SofIA y que tus pacientes sigan siendo atendidos, activa un plan.
            </p>
            <button
              onClick={() => navigateTo('/dashboard/planes')}
              className="px-5 py-2 rounded-lg bg-brand-purple text-white text-[10px] font-mono font-semibold hover:bg-brand-purple-dark transition-colors"
            >
              Ver planes
            </button>
            <p className="text-text-dim text-[9px] font-mono mt-2">
              gestion@ataraxiaialabs.ai
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 flex">
        {/* ========== DESKTOP SIDEBAR ========== */}
        <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-surface border-r border-border hidden lg:flex flex-col transition-all duration-200 relative flex-shrink-0`}>
          <Sidebar isOpen={sidebarOpen} {...sidebarProps} />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-7 w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary hover:border-brand-purple/30 transition-all z-10"
            aria-label={sidebarOpen ? tLayout('closeMenu') : tLayout('mainMenu')}
          >
            {sidebarOpen ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
          </button>
        </aside>

        {/* ========== MOBILE SIDEBAR OVERLAY ========== */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative w-64 h-full bg-surface border-r border-border flex flex-col animate-slide-in">
              <Sidebar isOpen mobile onClose={() => setMobileMenuOpen(false)} {...sidebarProps} />
            </aside>
          </div>
        )}

        {/* ========== MAIN CONTENT ========== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Clinic Pulse — real-time heartbeat line */}
          <div className="clinic-pulse" />

          {/* Topbar */}
          <header className="h-12 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="w-8 h-8 rounded-md bg-surface-2 border border-border flex lg:hidden items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                aria-label={tLayout('mainMenu')}
              >
                <Menu size={16} />
              </button>
              <div>
                <h1 className="text-text-primary font-mono font-semibold text-xs tracking-wide">
                  {currentPageLabel}
                </h1>
                <p className="text-text-dim text-[9px] font-mono hidden sm:block">{org?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Branch selector */}
              {branches.length > 1 && (
                <BranchSelector
                  branches={branches}
                  selectedBranchId={selectedBranchId}
                  onSelect={setBranchId}
                />
              )}

              {/* Sentient dot — SofIA is alive */}
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2 border border-border">
                <div className="sentient-dot" />
                <span className="text-[9px] font-mono text-text-muted">SofIA</span>
              </div>
              {/* Mobile: just the sentient dot */}
              <div className="sm:hidden sentient-dot" />

              <NotificationsDropdown orgId={org?.id || ''} />

              <ThemeToggle />

              {/* User avatar — mono initial */}
              <div className={`w-7 h-7 rounded-md border flex items-center justify-center font-mono font-bold text-[10px] ${godMode ? 'bg-status-danger/8 border-status-danger/15 text-status-danger' : 'bg-brand-purple/8 border-brand-purple/15 text-brand-purple'}`}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-3 lg:p-5 overflow-auto" role="main">
            {org && user ? (
              <OrgContext.Provider value={{ user, org, orgId: org.id, role, branches, branchId: selectedBranchId, setBranchId }}>
                <ErrorBoundary>
                  {org.status === 'SETUP' && !godMode ? (
                    <OnboardingWizard org={org} orgId={org.id} onComplete={() => window.location.reload()} />
                  ) : (
                    <RoleGuard>{children}</RoleGuard>
                  )}
                </ErrorBoundary>
              </OrgContext.Provider>
            ) : (
              <div className="glass-card p-6 text-center">
                <p className="text-text-muted text-xs font-mono">No se encontro organizacion asociada a tu cuenta.</p>
                <p className="text-text-dim text-[10px] font-mono mt-1">Contacta al administrador de Ataraxia.</p>
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
