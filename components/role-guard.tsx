'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useOrg } from '@/lib/org-context'
import { canAccessRoute } from '@/lib/role-permissions'
import { canAccessByPlan, getMinPlanForRoute } from '@/lib/plan-features'
import { UpgradeGate } from '@/components/upgrade-gate'

/**
 * RoleGuard — wraps dashboard page content.
 * 1. Role check: redirects to /403 if role is insufficient.
 * 2. Plan check: shows UpgradeGate if plan doesn't include the feature.
 *
 * Must be rendered inside an OrgContext.Provider (dashboard layout).
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { role, org } = useOrg()
  const pathname = usePathname()
  const router = useRouter()

  // S92-RG1: Compute access only when role/org are available
  const roleAllowed = role && org ? canAccessRoute(role, pathname) : false
  const planAllowed = role && org ? canAccessByPlan(org.plan, pathname) : false

  useEffect(() => {
    if (role && org && !roleAllowed) {
      router.replace('/403')
    }
  }, [role, org, roleAllowed, router])

  if (!role || !org) return null
  if (!roleAllowed) return null

  if (!planAllowed) {
    const pageNames: Record<string, string> = {
      '/dashboard/datalake': 'Data Lake',
      '/dashboard/network': 'Red Inter-Clinica',
      '/dashboard/crecimiento': 'Centro de Crecimiento',
      '/dashboard/contenido': 'Estudio de Contenido',
      '/dashboard/automatizaciones': 'Automatizaciones',
      '/dashboard/webhooks': 'Webhooks',
      '/dashboard/marketplace': 'Marketplace',
    }
    const featureName = pageNames[pathname] || 'Esta funcionalidad'
    return <UpgradeGate minPlan={getMinPlanForRoute(pathname)} featureName={featureName} />
  }

  return <>{children}</>
}
