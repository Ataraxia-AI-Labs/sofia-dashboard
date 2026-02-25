import { API_URL, authFetch, withBranch } from './helpers'

export async function fetchOpportunities(orgId: string, status?: string, branchId?: string | null) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)

  let url = `${API_URL}/opportunities/${orgId}`
  const qs = params.toString()
  if (qs) url += `?${qs}`
  url = withBranch(url, branchId)

  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Opportunities error: ${res.status}`)
  return res.json()
}

export async function updateOpportunity(opportunityId: string, data: Record<string, string>) {
  const res = await authFetch(`${API_URL}/opportunities/${opportunityId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update opportunity error: ${res.status}`)
  return res.json()
}
