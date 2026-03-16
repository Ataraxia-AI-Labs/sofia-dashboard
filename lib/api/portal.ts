import type { PortalData } from '@/types'

// ============================================================
// PATIENT PORTAL API (P5-08) — PUBLIC (no auth)
// ============================================================

const API = process.env.NEXT_PUBLIC_API_URL!

export async function getPortalData(token: string): Promise<PortalData | null> {
  const res = await fetch(`${API}/api/portal/${token}`)
  if (!res.ok) return null
  return res.json()
}

export async function getAppointments(token: string): Promise<PortalData['upcoming_appointments']> {
  const res = await fetch(`${API}/api/portal/${token}/appointments`)
  if (!res.ok) return []
  return res.json()
}

export async function getPayments(token: string): Promise<PortalData['payments']> {
  const res = await fetch(`${API}/api/portal/${token}/payments`)
  if (!res.ok) return []
  return res.json()
}

export async function getGamification(token: string): Promise<PortalData['gamification'] | null> {
  const res = await fetch(`${API}/api/portal/${token}/gamification`)
  if (!res.ok) return null
  return res.json()
}

export async function cancelAppointment(token: string, appointmentId: string): Promise<boolean> {
  const res = await fetch(`${API}/api/portal/${token}/appointments/${appointmentId}/cancel`, {
    method: 'POST',
  })
  return res.ok
}

export async function requestReschedule(
  token: string,
  appointmentId: string,
  preferredDates: string[]
): Promise<boolean> {
  const res = await fetch(`${API}/api/portal/${token}/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferred_dates: preferredDates }),
  })
  return res.ok
}

export async function generatePortalToken(orgId: string, patientId: string): Promise<{ token: string; url: string } | null> {
  const { authFetch } = await import('./helpers')
  const res = await authFetch(`${API}/api/portal/generate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, patient_id: patientId }),
  })
  if (!res.ok) return null
  return res.json()
}
