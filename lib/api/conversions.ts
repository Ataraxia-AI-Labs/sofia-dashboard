import { API_URL, authFetch } from './helpers'
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
  return res.json()
}

export async function getFollowUpQueue(orgId: string, limit: number = 20): Promise<FollowUpItem[]> {
  const res = await authFetch(`${API_URL}/conversions/${orgId}/follow-up-queue?limit=${limit}`)
  if (!res.ok) return []
  return res.json()
}

export async function getBestContactTime(orgId: string, patientId: string): Promise<{ best_time: string; best_day: string } | null> {
  const res = await authFetch(`${API_URL}/conversions/${orgId}/best-time/${patientId}`)
  if (!res.ok) return null
  return res.json()
}
