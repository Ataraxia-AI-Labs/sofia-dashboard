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

export async function downloadReportPdf(orgId: string, dias: number = 30, branchId?: string | null) {
  const url = withBranch(`${API_URL}/analytics/${orgId}/report/pdf?dias=${dias}`, branchId)
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Report download error: ${res.status}`)
  return res.blob()
}

export async function fetchAiQualityMetrics(orgId: string) {
  const res = await authFetch(`${API_URL}/analytics/${orgId}/ai-quality`)
  if (!res.ok) throw new Error(`AI quality metrics error: ${res.status}`)
  return res.json()
}
