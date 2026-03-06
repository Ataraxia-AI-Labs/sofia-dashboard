import { API_URL, authFetch, withBranch } from './helpers'
import type { Patient } from '@/types'

export async function fetchPatients(orgId: string, opts?: {
  limit?: number
  offset?: number
  search?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
  branchId?: string | null
}) {
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.offset) params.set('offset', String(opts.offset))
  if (opts?.search) params.set('search', opts.search)
  if (opts?.orderBy) params.set('orderBy', opts.orderBy)
  if (opts?.orderDir) params.set('orderDir', opts.orderDir)

  const url = withBranch(`${API_URL}/patients/${orgId}?${params.toString()}`, opts?.branchId)
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`Patients error: ${res.status}`)
  return res.json() as Promise<{ patients: Patient[]; total: number }>
}

export async function fetchPatientDetail(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/detail`)
  if (!res.ok) throw new Error(`Patient detail error: ${res.status}`)
  return res.json()
}

export async function fetchPatientMLFeatures(patientId: string) {
  const res = await authFetch(`${API_URL}/patients/${patientId}/ml-features`)
  if (!res.ok) return null
  return res.json()
}

export async function createPatient(orgId: string, data: {
  full_name: string
  phone: string
  email?: string
  city?: string
  service_interest?: string
  acquisition_channel?: string
}) {
  const res = await authFetch(`${API_URL}/patients/${orgId}`, {
    method: 'POST',
    body: JSON.stringify({
      full_name: data.full_name || 'Por identificar',
      phone: data.phone,
      email: data.email || null,
      city: data.city || 'Por identificar',
      service_interest: data.service_interest || 'Por identificar',
      acquisition_channel: data.acquisition_channel || 'PRESENCIAL',
    }),
  })
  if (!res.ok) throw new Error(`Create patient error: ${res.status}`)
  return res.json()
}

export async function updatePatient(patientId: string, data: Record<string, unknown>) {
  const res = await authFetch(`${API_URL}/patients/${patientId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update patient error: ${res.status}`)
}

export async function exportPatientsCSV(orgId: string) {
  const res = await authFetch(`${API_URL}/patients/${orgId}/export-csv`)
  if (!res.ok) throw new Error(`Export CSV error: ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function sendWhatsAppMessage(orgId: string, phone: string, message: string) {
  const res = await authFetch(`${API_URL}/dashboard/send-message`, {
    method: 'POST',
    body: JSON.stringify({ org_id: orgId, phone, message }),
  })
  if (!res.ok) throw new Error(`Send message error: ${res.status}`)
  return res.json()
}
