/**
 * God Mode — Super Admin Org Impersonation
 * ==========================================
 * Allows super admins to view any clinic's dashboard as if they were the owner.
 * State is stored in sessionStorage so it clears when the tab closes.
 */

const IMPERSONATION_KEY = 'sofia_god_mode_org_id'
const IMPERSONATION_NAME_KEY = 'sofia_god_mode_org_name'

/** Get the currently impersonated org ID (null if not impersonating) */
export function getImpersonatedOrgId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(IMPERSONATION_KEY)
}

/** Get the currently impersonated org name */
export function getImpersonatedOrgName(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(IMPERSONATION_NAME_KEY)
}

/** Start impersonating an org (God Mode) */
export function startImpersonation(orgId: string, orgName: string): void {
  sessionStorage.setItem(IMPERSONATION_KEY, orgId)
  sessionStorage.setItem(IMPERSONATION_NAME_KEY, orgName)
}

/** Stop impersonating — return to admin panel */
export function stopImpersonation(): void {
  sessionStorage.removeItem(IMPERSONATION_KEY)
  sessionStorage.removeItem(IMPERSONATION_NAME_KEY)
}

/** Check if currently in God Mode */
export function isImpersonating(): boolean {
  return getImpersonatedOrgId() !== null
}
