'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useOrg } from '@/lib/org-context'
import { canAccessRoute } from '@/lib/role-permissions'

/**
 * RoleGuard — wraps dashboard page content and redirects to /403 when
 * the authenticated user's role does not have access to the current route.
 *
 * Must be rendered inside an OrgContext.Provider (dashboard layout).
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { role } = useOrg()
  const pathname = usePathname()
  const router = useRouter()

  const allowed = canAccessRoute(role, pathname)

  useEffect(() => {
    if (!allowed) {
      router.replace('/403')
    }
  }, [allowed, router])

  if (!allowed) return null

  return <>{children}</>
}
