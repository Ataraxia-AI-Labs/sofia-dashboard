import { API_URL, authFetch, unwrapArray } from './helpers'
import type { DuplicateCandidate, DuplicateStats } from '@/types'

// ============================================================
// DUPLICATE DETECTION API (P5-11)
// ============================================================

// S147: backend returns {scanned, found, stored, error}; the frontend
// previously typed `duplicates_found` and read it back undefined, which
// rendered "found undefined duplicados" in the toast. Normalize at the
// boundary so callers can treat `duplicates_found` as the canonical
// field name without caring what the backend uses.
export async function scanDuplicates(orgId: string): Promise<{ scanned: number; duplicates_found: number; stored?: number } | null> {
  const res = await authFetch(`${API_URL}/api/duplicates/scan/${orgId}`, {
    method: 'POST',
  })
  if (!res.ok) return null
  const raw = await res.json()
  if (raw?.error) return null
  return {
    scanned: raw.scanned ?? 0,
    duplicates_found: raw.found ?? raw.duplicates_found ?? 0,
    stored: raw.stored ?? 0,
  }
}

export async function getDuplicates(orgId: string, status?: string): Promise<DuplicateCandidate[]> {
  let url = `${API_URL}/api/duplicates/${orgId}`
  if (status) url += `?status=${status}`
  const res = await authFetch(url)
  if (!res.ok) return []
  return unwrapArray<DuplicateCandidate>(await res.json(), 'duplicates', 'candidates')
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
  // S154: backend devuelve `{stats: {total_detected, pending, merged, dismissed, ...}}`.
  // Frontend leía res.json() directo (envelope ignorado) y el panel renderaba 0/0/0/0
  // aunque sí había candidates. También el backend usa `pending` mientras el type tenía
  // `pending_review` — mapeamos aquí para mantener el shape del frontend estable.
  const data = await res.json()
  const stats = (data?.stats ?? data) || {}
  return {
    total_detected: stats.total_detected ?? 0,
    pending_review: stats.pending ?? stats.pending_review ?? 0,
    merged: stats.merged ?? 0,
    dismissed: stats.dismissed ?? 0,
  }
}

export async function checkPatient(orgId: string, patientId: string): Promise<DuplicateCandidate[]> {
  const res = await authFetch(`${API_URL}/api/duplicates/check-patient/${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  })
  if (!res.ok) return []
  return unwrapArray<DuplicateCandidate>(await res.json(), 'duplicates', 'candidates', 'matches')
}
