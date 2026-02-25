import { API_URL, authFetch, withBranch } from './helpers'

export async function fetchFullAnalytics(orgId: string, dias: number = 30, branchId?: string | null) {
  const res = await authFetch(withBranch(`${API_URL}/analytics/${orgId}/full?dias=${dias}`, branchId))
  if (!res.ok) throw new Error(`Analytics error: ${res.status}`)
  return res.json()
}

export async function fetchQuickMetrics(orgId: string) {
  const res = await authFetch(`${API_URL}/analytics/${orgId}/quick`)
  if (!res.ok) throw new Error(`Quick metrics error: ${res.status}`)
  return res.json()
}
