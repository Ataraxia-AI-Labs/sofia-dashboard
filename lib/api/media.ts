import { API_URL, authFetch } from './helpers'

export async function fetchPatientMedia(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/media`)
  if (!res.ok) return []
  return res.json()
}
