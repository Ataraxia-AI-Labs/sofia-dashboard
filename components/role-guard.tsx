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

  const roleAllowed = canAccessRoute(role, pathname)
  const planAllowed = canAccessByPlan(org.plan, pathname)

  useEffect(() => {
    if (!roleAllowed) {
      router.replace('/403')
    }
  }, [roleAllowed, router])

  if (!roleAllowed) return null

  if (!planAllowed) {
    const pageNames: Record<string, string> = {
      '/dashboard/datalake': 'Data Lake',
      '/dashboard/network': 'Red Inter-Clinica',
    }
    const featureName = pageNames[pathname] || 'Esta funcionalidad'
    return <UpgradeGate minPlan={getMinPlanForRoute(pathname)} featureName={featureName} />
  }

  return <>{children}</>
}
