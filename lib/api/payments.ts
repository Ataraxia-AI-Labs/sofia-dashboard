import { API_URL, authFetch, withBranch } from './helpers'
import type { Payment, RevenueAttribution } from '@/types'

export async function fetchPayments(orgId: string, opts?: {
  status?: string
  branchId?: string | null
}): Promise<Payment[]> {
  let url = `${API_URL}/payments/${orgId}`
  if (opts?.status) url += `?status=${opts.status}`
  url = withBranch(url, opts?.branchId)
  const res = await authFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return data.payments || []
}

export async function fetchRevenueAttribution(orgId: string, days: number = 30, branchId?: string | null): Promise<RevenueAttribution | null> {
  let url = `${API_URL}/payments/${orgId}/attribution?dias=${days}`
  url = withBranch(url, branchId)
  const res = await authFetch(url)
  if (!res.ok) return null
  return res.json()
}
