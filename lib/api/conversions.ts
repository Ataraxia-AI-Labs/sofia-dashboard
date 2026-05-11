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
  // S154: backend envuelve `{insights: {...}}` Y los nombres tampoco
  // matchean del todo:
  //   Backend → {total_predictions, avg_conversion_rate, quincena_lift,
  //              by_day, by_hour, top_priority_count}
  //   Frontend ConversionInsights → {total_predicted, avg_conversion_rate,
  //                                  quincena_lift, by_day, by_hour}
  // Sin mapeo `insights.total_predicted` quedaba undefined → "0" en
  // el stat card aunque BD tenía 54 predicciones reales.
  const data = await res.json()
  const raw = (data?.insights ?? data ?? {}) as Record<string, unknown>
  return {
    total_predicted: (raw.total_predicted ?? raw.total_predictions ?? 0) as number,
    avg_conversion_rate: (raw.avg_conversion_rate ?? 0) as number,
    quincena_boost: (raw.quincena_boost ?? raw.quincena_lift ?? 0) as number,
    top_factors: (raw.top_factors ?? []) as ConversionInsights['top_factors'],
    heatmap: (raw.heatmap ?? {}) as Record<string, Record<string, number>>,
  }
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
