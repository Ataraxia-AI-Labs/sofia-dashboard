import { API_URL, authFetch } from './helpers'
import type { WaitingRoomEntry, WaitingRoomStats, LatePatient } from '@/types'

// ============================================================
// WAITING ROOM API — Sala de Espera Virtual (P5-04)
// ============================================================

export async function checkIn(
  orgId: string,
  patientId: string,
  appointmentId?: string
): Promise<WaitingRoomEntry> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId, appointment_id: appointmentId }),
  })
  if (!res.ok) throw new Error('Check-in failed')
  return res.json()
}

export async function getQueue(orgId: string): Promise<WaitingRoomEntry[]> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/queue`)
  if (!res.ok) return []
  return res.json()
}

export async function getLatePatients(orgId: string): Promise<LatePatient[]> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/late`)
  if (!res.ok) return []
  return res.json()
}

export async function notifyLate(orgId: string, patientId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/notify-late/${patientId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Notify failed')
}

export async function offerReschedule(orgId: string, appointmentId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/offer-reschedule/${appointmentId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Offer reschedule failed')
}

export async function notifyNext(orgId: string, patientId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/notify-next/${patientId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Notify next failed')
}

export async function completeVisit(orgId: string, appointmentId: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/complete/${appointmentId}`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error('Complete failed')
}

export async function getWaitingStats(orgId: string): Promise<WaitingRoomStats | null> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/stats`)
  if (!res.ok) return null
  return res.json()
}
