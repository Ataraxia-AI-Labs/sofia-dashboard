import { API_URL, authFetch } from './helpers'

export async function fetchAppointments(orgId: string, opts?: {
  from?: string
  to?: string
  status?: string
  branchId?: string | null
}) {
  const params = new URLSearchParams()
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)
  if (opts?.status) params.set('status', opts.status)

  const url = `${API_URL}/appointments/${orgId}?${params.toString()}`
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Appointments error: ${res.status}`)
  return res.json()
}

export async function fetchPatientAppointments(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/detail`)
  if (!res.ok) return []
  const patient = await res.json()
  const orgId = patient.organization_id
  if (!orgId) return []
  const all = await fetchAppointments(orgId)
  return (all || [])
    .filter((a: Record<string, unknown>) => a.patient_id === patientId)
    .slice(0, 20)
}

export async function updateAppointmentStatus(appointmentId: string, status: string, reason?: string) {
  const body: Record<string, string> = { status }
  if (reason) body.cancellation_reason = reason
  const res = await authFetch(`${API_URL}/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Update appointment error: ${res.status}`)
}

export async function createAppointment(orgId: string, data: {
  patient_id: string
  start_time: string
  end_time: string
  service_name: string
  notes?: string
}) {
  const res = await authFetch(`${API_URL}/appointments/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      patient_id: data.patient_id,
      start_time: data.start_time,
      end_time: data.end_time,
      service_name: data.service_name,
      notes: data.notes || '',
    }),
  })
  if (!res.ok) throw new Error(`Create appointment error: ${res.status}`)
  return res.json()
}
