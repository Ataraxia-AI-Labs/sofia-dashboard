import { API_URL, authFetch } from './helpers'

export async function fetchAppointments(orgId: string, opts?: {
  from?: string
  to?: string
  status?: string
  branchId?: string | null
  staffId?: string | null
}) {
  const params = new URLSearchParams()
  if (opts?.from) params.set('from', opts.from)
  if (opts?.to) params.set('to', opts.to)
  if (opts?.status) params.set('status', opts.status)
  if (opts?.branchId) params.set('branch_id', opts.branchId)
  if (opts?.staffId) params.set('staff_id', opts.staffId)

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
  staff_id?: string | null
  notes?: string
}) {
  const res = await authFetch(`${API_URL}/appointments/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      patient_id: data.patient_id,
      start_time: data.start_time,
      end_time: data.end_time,
      service_name: data.service_name,
      staff_id: data.staff_id || undefined,
      notes: data.notes || '',
    }),
  })
  if (!res.ok) throw new Error(`Create appointment error: ${res.status}`)
  return res.json()
}

export async function rescheduleAppointment(appointmentId: string, data: {
  new_start_time: string
  new_end_time?: string
  reason?: string
}) {
  const res = await authFetch(`${API_URL}/appointments/${appointmentId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => `Error ${res.status}`)
    throw new Error(text)
  }
  return res.json()
}

export async function assignStaff(appointmentId: string, staffId: string | null) {
  const res = await authFetch(`${API_URL}/appointments/${appointmentId}/staff`, {
    method: 'PATCH',
    body: JSON.stringify({ staff_id: staffId }),
  })
  if (!res.ok) throw new Error(`Assign staff error: ${res.status}`)
  return res.json()
}

export async function fetchStaffList(orgId: string) {
  const res = await authFetch(`${API_URL}/appointments/${orgId}/staff`)
  if (!res.ok) return []
  return res.json()
}

export async function fetchAppointmentSeries(orgId: string) {
  const res = await authFetch(`${API_URL}/appointments/${orgId}/series`)
  if (!res.ok) return []
  return res.json()
}

export async function createAppointmentSeries(orgId: string, data: {
  patient_id: string
  staff_id?: string | null
  service_name: string
  recurrence_rule: string
  recurrence_interval?: number
  day_of_week?: number | null
  preferred_time: string
  total_occurrences: number
  starts_at: string
  notes?: string
}) {
  const res = await authFetch(`${API_URL}/appointments/${orgId}/series`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Create series error: ${res.status}`)
  return res.json()
}

export async function updateAppointmentSeries(seriesId: string, data: {
  status?: string
  staff_id?: string | null
  preferred_time?: string
  notes?: string
}) {
  const res = await authFetch(`${API_URL}/appointments/series/${seriesId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update series error: ${res.status}`)
  return res.json()
}
