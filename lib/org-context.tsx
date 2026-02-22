'use client'

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Organization } from '@/types'

export type OrgRole = 'OWNER' | 'ADMIN' | 'VIEWER'

export interface OrgContextValue {
  user: User
  org: Organization
  orgId: string
  role: OrgRole
}

export const OrgContext = createContext<OrgContextValue | null>(null)

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within OrgContext.Provider (dashboard layout)')
  return ctx
}
