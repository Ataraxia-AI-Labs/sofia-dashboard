import { API_URL, authFetch, unwrapArray } from './helpers'
import type { LTVPrediction, LTVInsights, CohortData } from '@/types'

// ============================================================
// LIFETIME VALUE PREDICTION API (P5-12)
// ============================================================

export async function predictLTV(orgId: string, patientId: string): Promise<LTVPrediction | null> {
  const res = await authFetch(`${API_URL}/api/ltv/predict/${orgId}/${patientId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function predictAllLTV(orgId: string): Promise<{ predicted: number; message: string } | null> {
  const res = await authFetch(`${API_URL}/api/ltv/predict-all/${orgId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getLTVRankings(orgId: string, limit: number = 10): Promise<LTVPrediction[]> {
  const res = await authFetch(`${API_URL}/api/ltv/rankings/${orgId}?limit=${limit}`)
  if (!res.ok) return []
  return unwrapArray<LTVPrediction>(await res.json(), 'rankings', 'predictions')
}

export async function getLTVInsights(orgId: string): Promise<LTVInsights | null> {
  const res = await authFetch(`${API_URL}/api/ltv/insights/${orgId}`)
  if (!res.ok) return null
  // S153: backend wraps the payload in { insights: {...} } so reading
  // res.json() directly gave avg_ltv = undefined, which the panel rendered
  // as $0 even though there were 54 scored patients (total_predicted_revenue
  // ≈ $40.5M). Unwrap the envelope so the stats line up with the rankings.
  const data = await res.json()
  return (data?.insights ?? data) as LTVInsights
}

export async function getCohortAnalysis(orgId: string): Promise<CohortData[]> {
  const res = await authFetch(`${API_URL}/api/ltv/cohort-analysis/${orgId}`)
  if (!res.ok) return []
  return unwrapArray<CohortData>(await res.json(), 'cohorts', 'cohort_analysis')
}

export async function getAtRiskPatients(orgId: string): Promise<LTVPrediction[]> {
  const res = await authFetch(`${API_URL}/api/ltv/at-risk/${orgId}`)
  if (!res.ok) return []
  return unwrapArray<LTVPrediction>(await res.json(), 'at_risk', 'patients')
}
