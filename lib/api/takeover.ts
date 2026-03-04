import { API_URL, authFetch } from './helpers'

export interface ActiveTakeover {
  patient_id: string
  taken_by: string | null
  reason: string
  started_at: string
}

export async function fetchActiveTakeovers(orgId: string): Promise<ActiveTakeover[]> {
  const res = await authFetch(`${API_URL}/takeover/${orgId}/active`)
  if (!res.ok) return []
  const data = await res.json()
  return data.takeovers || []
}

export async function startTakeover(orgId: string, patientId: string, reason: string = 'Manual takeover from dashboard') {
  const res = await authFetch(`${API_URL}/takeover/${orgId}/${patientId}/start`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error(`Start takeover failed: ${res.status}`)
  return res.json()
}

export async function endTakeover(orgId: string, patientId: string) {
  const res = await authFetch(`${API_URL}/takeover/${orgId}/${patientId}/end`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`End takeover failed: ${res.status}`)
  return res.json()
}

export async function sendTakeoverMessage(orgId: string, patientId: string, text: string) {
  const res = await authFetch(`${API_URL}/takeover/${orgId}/${patientId}/send`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Send message failed: ${res.status}`)
  return res.json()
}
