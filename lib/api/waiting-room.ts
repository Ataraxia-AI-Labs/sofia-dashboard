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
  const data = await res.json()
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.queue)) return data.queue
  return []
}

export async function getLatePatients(orgId: string): Promise<LatePatient[]> {
  const res = await authFetch(`${API_URL}/api/waiting-room/${orgId}/late`)
  if (!res.ok) return []
  const data = await res.json()
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.late_patients)) return data.late_patients
  if (data && Array.isArray(data.late)) return data.late
  return []
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
  const data = await res.json()
  // Backend returns {stats: {total_visits, avg_wait_minutes, late_rate, no_show_rate, reschedule_rate, by_status}}
  // Frontend expects {currently_waiting, avg_wait_today, late_count, no_show_rate, completed_today}
  const raw = (data?.stats ?? data) as Record<string, unknown>
  const byStatus = (raw.by_status ?? {}) as Record<string, number>
  return {
    currently_waiting: Number(byStatus.WAITING ?? byStatus.CHECKED_IN ?? 0),
    avg_wait_today: Math.round(Number(raw.avg_wait_minutes ?? 0)),
    late_count: Math.round(Number(raw.total_visits ?? 0) * Number(raw.late_rate ?? 0)),
    no_show_rate: Number(raw.no_show_rate ?? 0),
    completed_today: Number(byStatus.COMPLETED ?? byStatus.DONE ?? 0),
  }
}
