import { API_URL, authFetch, unwrapArray } from './helpers'
import type { FineTuneModel, ModelEvaluation, ModelComparison } from '@/types'

// ============================================================
// FINE-TUNING MODELS API (P4-01)
// ============================================================

export async function getModels(orgId: string): Promise<FineTuneModel[]> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/models`)
  if (!res.ok) return []
  return unwrapArray<FineTuneModel>(await res.json(), 'models')
}

export async function deployModel(orgId: string, modelId: string): Promise<FineTuneModel | null> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/models/${modelId}/deploy`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function evaluateModel(orgId: string, modelId: string): Promise<ModelEvaluation | null> {
  const res = await authFetch(`${API_URL}/models/${orgId}/evaluate`, {
    method: 'POST',
    body: JSON.stringify({ model_id: modelId }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getEvaluations(orgId: string): Promise<ModelEvaluation[]> {
  const res = await authFetch(`${API_URL}/models/${orgId}/evaluations`)
  if (!res.ok) return []
  return unwrapArray<ModelEvaluation>(await res.json(), 'evaluations')
}

export async function compareModels(
  orgId: string,
  modelAId: string,
  modelBId: string
): Promise<ModelComparison | null> {
  const res = await authFetch(`${API_URL}/models/${orgId}/compare`, {
    method: 'POST',
    body: JSON.stringify({ model_a_id: modelAId, model_b_id: modelBId }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getTrainingReadyCount(orgId: string): Promise<number> {
  const res = await authFetch(`${API_URL}/data-lake/${orgId}/training-ready-count`)
  if (!res.ok) return 0
  return res.json()
}
