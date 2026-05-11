import { API_URL, authFetch, unwrapArray } from './helpers'
import type {
  ConversionPrediction,
  ConversionInsights,
  FollowUpItem,
  PredictAllResult,
} from '@/types'

// ============================================================
// CONVERSION PREDICTION API (P4-05)
// ============================================================

export async function predictConversion(orgId: string, patientId: string): Promise<ConversionPrediction | null> {
  const res = await authFetch(`${API_URL}/conversions/${orgId}/predict/${patientId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function predictAll(orgId: string): Promise<PredictAllResult | null> {
  const res = await authFetch(`${API_URL}/conversions/${orgId}/predict-all`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getConversionInsights(orgId: string): Promise<ConversionInsights | null> {
  const res = await authFetch(`${API_URL}/conversions/${orgId}/insights`)
  if (!res.ok) return null
  // S154: backend envuelve `{insights: {...}}` — sin desempaque,
  // insights.total_predictions / avg_conversion_rate / quincena_lift
  // quedaban undefined y los stat cards mostraban 0/0/0 aunque la
  // BD tuviera 54 predicciones. Patrón consistente con stats,
  // rankings, market-position, pricing.
  const data = await res.json()
  return (data?.insights ?? data) as ConversionInsights
}

export async function getFollowUpQueue(orgId: string, limit: number = 20): Promise<FollowUpItem[]> {
  const res = await authFetch(`${API_URL}/conversions/${orgId}/follow-up-queue?limit=${limit}`)
  if (!res.ok) return []
  return unwrapArray<FollowUpItem>(await res.json(), 'queue', 'follow_ups')
}

export async function getBestContactTime(orgId: string, patientId: string): Promise<{ best_time: string; best_day: string } | null> {
  const res = await authFetch(`${API_URL}/conversions/${orgId}/best-time/${patientId}`)
  if (!res.ok) return null
  return res.json()
}
