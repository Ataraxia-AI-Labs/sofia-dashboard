import type { OrgRole } from './org-context'

// ============================================================
// ROUTE PERMISSION MAP
// Role-based access control for dashboard routes.
// OWNER = full access | ADMIN = operational access | STAFF = read-only
// ============================================================

export const ROUTE_PERMISSIONS: Record<string, OrgRole[]> = {
  '/dashboard': ['OWNER', 'ADMIN', 'STAFF'],
  '/dashboard/conversaciones': ['OWNER', 'ADMIN', 'STAFF'],
  '/dashboard/pacientes': ['OWNER', 'ADMIN', 'STAFF'],
  '/dashboard/calendario': ['OWNER', 'ADMIN', 'STAFF'],
  '/dashboard/pipeline': ['OWNER', 'ADMIN'],
  '/dashboard/oportunidades': ['OWNER', 'ADMIN'],
  '/dashboard/pagos': ['OWNER', 'ADMIN'],
  '/dashboard/equipo': ['OWNER', 'ADMIN'],
  '/dashboard/datalake': ['OWNER', 'ADMIN'],
  '/dashboard/health': ['OWNER', 'ADMIN'],
  '/dashboard/ajustes': ['OWNER', 'ADMIN'],
  '/dashboard/planes': ['OWNER'],
  '/dashboard/facturacion': ['OWNER'],
}

/**
 * Check whether a role is allowed to access a given pathname.
 *
 * Matching strategy:
 * - `/dashboard` is matched exactly (not as a prefix for sub-routes)
 * - All other routes are matched by exact equality or startsWith prefix
 * - The most specific (longest) matching entry wins
 * - Routes not listed in ROUTE_PERMISSIONS are unrestricted (returns true)
 */
export function canAccessRoute(role: OrgRole, pathname: string): boolean {
  let bestMatch: string | null = null

  for (const route of Object.keys(ROUTE_PERMISSIONS)) {
    const isMatch =
      route === '/dashboard'
        ? pathname === '/dashboard'
        : pathname === route || pathname.startsWith(route + '/')

    if (isMatch && (bestMatch === null || route.length > bestMatch.length)) {
      bestMatch = route
    }
  }

  if (bestMatch === null) return true
  return ROUTE_PERMISSIONS[bestMatch].includes(role)
}

/**
 * Filter a list of nav items, keeping only those accessible to the given role.
 */
export function filterNavByRole<T extends { href: string }>(
  items: T[],
  role: OrgRole
): T[] {
  return items.filter((item) => canAccessRoute(role, item.href))
}
