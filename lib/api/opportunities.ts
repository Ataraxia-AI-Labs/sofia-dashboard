import { API_URL, authFetch, withBranch } from './helpers'
import { normalizeOpportunity } from '@/lib/label-maps'

// Backend → Frontend status mapping
const STATUS_MAP: Record<string, string> = {
  ENGAGED: 'ACTED_ON',
  LOST: 'DISMISSED',
}

// Frontend → Backend reverse mappings (for updates)
const REVERSE_STATUS_MAP: Record<string, string> = {
  ACTED_ON: 'ENGAGED',
  DISMISSED: 'LOST',
}

function mapOpportunity(opp: Record<string, unknown>): Record<string, unknown> {
  const rawType = (opp.opportunity_type ?? '') as string
  const rawStatus = (opp.status ?? '') as string
  return {
    ...opp,
    opportunity_type: normalizeOpportunity(rawType),
    status: STATUS_MAP[rawStatus] ?? rawStatus,
  }
}

export async function fetchOpportunities(orgId: string, status?: string, branchId?: string | null) {
  const params = new URLSearchParams()
  // Map frontend status to backend status for filtering
  if (status) {
    const backendStatus = REVERSE_STATUS_MAP[status] ?? status
    params.set('status', backendStatus)
  }

  let url = `${API_URL}/opportunities/${orgId}`
  const qs = params.toString()
  if (qs) url += `?${qs}`
  url = withBranch(url, branchId)

  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Opportunities error: ${res.status}`)
  const data = await res.json()
  const raw = Array.isArray(data) ? data : (data.opportunities ?? data.data ?? [])
  return raw.map(mapOpportunity)
}

export async function updateOpportunity(opportunityId: string, data: Record<string, string>) {
  // Map frontend status to backend status for updates
  const mapped = { ...data }
  if (mapped.status) {
    mapped.status = REVERSE_STATUS_MAP[mapped.status] ?? mapped.status
  }
  const res = await authFetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: 'PATCH',
    body: JSON.stringify(mapped),
  })
  if (!res.ok) throw new Error(`Update opportunity error: ${res.status}`)
  return res.json()
}
