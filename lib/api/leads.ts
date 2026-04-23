import { API_URL, authFetch, unwrapArray } from './helpers'
import type { LeadScore, LeadInsights, LeadScoreAllResult, LeadClassification } from '@/types'

// ============================================================
// LEAD SCORING API (P4-02)
// ============================================================

export async function scorePatient(orgId: string, patientId: string): Promise<LeadScore | null> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/score/${patientId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function scoreAllLeads(orgId: string): Promise<LeadScoreAllResult | null> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/score-all`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getLeadScores(
  orgId: string,
  classification?: LeadClassification
): Promise<LeadScore[]> {
  let url = `${API_URL}/leads/${orgId}/scores`
  if (classification) url += `?classification=${classification}`
  const res = await authFetch(url)
  if (!res.ok) return []
  return unwrapArray<LeadScore>(await res.json(), 'scores', 'leads')
}

export async function getLeadInsights(orgId: string): Promise<LeadInsights | null> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/insights`)
  if (!res.ok) return null
  return res.json()
}

export async function getTopLeads(orgId: string, limit: number = 10): Promise<LeadScore[]> {
  const res = await authFetch(`${API_URL}/leads/${orgId}/top?limit=${limit}`)
  if (!res.ok) return []
  return unwrapArray<LeadScore>(await res.json(), 'leads', 'top')
}
