import { API_URL, authFetch, withBranch } from './helpers'
import { normalizeOpportunity } from '@/lib/label-maps'

// S93/S111 audit fix: backend and frontend share the SAME status enum:
//   DETECTED, ACTED_ON, CONVERTED, EXPIRED, DISMISSED
// (verified live via detected_opportunities_status_check constraint).
// The previous STATUS_MAP/REVERSE_STATUS_MAP introduced phantom values
// `ENGAGED` and `LOST` that the backend rejected with CHECK violations,
// so every PATCH on status returned 500 from the API. Maps removed —
// status flows through unchanged in both directions.

function mapOpportunity(opp: Record<string, unknown>): Record<string, unknown> {
  const rawType = (opp.opportunity_type ?? '') as string
  return {
    ...opp,
    opportunity_type: normalizeOpportunity(rawType),
  }
}

export async function fetchOpportunities(orgId: string, status?: string, branchId?: string | null) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)

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
  const res = await authFetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update opportunity error: ${res.status}`)
  return res.json()
}
