import { API_URL, authFetch } from './helpers'
import type { DuplicateCandidate, DuplicateStats } from '@/types'

// ============================================================
// DUPLICATE DETECTION API (P5-11)
// ============================================================

export async function scanDuplicates(orgId: string): Promise<{ scanned: number; duplicates_found: number } | null> {
  const res = await authFetch(`${API_URL}/duplicates/${orgId}/scan`, {
    method: 'POST',
  })
  if (!res.ok) return null
  return res.json()
}

export async function getDuplicates(orgId: string, status?: string): Promise<DuplicateCandidate[]> {
  let url = `${API_URL}/duplicates/${orgId}`
  if (status) url += `?status=${status}`
  const res = await authFetch(url)
  if (!res.ok) return []
  return res.json()
}

export async function confirmDuplicate(
  orgId: string,
  duplicateId: string,
  primaryPatientId: string
): Promise<{ merged: boolean } | null> {
  const res = await authFetch(`${API_URL}/duplicates/${orgId}/${duplicateId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ primary_patient_id: primaryPatientId }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function dismissDuplicate(orgId: string, duplicateId: string): Promise<boolean> {
  const res = await authFetch(`${API_URL}/duplicates/${orgId}/${duplicateId}/dismiss`, {
    method: 'POST',
  })
  return res.ok
}

export async function getDuplicateStats(orgId: string): Promise<DuplicateStats | null> {
  const res = await authFetch(`${API_URL}/duplicates/${orgId}/stats`)
  if (!res.ok) return null
  return res.json()
}

export async function checkPatient(orgId: string, patientId: string): Promise<DuplicateCandidate[]> {
  const res = await authFetch(`${API_URL}/duplicates/${orgId}/check/${patientId}`)
  if (!res.ok) return []
  return res.json()
}
