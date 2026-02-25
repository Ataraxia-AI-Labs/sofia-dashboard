import { API_URL, authFetch, withBranch } from './helpers'
import type { InteractionLog } from '@/types'

export async function fetchInteractions(orgId: string, opts?: {
  limit?: number
  offset?: number
  patient_id?: string
  channel?: string
  from?: string
  to?: string
  branchId?: string | null
}): Promise<InteractionLog[]> {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  if (opts?.patient_id) params.set('patient_id', opts.patient_id)
  if (opts?.channel) params.set('channel', opts.channel)
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)

  let url = `${API_URL}/interactions/${orgId}?${params.toString()}`
  url = withBranch(url, opts?.branchId)

  const res = await authFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  // Backend may return { interactions: [...] } or raw array
  return Array.isArray(data) ? data : (data.interactions || data.data || [])
}

// Re-export the type from types/index.ts for backward compatibility
export type { InteractionLog } from '@/types'
