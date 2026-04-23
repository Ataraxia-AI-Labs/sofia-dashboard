import { API_URL, authFetch, unwrapArray } from './helpers'
import type {
  LearnedRule,
  DoctorCorrection,
  LearningStats,
  LearningProgress,
} from '@/types'

// ============================================================
// DOCTOR LEARNING API (P5-13)
// ============================================================

export async function recordCorrection(
  orgId: string,
  data: {
    doctor_id: string
    correction_type: string
    original_value: Record<string, unknown>
    corrected_value: Record<string, unknown>
    context?: Record<string, unknown>
  }
): Promise<{ id: string } | null> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/correction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function extractPatterns(
  orgId: string,
  doctorId: string
): Promise<{ rules_created: number; message: string } | null> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/extract-patterns/${doctorId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getLearnedRules(
  orgId: string,
  doctorId: string
): Promise<LearnedRule[]> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/rules/${doctorId}`)
  if (!res.ok) return []
  return unwrapArray<LearnedRule>(await res.json(), 'rules')
}

export async function getLearningStats(
  orgId: string,
  doctorId: string
): Promise<LearningStats | null> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/stats/${doctorId}`)
  if (!res.ok) return null
  return res.json()
}

export async function applyRules(
  orgId: string,
  data: { doctor_id: string; context: Record<string, unknown> }
): Promise<{ applied_rules: string[] } | null> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/apply-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return null
  return res.json()
}

export async function deactivateRule(
  orgId: string,
  ruleId: string
): Promise<{ success: boolean } | null> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/rules/${ruleId}/deactivate`, {
    method: 'PATCH',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getCorrectionHistory(
  orgId: string,
  doctorId: string
): Promise<DoctorCorrection[]> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/corrections/${doctorId}`)
  if (!res.ok) return []
  return unwrapArray<DoctorCorrection>(await res.json(), 'corrections', 'history')
}

export async function getLearningProgress(
  orgId: string
): Promise<LearningProgress | null> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/progress`)
  if (!res.ok) return null
  return res.json()
}

export async function suggestRule(
  orgId: string,
  doctorId: string
): Promise<{ rule_description: string; rule_type: string; confidence: number } | null> {
  const res = await authFetch(`${API_URL}/api/learning/${orgId}/suggest-rule/${doctorId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}
