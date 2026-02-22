'use client'

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Organization, Branch } from '@/types'

// Backend roles: OWNER, ADMIN, STAFF (Sesion 18 — aligned with backend)
export type OrgRole = 'OWNER' | 'ADMIN' | 'STAFF'

export interface OrgContextValue {
  user: User
  org: Organization
  orgId: string
  role: OrgRole
  // Multi-sede (B10)
  branches: Branch[]
  branchId: string | null        // null = todas las sedes
  setBranchId: (id: string | null) => void
}

export const OrgContext = createContext<OrgContextValue | null>(null)

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgContext.Provider (dashboard layout)')
  return ctx
}

// ============================================================
// Role-based permission helpers (Sesion 18)
// ============================================================

/** OWNER or ADMIN can modify org settings, make outbound calls, etc. */
export function canEditOrg(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

/** All roles can create patients and appointments */
export function canCreateRecords(_role: OrgRole): boolean {
  return true
}

/** Only OWNER/ADMIN can make outbound calls or update white-label */
export function canMakeOutboundCalls(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}
