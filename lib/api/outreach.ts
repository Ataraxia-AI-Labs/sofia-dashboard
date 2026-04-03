import { API_URL, authFetch } from './helpers'
import type { OutreachMessage, OutreachStats } from '@/types'

// ============================================================
// OUTREACH API — SofIA Proactiva (P5-01)
// ============================================================

export async function scanOutreach(orgId: string): Promise<{ found: number; message: string }> {
  const res = await authFetch(`${API_URL}/api/outreach/scan/${orgId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Scan failed')
  return res.json()
}

export async function getOutreach(
  orgId: string,
  filters?: { trigger_type?: string; status?: string }
): Promise<OutreachMessage[]> {
  let url = `${API_URL}/api/outreach/${orgId}`
  const params = new URLSearchParams()
  if (filters?.trigger_type) params.set('trigger_type', filters.trigger_type)
  if (filters?.status) params.set('status', filters.status)
  const qs = params.toString()
  if (qs) url += `?${qs}`
  const res = await authFetch(url)
  if (!res.ok) return []
  return res.json()
}

export async function approveOutreach(orgId: string, outreachId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/outreach/${orgId}/approve/${outreachId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Approve failed')
}

export async function approveBatch(orgId: string, ids: string[]): Promise<{ approved: number }> {
  const res = await authFetch(`${API_URL}/api/outreach/${orgId}/approve-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error('Batch approve failed')
  return res.json()
}

export async function rejectOutreach(orgId: string, outreachId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/outreach/${orgId}/reject/${outreachId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Reject failed')
}

export async function getOutreachStats(orgId: string): Promise<OutreachStats | null> {
  const res = await authFetch(`${API_URL}/api/outreach/${orgId}/stats`)
  if (!res.ok) return null
  return res.json()
}

export async function generateMessage(
  orgId: string,
  patientId: string,
  triggerType: string
): Promise<{ message: string }> {
  const res = await authFetch(`${API_URL}/api/outreach/${orgId}/generate-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId, trigger_type: triggerType }),
  })
  if (!res.ok) throw new Error('Generate failed')
  return res.json()
}
