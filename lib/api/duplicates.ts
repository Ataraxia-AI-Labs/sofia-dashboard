import { API_URL, authFetch } from './helpers'
import type { DuplicateCandidate, DuplicateStats } from '@/types'

// ============================================================
// DUPLICATE DETECTION API (P5-11)
// ============================================================

export async function scanDuplicates(orgId: string): Promise<{ scanned: number; duplicates_found: number } | null> {
  const res = await authFetch(`${API_URL}/api/duplicates/scan/${orgId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getDuplicates(orgId: string, status?: string): Promise<DuplicateCandidate[]> {
  let url = `${API_URL}/api/duplicates/${orgId}`
  if (status) url += `?status=${status}`
  const res = await authFetch(url)
  if (!res.ok) return []
  const body = await res.json()
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.duplicates)) return body.duplicates
  if (Array.isArray(body?.items)) return body.items
  if (Array.isArray(body?.data)) return body.data
  return []
}

export async function confirmDuplicate(
  orgId: string,
  duplicateId: string,
  primaryPatientId: string
): Promise<{ merged: boolean } | null> {
  const res = await authFetch(`${API_URL}/api/duplicates/${orgId}/confirm/${duplicateId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ primary_patient_id: primaryPatientId }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function dismissDuplicate(orgId: string, duplicateId: string): Promise<boolean> {
  const res = await authFetch(`${API_URL}/api/duplicates/${orgId}/dismiss/${duplicateId}`, {
    method: 'POST',
  })
  return res.ok
}

export async function getDuplicateStats(orgId: string): Promise<DuplicateStats | null> {
  const res = await authFetch(`${API_URL}/api/duplicates/${orgId}/stats`)
  if (!res.ok) return null
  return res.json()
}

export async function checkPatient(orgId: string, patientId: string): Promise<DuplicateCandidate[]> {
  const res = await authFetch(`${API_URL}/api/duplicates/check-patient/${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  })
  if (!res.ok) return []
  return res.json()
}
