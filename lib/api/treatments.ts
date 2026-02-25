import { API_URL, authFetch } from './helpers'

export async function fetchActiveTreatments(orgId: string) {
  const res = await authFetch(`${API_URL}/treatments/${orgId}`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchPatientTreatments(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/treatments`)
  if (!res.ok) return []
  return res.json()
}

export async function createTreatment(orgId: string, data: {
  patient_id: string
  appointment_id?: string
  treatment_name: string
  medication: string
  dosage: string
  frequency_hours: number
  start_date: string
  end_date: string
  notes?: string
}) {
  const res = await authFetch(`${API_URL}/treatments/${orgId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Create treatment error: ${res.status}`)
  return res.json()
}

export async function updateTreatmentStatus(treatmentId: string, status: string) {
  const res = await authFetch(`${API_URL}/treatments/${treatmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Update treatment error: ${res.status}`)
}
